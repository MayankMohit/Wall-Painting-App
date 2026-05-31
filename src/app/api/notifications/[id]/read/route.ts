import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound } from '@/lib/api-response';

export async function PUT(
  request: Request,
  context: RouteContext<'/api/notifications/[id]/read'>
) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    return e as Response;
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) return notFound();

  await connectDB();

  const notif = await Notification.findOneAndUpdate(
    { _id: id, userId: payload.userId },
    { readAt: new Date() },
    { new: true }
  ).lean();

  if (!notif) return notFound();
  return ok(notif);
}
