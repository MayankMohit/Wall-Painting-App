import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, unauthorized } from '@/lib/api-response';

export async function GET(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    return e as Response;
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = Math.min(Number(searchParams.get('limit') ?? 20) || 20, 50);

  const userId = payload.userId;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(unreadOnly ? { userId, readAt: null } : { userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId, readAt: null }),
  ]);

  return ok({ notifications, unreadCount });
}
