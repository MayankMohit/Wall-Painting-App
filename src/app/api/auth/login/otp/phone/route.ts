import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { admin } from '@/lib/firebase-admin';
import { signToken } from '@/lib/auth';
import { LoginOtpPhoneSchema } from '@/lib/validators';
import { ok, badRequest, err } from '@/lib/api-response';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LoginOtpPhoneSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { phone, firebaseIdToken } = parsed.data;

  let decoded: { phone_number?: string };
  try {
    decoded = await admin.auth().verifyIdToken(firebaseIdToken);
  } catch {
    return err('Phone verification failed', 401);
  }
  if (decoded.phone_number !== phone) return err('Phone number mismatch', 401);

  await connectDB();
  const user = await User.findOne({ phone });
  if (!user) return err('Invalid credentials', 401);

  // No emailVerified check — user is authenticating by phone, not email
  if (user.status === 'inactive') return err('Account pending approval', 403);
  if (user.status === 'suspended') {
    return err(`Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`, 403);
  }

  const token = signToken({ userId: user._id.toString(), role: user.role });

  return ok({
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
