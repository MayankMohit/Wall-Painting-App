import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { sendOwnerRejectedEmail } from '@/lib/email';
import { notify } from '@/lib/notify/emit';
import { AdminReasonSchema } from '@/lib/validators';
import { HttpError, ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';
import type { z } from 'zod';

type RejectBody = z.infer<typeof AdminReasonSchema>;

const EXCLUDE = '-password -resetPasswordToken -resetPasswordExpires';

export const PATCH = withRole(['admin'], { schema: AdminReasonSchema, audit: 'ADMIN_USER_REJECT' })(
  async (req, ctx) => {
    const { userId } = ctx.params;
    const { reason } = ctx.body as RejectBody;

    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'User not found');

    if (user.role !== 'owner') {
      ctx.fail(400, ErrorCodes.VALIDATION_ERROR, 'Only owner accounts require approval');
    }
    if (user.status !== 'inactive') {
      ctx.fail(409, ErrorCodes.VALIDATION_ERROR, 'User is not pending approval');
    }

    user.status = 'suspended';
    await user.save();

    ctx.setAudit('ADMIN_USER_REJECT', { type: 'User', id: userId }, { reason });

    // Email direct (account.rejected event only covers push + inApp)
    await Promise.allSettled([
      sendOwnerRejectedEmail(
        user.email,
        user.name,
        process.env.ADMIN_CONTACT_EMAIL!,
        reason
      ),
      notify.emit('account.rejected', {
        recipientId: String(user._id),
        actorId: ctx.user!.userId,
        data: { reason: reason ?? 'Your registration was rejected.' },
      }),
    ]);

    const updated = await User.findById(userId).select(EXCLUDE).lean();
    return Response.json({ data: updated });
  }
);
