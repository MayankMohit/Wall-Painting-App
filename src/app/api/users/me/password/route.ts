import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { ChangePasswordSchema } from '@/lib/validators';
import { hashPassword, comparePassword, signToken } from '@/lib/auth';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type ChangePasswordBody = z.infer<typeof ChangePasswordSchema>;

export const PUT = withAuth({ schema: ChangePasswordSchema, audit: 'USER_CHANGE_PASSWORD' })(
  async (req, ctx) => {
    const { currentPassword, newPassword } = ctx.body as ChangePasswordBody;

    await connectDB();
    const user = await User.findById(ctx.user!.userId);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    // Owners must re-authenticate with their current password before changing it
    // (H-2). Other roles keep the existing behaviour.
    if (ctx.user!.role === 'owner') {
      if (!currentPassword) {
        return ctx.fail(400, ErrorCodes.VALIDATION_ERROR, 'Current password is required');
      }
      const matches = user.password
        ? await comparePassword(currentPassword, user.password)
        : false;
      if (!matches) {
        return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect');
      }
    }

    user.password = await hashPassword(newPassword);
    // Bump tokenVersion so every previously-issued token (other devices/sessions) is
    // revoked (M-3), then mint a fresh token for this session so the user who just
    // changed their password stays signed in here.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    const token = signToken({ userId: user._id.toString(), role: user.role, name: user.name, tokenVersion: user.tokenVersion });

    return ok({ message: 'Password updated', token });
  }
);
