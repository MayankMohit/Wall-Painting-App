import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { FCMTokenSchema } from '@/lib/validators';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type FCMTokenBody = z.infer<typeof FCMTokenSchema>;

export const POST = withAuth({ schema: FCMTokenSchema })(
  async (req, ctx) => {
    const { token } = ctx.body as FCMTokenBody;

    await connectDB();
    const user = await User.findByIdAndUpdate(
      ctx.user!.userId,
      { $addToSet: { fcmTokens: token } },
      { returnDocument: 'after' }
    ).select('fcmTokens');
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok({ fcmTokens: user.fcmTokens });
  }
);

export const DELETE = withAuth({ schema: FCMTokenSchema })(
  async (req, ctx) => {
    const { token } = ctx.body as FCMTokenBody;

    await connectDB();
    const user = await User.findByIdAndUpdate(
      ctx.user!.userId,
      { $pull: { fcmTokens: token } },
      { returnDocument: 'after' }
    ).select('fcmTokens');
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok({ fcmTokens: user.fcmTokens });
  }
);
