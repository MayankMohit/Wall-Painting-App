import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';
import { notify } from '@/lib/notify/emit';

export const POST = withRole(['admin'])(
  async (req, ctx) => {
    const body = await req.json().catch(() => ({}));

    const eventId     = typeof body?.eventId     === 'string' ? body.eventId     : 'admin.bg_job_failed';
    const recipientId = typeof body?.recipientId === 'string' ? body.recipientId : ctx.user!.userId;
    const actorId     = typeof body?.actorId     === 'string' ? body.actorId     : undefined;
    const data        = body?.data && typeof body.data === 'object' ? body.data
      : { queue: 'test', jobId: 'test-0', error: 'manual test trigger' };

    await notify.emit(eventId, { recipientId, actorId, data });

    return ok({ message: 'Test notification emitted' });
  }
);
