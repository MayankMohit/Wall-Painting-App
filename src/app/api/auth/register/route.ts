import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { hashPassword, signToken } from '@/lib/auth';
import { RegisterSchema } from '@/lib/validators';
import { created, badRequest, err } from '@/lib/api-response';
import { admin } from '@/lib/firebase-admin';
import { verifyEmailOtp } from '@/lib/otp';
import { sendAdminNewOwnerNotification } from '@/lib/email';
import { notify } from '@/lib/notify/emit';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { name, email, phone, password, role, firebaseIdToken, emailOtp, sessionId } = parsed.data;

  // Verify Firebase phone token
  let decoded: { phone_number?: string };
  try {
    decoded = await admin.auth().verifyIdToken(firebaseIdToken);
  } catch {
    return err('Phone verification failed', 401);
  }
  if (decoded.phone_number !== phone) return err('Phone token mismatch', 401);

  await connectDB();

  // Check for duplicate email or phone
  const emailConflict = await User.findOne({ email: email.toLowerCase() });
  if (emailConflict) return err('Email already registered', 409);

  const phoneConflict = await User.findOne({ phone });
  if (phoneConflict) return err('Phone number already registered', 409);

  let status: 'active' | 'inactive' = 'active';
  let emailVerified = false;

  if (role === 'owner') {
    // emailOtp and sessionId are guaranteed by the RegisterSchema refine
    const otpValid = await verifyEmailOtp(sessionId!, emailOtp!);
    if (!otpValid) return err('Invalid or expired email OTP', 401);
    status = 'inactive';
    emailVerified = true;
  }

  const hashed = await hashPassword(password);
  const user = await User.create({ name, email, phone, password: hashed, role, status, emailVerified });

  if (role === 'owner') {
    const admins = await User.find({ role: 'admin' }, 'email').lean();
    await Promise.allSettled([
      ...admins.map((a) => sendAdminNewOwnerNotification(a.email, { name, email, phone })),
      notify.emit('owner.registered', { data: { name, email } }),
    ]);
  }

  const token = signToken({ userId: user._id.toString(), role: user.role });

  return created({
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      emailVerified: user.emailVerified,
      status: user.status,
    },
  });
}
