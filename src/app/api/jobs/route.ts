import { connectDB } from '@/lib/db';
import { Job, User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { CreateJobSchema } from '@/lib/validators';
import { withAuth, withRole } from '@/lib/middleware';
import type { z } from 'zod';
import { Types } from 'mongoose';

const PAGE_SIZE = 20;

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
    if (q) matchStage.companyName = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    await connectDB();

    const total = await Job.countDocuments(matchStage);

    const jobs = await Job.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },

      {
        $lookup: {
          from       : 'submissions',
          localField : '_id',
          foreignField: 'jobId',
          as         : 'allSubmissions',
        },
      },

      {
        $addFields: {
          relevantSubmissions: {
            $filter: {
              input: '$allSubmissions',
              as   : 'sub',
              cond : ctx.user!.role === 'painter'
                ? { $eq: ['$$sub.painterId', new Types.ObjectId(ctx.user!.userId)] }
                : { $literal: true },
            },
          },
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

      { $project: { allSubmissions: 0, relevantSubmissions: 0 } },
    ]);

    return ok({ jobs, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  }
);

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

    return ok(job, 201);
  }
);
