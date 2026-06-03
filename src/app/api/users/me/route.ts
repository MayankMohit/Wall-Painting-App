import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { UpdateProfileSchema } from '@/lib/validators';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type UpdateProfileBody = z.infer<typeof UpdateProfileSchema>;

const EXCLUDED = '-password -resetPasswordToken -resetPasswordExpires';

export const GET = withAuth()(
  async (req, ctx) => {
    await connectDB();
    const user = await User.findById(ctx.user!.userId).select(EXCLUDED);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');
    return ok(user);
  }
);

export const PUT = withAuth({ schema: UpdateProfileSchema, audit: 'USER_UPDATE_PROFILE' })(
  async (req, ctx) => {
    const { name } = ctx.body as UpdateProfileBody;

    await connectDB();
    const user = await User.findByIdAndUpdate(
      ctx.user!.userId,
      { $set: { name } },
      { returnDocument: 'after' }
    ).select(EXCLUDED);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok(user);
  }
);
