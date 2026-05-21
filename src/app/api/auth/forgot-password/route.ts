import crypto from 'crypto';
import { Resend } from 'resend';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ForgotPasswordSchema } from '@/lib/validators';
import { ok, badRequest } from '@/lib/api-response';

const resend = new Resend(process.env.RESEND_API_KEY);
const NEUTRAL_MSG = 'If that email exists, a reset link has been sent';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const user = await User.findOne({ email: parsed.data.email });

  // Return same message regardless to prevent email enumeration
  if (!user) return ok({ message: NEUTRAL_MSG });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: user.email,
    subject: 'Password Reset Request',
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a> — link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`,
  });

  return ok({ message: NEUTRAL_MSG });
}
