import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ResetPasswordSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';
import { ok, badRequest, err } from '@/lib/api-response';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const { token, newPassword } = parsed.data;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) return err('Invalid or expired reset token', 400);

  user.password = await hashPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return ok({ message: 'Password reset successfully' });
}
