import { connectDB } from '@/lib/db';
import { Job, User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { CreateJobSchema } from '@/lib/validators';
import { withAuth, withRole } from '@/lib/middleware';
import type { z } from 'zod';
import { Types } from 'mongoose';
import { notify } from '@/lib/notify/emit';

const PAGE_SIZE = 20;

// GET — List paginated jobs scoped by role: painters see assigned jobs, owners see their own, admins see all. Supports status filter and full-text company name search.
export const GET = withAuth()(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
    const page    = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
    const status  = searchParams.get('status');
    const q       = searchParams.get('q') ?? '';

    const matchStage: Record<string, unknown> = {};

    if (ctx.user!.role === 'painter') {
      matchStage.painters = new Types.ObjectId(ctx.user!.userId);
    } else if (ctx.user!.role === 'owner') {
      matchStage.ownerId = new Types.ObjectId(ctx.user!.userId);
    }

    if (status && status !== 'all') matchStage.status = status;
    if (q) matchStage.$text = { $search: q };

    await connectDB();

    const isPainter = ctx.user!.role === 'painter';
    const painterId = isPainter ? new Types.ObjectId(ctx.user!.userId) : null;

    const [result] = await Job.aggregate([
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'n' }],
          jobs: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * PAGE_SIZE },
            { $limit: PAGE_SIZE },

            {
              $lookup: {
                from    : 'submissions',
                let     : { jobId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$jobId', '$$jobId'] },
                          ...(isPainter ? [{ $eq: ['$painterId', painterId] }] : []),
                        ],
                      },
                    },
                  },
                  { $project: { status: 1 } },
                ],
                as: 'relevantSubmissions',
              },
            },

            {
              $addFields: {
                'stats.submitted': { $size: '$relevantSubmissions' },
                'stats.approved' : {
                  $size: { $filter: { input: '$relevantSubmissions', as: 'sub', cond: { $eq: ['$$sub.status', 'approved'] } } },
                },
                'stats.pending'  : {
                  $size: { $filter: { input: '$relevantSubmissions', as: 'sub', cond: { $eq: ['$$sub.status', 'pending'] } } },
                },
              },
            },

            { $project: { relevantSubmissions: 0 } },
          ],
        },
      },
    ]);

    const total = result.total[0]?.n ?? 0;
    const jobs  = result.jobs;

    return ok({ jobs, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  }
);

// POST — Create a new job. Validates and resolves optional painter IDs before inserting. Owner-only.
export const POST = withRole(['owner'], { schema: CreateJobSchema, audit: 'JOB_CREATE' })(
  async (req, ctx) => {
    const { painterIds, ...rest } = ctx.body as z.infer<typeof CreateJobSchema>;

    await connectDB();

    const painters = [];
    if (painterIds.length > 0) {
      if (painterIds.some(id => !Types.ObjectId.isValid(id))) {
        ctx.fail(400, 'INVALID_PAINTERS', 'One or more painter IDs are invalid');
      }

      const found = await User.find({ _id: { $in: painterIds }, role: 'painter' })
        .select('_id')
        .lean();

      if (found.length !== painterIds.length) {
        ctx.fail(400, 'INVALID_PAINTERS', 'One or more painter IDs are invalid');
      }
      painters.push(...found.map((u) => u._id));
    }

    const job = await Job.create({
      ...rest,
      ownerId: ctx.user!.userId,
      painters,
      status : 'active',
    });

    if (painters.length > 0) {
      notify.emit('job.created', {
        actorId: ctx.user!.userId,
        data: { jobId: job._id.toString(), company: job.companyName },
      }).catch(() => {});
    }

    return ok(job, 201);
  }
);
