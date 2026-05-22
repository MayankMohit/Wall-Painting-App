import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden } from '@/lib/api-response';

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/jobs/[jobId]/painters/[painterId]'>
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

  const job = await Job.findById(jobId);
  if (!job) return notFound('Job not found');
  if (payload.role === 'owner' && job.ownerId.toString() !== payload.userId) return forbidden();

  await Job.findByIdAndUpdate(jobId, { $pull: { painters: painterId } });

  return ok({ message: 'Painter removed' });
}
