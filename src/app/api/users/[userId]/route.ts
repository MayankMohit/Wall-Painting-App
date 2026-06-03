import { connectDB } from '@/lib/db';
import { User, Job } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { UpdateAdminUserSchema } from '@/lib/validators';
import { withAuth, withRole } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type UpdateAdminUserBody = z.infer<typeof UpdateAdminUserSchema>;

const EXCLUDED = '-password -resetPasswordToken -resetPasswordExpires';

export const GET = withRole(['admin', 'owner'])(
  async (req, ctx) => {
    const { userId: requesterId, role } = ctx.user!;
    const { userId } = ctx.params;

    await connectDB();

    if (role === 'owner') {
      const assigned = await Job.exists({ ownerId: requesterId, painters: userId });
      if (!assigned) return ctx.fail(403, ErrorCodes.NOT_AUTHORIZED, 'This painter is not in any of your jobs');
    }

    const user = await User.findById(userId).select(EXCLUDED);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok(user);
  }
);

export const PUT = withRole(['admin'], { schema: UpdateAdminUserSchema, audit: 'ADMIN_UPDATE_USER' })(
  async (req, ctx) => {
    const { userId } = ctx.params;

    await connectDB();
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: ctx.body as UpdateAdminUserBody },
      { returnDocument: 'after' }
    ).select(EXCLUDED);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok(user);
  }
);

export const DELETE = withRole(['admin'], { audit: 'ADMIN_DEACTIVATE_USER' })(
  async (req, ctx) => {
    const { userId } = ctx.params;

    await connectDB();
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { status: 'inactive' } },
      { returnDocument: 'after' }
    ).select(EXCLUDED);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok({ message: 'User deactivated' });
  }
);
