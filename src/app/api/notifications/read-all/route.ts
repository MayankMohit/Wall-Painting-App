import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok } from '@/lib/api-response';

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    return e as Response;
  }

  await connectDB();

  const result = await Notification.updateMany(
    { userId: payload.userId, readAt: null },
    { readAt: new Date() }
  );

  return ok({ updated: result.modifiedCount });
}
