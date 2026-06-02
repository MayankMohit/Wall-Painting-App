import { connectDB } from '@/lib/db';
import { Job, User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, badRequest, forbidden, err } from '@/lib/api-response';
import { CreateJobSchema } from '@/lib/validators';
import { Types } from 'mongoose';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const payload = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const status = searchParams.get('status');
    const q = searchParams.get('q') ?? '';

    const matchStage: Record<string, any> = {};

    if (payload.role === 'painter') {
      matchStage.painters = new Types.ObjectId(payload.userId); 
    } else if (payload.role === 'owner') {
      matchStage.ownerId = new Types.ObjectId(payload.userId);
    }

    if (status && status !== 'all') matchStage.status = status;
    if (q) matchStage.companyName = { $regex: q, $options: 'i' };

    await connectDB();

    const total = await Job.countDocuments(matchStage);

    const jobs = await Job.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
      
      {
        $lookup: {
          from: 'submissions', 
          localField: '_id',
          foreignField: 'jobId',
          as: 'allSubmissions'
        }
      },
      
      // 🚀 NEW: Filter submissions based on who is asking!
      {
        $addFields: {
          relevantSubmissions: {
            $filter: {
              input: '$allSubmissions',
              as: 'sub',
              // If painter, only keep their submissions. If owner, keep all of them.
              cond: payload.role === 'painter' 
                ? { $eq: ['$$sub.painterId', new Types.ObjectId(payload.userId)] }
                : { $literal: true } 
            }
          }
        }
      },
      
      // Calculate stats based ONLY on the relevant submissions
      {
        $addFields: {
          'stats.submitted': { $size: '$relevantSubmissions' },
          'stats.approved': {
            $size: { $filter: { input: '$relevantSubmissions', as: 'sub', cond: { $eq: ['$$sub.status', 'approved'] } } }
          },
          'stats.pending': {
            $size: { $filter: { input: '$relevantSubmissions', as: 'sub', cond: { $eq: ['$$sub.status', 'pending'] } } }
          }
        }
      },
      
      // Clean up the heavy arrays to save bandwidth
      { $project: { allSubmissions: 0, relevantSubmissions: 0 } }
    ]);

    return ok({ jobs, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[GET /api/jobs]', e);
    return err('Failed to fetch jobs', 500);
  }
}

export async function POST(request: Request) {
  try {
    // 1. FAIL FAST & THE BOUNCER
    const payload = await requireAuth(request);
    if (payload.role !== 'owner') return forbidden();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON body'); }

    const parsed = CreateJobSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { painterIds, ...rest } = parsed.data;

    await connectDB();

    const painters = [];
    if (painterIds.length > 0) {
      const found = await User.find({ _id: { $in: painterIds }, role: 'painter' })
        .select('_id') 
        .lean();
        
      if (found.length !== painterIds.length) return badRequest('One or more painter IDs are invalid');
      painters.push(...found.map((u) => u._id));
    }

    const job = await Job.create({
      ...rest,
      ownerId: payload.userId,
      painters,
      status: 'active',
    });

    return ok(job, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[POST /api/jobs]', e);
    return err('Failed to create job', 500);
  }
}