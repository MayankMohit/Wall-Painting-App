import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { verifyLoginOtp } from '@/lib/otp';
import { signToken } from '@/lib/auth';
import { LoginOtpVerifySchema } from '@/lib/validators';
import { ok, badRequest, err } from '@/lib/api-response';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LoginOtpVerifySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { sessionId, otp } = parsed.data;

  const result = await verifyLoginOtp(sessionId, otp);
  if (!result) return err('Invalid or expired OTP', 401);

  await connectDB();
  const user = await User.findOne({ email: result.email });
  if (!user) return err('Invalid or expired OTP', 401);

  // Re-run status guard — admin may have changed status between send and verify
  if (user.status === 'inactive') return err('Account pending approval', 403);
  if (user.status === 'suspended') {
    return err(`Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`, 403);
  }

  if (!user.emailVerified) {
    await User.updateOne({ _id: user._id }, { emailVerified: true });
    user.emailVerified = true;
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
