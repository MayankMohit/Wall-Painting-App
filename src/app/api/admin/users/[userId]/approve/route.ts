import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { sendOwnerApprovedEmail } from '@/lib/email';
import { notify } from '@/lib/notify/emit';
import { ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';

const EXCLUDE = '-password -resetPasswordToken -resetPasswordExpires';

export const PATCH = withRole(['admin'], { audit: 'ADMIN_USER_APPROVE' })(
  async (req, ctx) => {
    const { userId } = ctx.params;

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    if (user.role !== 'owner') {
      return ctx.fail(400, ErrorCodes.VALIDATION_ERROR, 'Only owner accounts require approval');
    }
    if (user.status !== 'inactive') {
      return ctx.fail(409, ErrorCodes.VALIDATION_ERROR, 'User is not pending approval');
    }

    user.status = 'active';
    await user.save();

    ctx.setAudit('ADMIN_USER_APPROVE', { type: 'User', id: userId });

    await Promise.allSettled([
      sendOwnerApprovedEmail(user.email, user.name),
      notify.emit('account.approved', {
        recipientId: String(user._id),
        actorId: ctx.user!.userId,
        data: { name: user.name },
      }),
    ]);

    const updated = await User.findById(userId).select(EXCLUDE).lean();
    return ok(updated);
  }
);
