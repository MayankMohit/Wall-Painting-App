import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { notify } from '@/lib/notify/emit';
import { ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';

const EXCLUDE = '-password -resetPasswordToken -resetPasswordExpires';

export const PATCH = withRole(['admin'], { audit: 'ADMIN_USER_ACTIVATE' })(
  async (req, ctx) => {
    const { userId } = ctx.params;
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');
    if (user.status === 'active') return ctx.fail(409, ErrorCodes.VALIDATION_ERROR, 'Account is already active');

    user.status = 'active';
    await user.save();

    ctx.setAudit('ADMIN_USER_ACTIVATE', { type: 'User', id: userId });

    await notify.emit('account.approved', {
      recipientId: String(user._id),
      actorId: ctx.user!.userId,
      data: { name: user.name },
    }).catch(() => {});

    const updated = await User.findById(userId).select(EXCLUDE).lean();
    return ok(updated);
  }
);
