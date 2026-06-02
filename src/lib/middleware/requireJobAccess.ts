import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

// Grants access if: admin, OR owner of the job, OR painter assigned to the job.
// Populates ctx.job.
export const requireJobAccess: AccessCheck = async (req, ctx) => {
  const { jobId }       = ctx.params;
  const { userId, role } = ctx.user!;

  await connectDB();
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'Job not found');

  const hasAccess =
    role === 'admin' ||
    (role === 'owner'   && job.ownerId.toString() === userId) ||
    (role === 'painter' && job.painters.some((p) => p.toString() === userId));

  if (!hasAccess) {
    throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'You do not have access to this job');
  }

  ctx.job = job;
};
