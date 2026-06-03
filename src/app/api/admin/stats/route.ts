import { connectDB } from '@/lib/db';
import { User, Job, Submission, GeneratedFile } from '@/lib/models';
import { fileGenQueue, notifyQueue, assetCleanupQueue } from '@/lib/queues';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

export const GET = withRole(['admin'], { audit: 'ADMIN_STATS_VIEW' })(
  async (req, ctx) => {
    await connectDB();

    const [userAgg, jobAgg, submissionAgg, fileAgg, queueCounts] = await Promise.all([
      User.aggregate([{ $group: { _id: { role: '$role', status: '$status' }, n: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Submission.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      GeneratedFile.aggregate([{ $group: { _id: null, total: { $sum: '$fileSize' } } }]),
      Promise.all([
        fileGenQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
        notifyQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
        assetCleanupQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      ]),
    ]);

    const users: Record<string, Record<string, number>> = {};
    for (const entry of userAgg) {
      const { role, status } = entry._id as { role: string; status: string };
      if (!users[role]) users[role] = {};
      users[role][status] = entry.n as number;
    }

    const jobs: Record<string, number> = {};
    for (const entry of jobAgg) jobs[entry._id as string] = entry.n as number;

    const submissions: Record<string, number> = {};
    for (const entry of submissionAgg) submissions[entry._id as string] = entry.n as number;

    return ok({
      users,
      jobs,
      submissions,
      storage: { totalBytes: (fileAgg[0]?.total as number) ?? 0 },
      queues: {
        fileGen:      queueCounts[0],
        notify:       queueCounts[1],
        assetCleanup: queueCounts[2],
      },
    });
  }
);
