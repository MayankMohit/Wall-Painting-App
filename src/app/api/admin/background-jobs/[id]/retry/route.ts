import { fileGenQueue, notifyQueue, assetCleanupQueue } from '@/lib/queues';
import { ok } from '@/lib/api-response';
import { ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';
import type { Queue } from 'bullmq';

const QUEUES: Record<string, Queue> = {
  fileGen:      fileGenQueue,
  notify:       notifyQueue,
  assetCleanup: assetCleanupQueue,
};

export const POST = withRole(['admin'], { audit: 'ADMIN_JOB_RETRY' })(
  async (req, ctx) => {
    const { id } = ctx.params;
    const { searchParams } = new URL(req.url);
    const queueName = searchParams.get('queue') ?? 'notify';

    if (!QUEUES[queueName]) return ctx.fail(400, ErrorCodes.VALIDATION_ERROR, `Unknown queue: ${queueName}`);

    const job = await QUEUES[queueName].getJob(id);
    if (!job) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'Job not found');

    await job.retry();
    ctx.setAudit('ADMIN_JOB_RETRY', { type: 'Job', id }, { queue: queueName });
    return ok({ id, retried: true });
  }
);
