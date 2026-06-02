import { connectDB } from '@/lib/db';
import { Job, Submission } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

// Grants access if: admin, OR the painter who owns the submission,
// OR the owner of the job the submission belongs to.
// Populates ctx.submission (and ctx.job if not already set).
export const requireSubmissionAccess: AccessCheck = async (req, ctx) => {
  const { submissionId, jobId } = ctx.params;
  const { userId, role }        = ctx.user!;

  await connectDB();

  const submission = await Submission.findOne({ _id: submissionId, jobId });
  if (!submission) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'Submission not found');

  if (role === 'admin') {
    ctx.submission = submission;
    return;
  }

  if (role === 'painter' && submission.painterId.toString() === userId) {
    ctx.submission = submission;
    return;
  }

  if (role === 'owner') {
    // Reuse ctx.job if requireJobAccess / requireJobOwner already ran
    const job = ctx.job ?? await Job.findById(jobId);
    if (!job) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'Job not found');
    if (job.ownerId.toString() === userId) {
      if (!ctx.job) ctx.job = job;
      ctx.submission = submission;
      return;
    }
  }

  throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'You do not have access to this submission');
};
