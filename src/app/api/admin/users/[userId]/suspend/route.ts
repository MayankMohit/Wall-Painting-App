import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { notify } from '@/lib/notify/emit';
import { AdminReasonSchema } from '@/lib/validators';
import { HttpError, ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';
import type { z } from 'zod';

type SuspendBody = z.infer<typeof AdminReasonSchema>;

const EXCLUDE = '-password -resetPasswordToken -resetPasswordExpires';

export const POST = withRole(['admin'], { schema: AdminReasonSchema, audit: 'ADMIN_USER_SUSPEND' })(
  async (req, ctx) => {
    const { userId } = ctx.params;
    const { reason } = ctx.body as SuspendBody;

    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'User not found');

    if (user.role === 'admin') {
      ctx.fail(403, ErrorCodes.NOT_AUTHORIZED, 'Cannot suspend an admin account');
    }
    if (user.status === 'suspended') {
      ctx.fail(409, ErrorCodes.VALIDATION_ERROR, 'Account is already suspended');
    }

    user.status = 'suspended';
    await user.save();

    ctx.setAudit('ADMIN_USER_SUSPEND', { type: 'User', id: userId }, { reason });

    // user.suspended is mandatory: true — emit handles email + inApp via queue
    await notify.emit('user.suspended', {
      recipientId: String(user._id),
      actorId: ctx.user!.userId,
      data: { reason: reason ?? 'Your account has been suspended. Contact support to appeal.' },
    });

    const updated = await User.findById(userId).select(EXCLUDE).lean();
    return Response.json({ data: updated });
  }
);
