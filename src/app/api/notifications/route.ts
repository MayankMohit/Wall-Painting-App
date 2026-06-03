import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withAuth } from '@/lib/middleware';

export const GET = withAuth()(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit      = Math.min(Number(searchParams.get('limit') ?? 20) || 20, 50);
    const userId     = ctx.user!.userId;

    await connectDB();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(unreadOnly ? { userId, readAt: null } : { userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId, readAt: null }),
    ]);

    return ok({ notifications, unreadCount });
  }
);
