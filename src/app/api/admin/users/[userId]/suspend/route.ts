import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { notify } from '@/lib/notify/emit';
import { AdminReasonSchema } from '@/lib/validators';
import { ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';
import type { z } from 'zod';

type SuspendBody = z.infer<typeof AdminReasonSchema>;

const EXCLUDE = '-password -resetPasswordToken -resetPasswordExpires';

export const PATCH = withRole(['admin'], { schema: AdminReasonSchema, audit: 'ADMIN_USER_SUSPEND' })(
  async (req, ctx) => {
    const { userId } = ctx.params;
    const { reason } = ctx.body as SuspendBody;

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    if (user.role === 'admin') {
      return ctx.fail(403, ErrorCodes.NOT_AUTHORIZED, 'Cannot suspend an admin account');
    }
    if (user.status === 'suspended') {
      return ctx.fail(409, ErrorCodes.VALIDATION_ERROR, 'Account is already suspended');
    }

    user.status = 'suspended';
    // Revoke all of the user's existing tokens immediately (M-3), so a suspended user
    // is locked out everywhere rather than lingering until their JWT expires.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    ctx.setAudit('ADMIN_USER_SUSPEND', { type: 'User', id: userId }, { reason });

    await notify.emit('user.suspended', {
      recipientId: String(user._id),
      actorId: ctx.user!.userId,
      data: {
        name:         user.name,
        reason:       reason ?? 'Your account has been suspended. Contact support to appeal.',
        adminContact: process.env.ADMIN_CONTACT_EMAIL,
      },
    });

    const updated = await User.findById(userId).select(EXCLUDE).lean();
    return ok(updated);
  }
);
