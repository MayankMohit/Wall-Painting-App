import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ResetPasswordSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';
import { ErrorCodes } from '@/lib/errors';
import { withMiddleware } from '@/lib/middleware';
import type { z } from 'zod';

type ResetPasswordBody = z.infer<typeof ResetPasswordSchema>;

export const POST = withMiddleware({ rateLimit: 'strict', schema: ResetPasswordSchema, audit: 'AUTH_RESET_PASSWORD' })(
  async (req, ctx) => {
    const { token, newPassword } = ctx.body as ResetPasswordBody;

    await connectDB();
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) return ctx.fail(400, ErrorCodes.NOT_FOUND, 'Invalid or expired reset token');

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    ctx.setAudit('AUTH_RESET_PASSWORD', undefined, { userId: user._id.toString(), role: user.role });
    return Response.json({ data: { message: 'Password reset successfully' } });
  }
);
