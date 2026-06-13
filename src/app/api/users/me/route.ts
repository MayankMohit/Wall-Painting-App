import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { User, Submission } from '@/lib/models';
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
    const userId = ctx.user!.userId;

    const [user, submissionStats] = await Promise.all([
      // Keep password in the projection only to derive `hasPassword`, then strip it below.
      User.findById(userId).select('-resetPasswordToken -resetPasswordExpires').lean(),
      Submission.aggregate([
        { $match: { painterId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    const statsMap = Object.fromEntries(
      submissionStats.map((s: { _id: string; count: number }) => [s._id, s.count])
    );

    const { password, ...safe } = user;

    return ok({
      ...safe,
      hasPassword: !!password,
      stats: {
        completedJobs:   statsMap['approved'] ?? 0,
        pendingApprovals: statsMap['pending']  ?? 0,
      },
    });
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
