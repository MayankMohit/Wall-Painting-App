import { connectDB } from '@/lib/db';
import { Job, User } from '@/lib/models';
import type { Role, ResolverName } from '@/lib/notify/events';

export const RESOLVERS: Record<ResolverName, (data: Record<string, unknown>) => Promise<string[]>> = {
  paintersOnJob: async (data) => {
    await connectDB();
    const job = await Job.findById(data.jobId as string, 'painters').lean();
    if (!job) return [];
    return job.painters.map(String);
  },
  jobOwner: async (data) => {
    await connectDB();
    const job = await Job.findById(data.jobId as string, 'ownerId').lean();
    if (!job) return [];
    return [String(job.ownerId)];
  },
};

export async function usersByRole(role: Role): Promise<string[]> {
  await connectDB();
  const users = await User.find({ role, status: 'active' }, '_id').lean();
  return users.map((u) => String(u._id));
}

export async function eachUserBatch(
  fn: (users: { _id: unknown }[]) => Promise<void>,
  size = 500
): Promise<void> {
  await connectDB();
  let skip = 0;
  while (true) {
    const batch = await User.find({ status: 'active' }, '_id').skip(skip).limit(size).lean();
    if (batch.length === 0) break;
    await fn(batch);
    if (batch.length < size) break;
    skip += size;
  }
}
