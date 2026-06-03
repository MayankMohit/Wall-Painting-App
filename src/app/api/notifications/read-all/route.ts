import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withAuth } from '@/lib/middleware';

export const POST = withAuth({ audit: 'NOTIFICATION_READ_ALL' })(
  async (req, ctx) => {
    await connectDB();

    const result = await Notification.updateMany(
      { userId: ctx.user!.userId, readAt: null },
      { readAt: new Date() }
    );

    return ok({ updated: result.modifiedCount });
  }
);
