import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { sendOwnerApprovedEmail } from '@/lib/email';
import { notify } from '@/lib/notify/emit';
import { HttpError, ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';

const EXCLUDE = '-password -resetPasswordToken -resetPasswordExpires';

export const PATCH = withRole(['admin'], { audit: 'ADMIN_USER_APPROVE' })(
  async (req, ctx) => {
    const { userId } = ctx.params;

    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'User not found');

    if (user.role !== 'owner') {
      ctx.fail(400, ErrorCodes.VALIDATION_ERROR, 'Only owner accounts require approval');
    }
    if (user.status !== 'inactive') {
      ctx.fail(409, ErrorCodes.VALIDATION_ERROR, 'User is not pending approval');
    }

    user.status = 'active';
    await user.save();

    ctx.setAudit('ADMIN_USER_APPROVE', { type: 'User', id: userId });

    // Email direct (account.approved event only covers push + inApp)
    await Promise.allSettled([
      sendOwnerApprovedEmail(user.email, user.name),
      notify.emit('account.approved', {
        recipientId: String(user._id),
        actorId: ctx.user!.userId,
        data: { name: user.name },
      }),
    ]);

    const updated = await User.findById(userId).select(EXCLUDE).lean();
    return Response.json({ data: updated });
  }
);
