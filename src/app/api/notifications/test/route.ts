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

  await notify.emit('admin.bg_job_failed', {
    recipientId: payload.userId,
    data: { queue: 'test', jobId: 'test-0', error: 'manual test trigger' },
  });

  return ok({ message: 'Test notification emitted' });
}
