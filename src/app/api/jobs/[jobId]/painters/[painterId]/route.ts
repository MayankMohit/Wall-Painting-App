import { connectDB } from '@/lib/db';
import { Job, User, Submission } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden, err } from '@/lib/api-response';

// ── GET: Fetch Data for the Painter's Command Center ────────────────────────
export async function GET(
  request: Request,
  context: RouteContext<'/api/jobs/[jobId]/painters/[painterId]'>
) {
  try {
    const payload = await requireAuth(request);
    if (payload.role !== 'owner') return forbidden();

    const { jobId, painterId } = await context.params;

    await connectDB();

    const job = await Job.findById(jobId).select('ownerId companyName').lean();
    if (!job) return notFound('Job not found');
    if (job.ownerId.toString() !== payload.userId) return forbidden();

    const painter = await User.findById(painterId).select('name').lean();
    if (!painter) return notFound('Painter not found');

    const submissions = await Submission.find({ jobId, painterId })
      .select('_id location photoNo sizes status submittedAt')
      .sort({ submittedAt: -1 })
      .lean();

    const stats = { pending: 0, approved: 0, rejected: 0 };
    submissions.forEach(sub => {
      if (sub.status === 'pending') stats.pending++;
      if (sub.status === 'approved') stats.approved++;
      if (sub.status === 'rejected') stats.rejected++;
    });

    return ok({
      job: { companyName: job.companyName },
      painter: { name: painter.name },
      stats,
      submissions
    });

  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[GET /api/jobs/[jobId]/painters/[painterId]]', e);
    return err('Failed to fetch painter submissions', 500);
  }
}

// ── DELETE: Remove a painter from a job ─────────────────────────────────────
export async function DELETE(
  request: Request,
  context: RouteContext<'/api/jobs/[jobId]/painters/[painterId]'>
) {
  try {
    const payload = await requireAuth(request);
    if (payload.role !== 'owner' && payload.role !== 'admin') return forbidden();

    const { jobId, painterId } = await context.params;

    await connectDB();

    const job = await Job.findById(jobId).select('ownerId').lean();
    if (!job) return notFound('Job not found');
    if (payload.role === 'owner' && job.ownerId.toString() !== payload.userId) return forbidden();

    await Job.findByIdAndUpdate(jobId, { $pull: { painters: painterId } });

    return ok({ message: 'Painter removed' });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[DELETE /api/jobs/[jobId]/painters/[painterId]]', e);
    return err('Failed to remove painter', 500);
  }
}