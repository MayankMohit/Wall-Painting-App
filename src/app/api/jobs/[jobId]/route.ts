import { connectDB } from '@/lib/db';
import { Job, Submission, Photo, GeneratedFile } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden, badRequest, err } from '@/lib/api-response';
import { UpdateJobSchema } from '@/lib/validators';
import { Types } from 'mongoose';

async function resolveJob(jobId: string, userId: string, role: string) {
  const job = await Job.findById(jobId).lean();
  if (!job) return null;
  if (role === 'owner' && job.ownerId.toString() !== userId) return null;
  if (role === 'painter' && !job.painters.some((p) => p.toString() === userId)) return null;
  return job;
}

export async function GET(request: Request, context: RouteContext<'/api/jobs/[jobId]'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { jobId } = await context.params;
  await connectDB();

  const job = await resolveJob(jobId, payload.userId, payload.role);
  if (!job) return notFound('Job not found');

  return ok(job);
}

export async function PUT(request: Request, context: RouteContext<'/api/jobs/[jobId]'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'owner') return forbidden();

  const { jobId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parsed = UpdateJobSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  try {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job not found');
    if (job.ownerId.toString() !== payload.userId) return forbidden();

    const { painterIds, ...rest } = parsed.data;

    const update: Record<string, unknown> = { ...rest };
    if (painterIds !== undefined) update.painters = painterIds.map((id) => new Types.ObjectId(id));
    if (rest.status === 'invoiced' && !job.endDate) update.endDate = new Date();

    const updated = await Job.findByIdAndUpdate(jobId, { $set: update }, { new: true }).lean();
    return ok(updated);
  } catch (e) {
    console.error('[PUT /api/jobs/:jobId]', e);
    return err('Failed to update job', 500);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/jobs/[jobId]'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'owner') return forbidden();

  const { jobId } = await context.params;

  try {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job not found');
    if (job.ownerId.toString() !== payload.userId) return forbidden();

    const submissions = await Submission.find({ jobId: job._id }).select('_id images').lean();
    const photoIds = submissions.flatMap((s) => s.images);
    await Promise.all([
      Photo.deleteMany({ _id: { $in: photoIds } }),
      Submission.deleteMany({ jobId: job._id }),
      GeneratedFile.deleteMany({
        _id: { $in: [job.generatedExcel, job.generatedPDFFile, job.generatedPDFPhotos].filter(Boolean) },
      }),
      Job.findByIdAndDelete(jobId),
    ]);

    return ok({ message: 'Job deleted' });
  } catch (e) {
    console.error('[DELETE /api/jobs/:jobId]', e);
    return err('Failed to delete job', 500);
  }
}
