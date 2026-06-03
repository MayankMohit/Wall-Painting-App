import { fileGenQueue, notifyQueue, assetCleanupQueue } from '@/lib/queues';
import { ok } from '@/lib/api-response';
import { QueueActionSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import type { z } from 'zod';
import type { Queue } from 'bullmq';

type QueueActionBody = z.infer<typeof QueueActionSchema>;

const QUEUES: Record<string, Queue> = {
  fileGen:      fileGenQueue,
  notify:       notifyQueue,
  assetCleanup: assetCleanupQueue,
};

export const GET = withRole(['admin'], { audit: 'ADMIN_QUEUE_STATS_VIEW' })(
  async (req, ctx) => {
    const [fileGen, notify, assetCleanup] = await Promise.all([
      fileGenQueue.getJobCounts('waiting', 'paused', 'active', 'completed', 'failed', 'delayed'),
      notifyQueue.getJobCounts('waiting', 'paused', 'active', 'completed', 'failed', 'delayed'),
      assetCleanupQueue.getJobCounts('waiting', 'paused', 'active', 'completed', 'failed', 'delayed'),
    ]);
    return ok({ fileGen, notify, assetCleanup });
  }
);

export const POST = withRole(['admin'], { schema: QueueActionSchema, audit: 'ADMIN_QUEUE_ACTION' })(
  async (req, ctx) => {
    const { action, queue: queueName } = ctx.body as QueueActionBody;
    const queue = QUEUES[queueName];

    if (action === 'pause')  { await queue.pause();  return ok({ queue: queueName, paused: true }); }
    if (action === 'resume') { await queue.resume(); return ok({ queue: queueName, paused: false }); }
    return ok({ queue: queueName, paused: await queue.isPaused() });
  }
);
