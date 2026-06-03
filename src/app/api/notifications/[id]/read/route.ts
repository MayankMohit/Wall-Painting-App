import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';

export const PUT = withAuth()(
  async (req, ctx) => {
    const { id } = ctx.params;
    if (!Types.ObjectId.isValid(id)) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'Notification not found');

    await connectDB();

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: ctx.user!.userId },
      { readAt: new Date() },
      { returnDocument: 'after' }
    ).lean();

    if (!notif) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'Notification not found');
    return ok(notif);
  }
);
