import { requireRole } from '@/lib/rbac';
import { ok } from '@/lib/api-response';
import { notify } from '@/lib/notify/emit';

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireRole(request, 'admin');
  } catch (e) {
    return e as Response;
  }

  const body = await request.json().catch(() => ({}));
  const eventId     = typeof body?.eventId     === 'string' ? body.eventId     : 'admin.bg_job_failed';
  const recipientId = typeof body?.recipientId === 'string' ? body.recipientId : payload.userId;
  const actorId     = typeof body?.actorId     === 'string' ? body.actorId     : undefined;
  const data        = body?.data && typeof body.data === 'object' ? body.data
    : { queue: 'test', jobId: 'test-0', error: 'manual test trigger' };

  await notify.emit(eventId, { recipientId, actorId, data });

  return ok({
    message: 'Test notification emitted' });
}
