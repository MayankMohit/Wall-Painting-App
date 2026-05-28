import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ForgotPasswordSchema } from '@/lib/validators';
import { ok, badRequest } from '@/lib/api-response';
import { sendPasswordResetEmail } from '@/lib/email';

const NEUTRAL_MSG = 'If that account exists, a reset link has been sent';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });

  // Neutral response on missing account — prevent email enumeration
  if (!user) return ok({ message: NEUTRAL_MSG });

  // Email not verified — can't trust ownership; direct them to OTP login instead
  if (!user.emailVerified) {
    return ok({ message: 'Use "Login with OTP" to access your account, then change your password from your profile.' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return ok({ message: NEUTRAL_MSG });
}
