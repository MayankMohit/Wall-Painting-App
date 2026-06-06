import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { ChangePasswordSchema } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type ChangePasswordBody = z.infer<typeof ChangePasswordSchema>;

export const PUT = withAuth({ schema: ChangePasswordSchema, audit: 'USER_CHANGE_PASSWORD' })(
  async (req, ctx) => {
    const { newPassword } = ctx.body as ChangePasswordBody;

    await connectDB();
    const user = await User.findById(ctx.user!.userId);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    user.password = await hashPassword(newPassword);
    await user.save();

    return ok({ message: 'Password updated' });
  }
);
