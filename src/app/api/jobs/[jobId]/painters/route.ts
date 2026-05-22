import { connectDB } from '@/lib/db';
import { Job, User, Submission } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden, badRequest } from '@/lib/api-response';
import { AddPainterSchema } from '@/lib/validators';
import { Types } from 'mongoose';

export async function GET(request: Request, context: RouteContext<'/api/jobs/[jobId]/painters'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'owner' && payload.role !== 'admin') return forbidden();

  const { jobId } = await context.params;
  await connectDB();

  const job = await Job.findById(jobId).select('ownerId painters').lean();
  if (!job) return notFound('Job not found');
  if (payload.role === 'owner' && job.ownerId.toString() !== payload.userId) return forbidden();

  const [painters, submissionCounts] = await Promise.all([
    User.find({ _id: { $in: job.painters } })
      .select('-password -resetPasswordToken -resetPasswordExpires -letterhead -createdAt -updatedAt -role -fcmTokens')
      .lean(),
    Submission.aggregate([
      { $match: { jobId: new Types.ObjectId(jobId), painterId: { $in: job.painters } } },
      { $group: { _id: '$painterId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = Object.fromEntries(submissionCounts.map((r) => [r._id.toString(), r.count]));
  const result = painters.map((p) => ({ ...p, submissionCount: countMap[p._id.toString()] ?? 0 }));

  return ok(result);
}

export async function POST(request: Request, context: RouteContext<'/api/jobs/[jobId]/painters'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'owner' && payload.role !== 'admin') return forbidden();

  const { jobId } = await context.params;
  const body = await request.json();
  const parsed = AddPainterSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();

  const job = await Job.findById(jobId);
  if (!job) return notFound('Job not found');
  if (payload.role === 'owner' && job.ownerId.toString() !== payload.userId) return forbidden();

  const painter = await User.findOne({ _id: parsed.data.painterId, role: 'painter' }).select('_id').lean();
  if (!painter) return badRequest('Painter not found');

  await Job.findByIdAndUpdate(jobId, { $addToSet: { painters: painter._id } });

  return ok({ message: 'Painter added' });
}
