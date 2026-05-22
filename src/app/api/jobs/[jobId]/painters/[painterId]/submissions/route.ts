import { connectDB } from '@/lib/db';
import { Job, Submission } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden } from '@/lib/api-response';
import { Types } from 'mongoose';

export async function GET(
  request: Request,
  context: RouteContext<'/api/jobs/[jobId]/painters/[painterId]/submissions'>
) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'owner' && payload.role !== 'admin') return forbidden();

  const { jobId, painterId } = await context.params;
  await connectDB();

  const job = await Job.findById(jobId).select('ownerId').lean();
  if (!job) return notFound('Job not found');
  if (payload.role === 'owner' && job.ownerId.toString() !== payload.userId) return forbidden();

  const submissions = await Submission.find({
    jobId: new Types.ObjectId(jobId),
    painterId: new Types.ObjectId(painterId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return ok(submissions);
}
