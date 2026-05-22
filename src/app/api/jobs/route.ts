import { connectDB } from '@/lib/db';
import { Job, User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, badRequest, forbidden, err } from '@/lib/api-response';
import { CreateJobSchema } from '@/lib/validators';
import { Types } from 'mongoose';

const PAGE_SIZE = 20;
 
export async function GET(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const status = searchParams.get('status');
  const q = searchParams.get('q') ?? '';

  const filter: Record<string, unknown> = {};

  if (payload.role === 'painter') {
    filter.painters = new Types.ObjectId(payload.userId);
  } else if (payload.role === 'owner') {
    filter.ownerId = new Types.ObjectId(payload.userId);
  }

  if (status) filter.status = status;
  if (q) filter.companyName = { $regex: q, $options: 'i' };

  await connectDB();
  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Job.countDocuments(filter),
  ]);

  return ok({ jobs, total, page, pages: Math.ceil(total / PAGE_SIZE) });
}

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'owner') return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { painterIds, ...rest } = parsed.data;

  try {
    await connectDB();

    const painters: Types.ObjectId[] = [];
    if (painterIds.length > 0) {
      const found = await User.find({ _id: { $in: painterIds }, role: 'painter' }).select('_id').lean();
      if (found.length !== painterIds.length) return badRequest('One or more painter IDs are invalid');
      painters.push(...(found.map((u) => u._id) as Types.ObjectId[]));
    }

    const job = await Job.create({
      ...rest,
      ownerId: new Types.ObjectId(payload.userId),
      painters,
      status: 'active',
    });

    return ok(job, 201);
  } catch (e) {
    console.error('[POST /api/jobs]', e);
    return err('Failed to create job', 500);
  }
}
