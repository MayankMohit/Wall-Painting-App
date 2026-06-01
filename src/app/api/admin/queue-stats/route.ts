import { requireRole } from '@/lib/rbac';
import { ok } from '@/lib/api-response';
import { notifyQueue } from '@/lib/queues';

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');
  } catch (e) {
    return e as Response;
  }

  const counts = await notifyQueue.getJobCounts('waiting', 'paused', 'active', 'completed', 'failed', 'delayed');
  return ok(counts);
}

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin');
  } catch (e) {
    return e as Response;
  }

  const body = await request.json().catch(() => ({}));
  if (body.action === 'pause') {
    await notifyQueue.pause();
    return ok({ paused: true });
  }
  if (body.action === 'resume') {
    await notifyQueue.resume();
    return ok({ paused: false });
  }
  return ok({ paused: await notifyQueue.isPaused() });
}
