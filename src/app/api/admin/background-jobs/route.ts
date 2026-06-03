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

const VALID_STATES = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] as const;
type JobState = typeof VALID_STATES[number];

export const GET = withRole(['admin'], { audit: 'ADMIN_JOBS_VIEW' })(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const queueName = searchParams.get('queue') ?? 'fileGen';
    const state     = (searchParams.get('state') ?? 'failed') as JobState;
    const start     = Math.max(0, Number(searchParams.get('start') ?? 0));
    const end       = Math.min(999, Number(searchParams.get('end') ?? start + 99));

    if (!QUEUES[queueName]) return ctx.fail(400, ErrorCodes.VALIDATION_ERROR, `Unknown queue: ${queueName}`);
    if (!VALID_STATES.includes(state)) return ctx.fail(400, ErrorCodes.VALIDATION_ERROR, `Unknown state: ${state}`);

    const jobs = await QUEUES[queueName].getJobs([state], start, end);

    return ok(jobs.map(j => ({
      id:           j.id,
      name:         j.name,
      data:         j.data,
      state,
      progress:     j.progress,
      attempts:     j.attemptsMade,
      failedReason: j.failedReason,
      processedOn:  j.processedOn,
      finishedOn:   j.finishedOn,
      timestamp:    j.timestamp,
    })));
  }
);
