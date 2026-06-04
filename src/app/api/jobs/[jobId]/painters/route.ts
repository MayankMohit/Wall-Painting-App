import { connectDB } from '@/lib/db';
import { Job, User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { AddPainterSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';
import { Types } from 'mongoose';
import type { z } from 'zod';
import { notify } from '@/lib/notify/emit';

// GET — List painters assigned to a job, each with their total submission count for that job. Owner/admin only.
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (req, ctx) => {
    await connectDB();

    const job = ctx.job!;

    const painters = await User.aggregate([
      { $match: { _id: { $in: job.painters } } },
      { $project: { name: 1, email: 1, phone: 1, status: 1 } },
      {
        $lookup: {
          from    : 'submissions',
          let     : { painterId: '$_id' },
          pipeline: [
            {
              $match: {
                jobId : job._id,
                $expr : { $eq: ['$painterId', '$$painterId'] },
              },
            },
            { $count: 'count' },
          ],
          as: 'submissionCountData',
        },
      },
      {
        $addFields: {
          submissionCount: { $ifNull: [{ $arrayElemAt: ['$submissionCountData.count', 0] }, 0] },
        },
      },
      { $project: { submissionCountData: 0 } },
    ]);

    return ok(painters);
  }
);

// POST — Assign a painter to a job. Idempotent via $addToSet; validates the target user exists and has the painter role. Owner/admin only.
export const POST = withRole(['owner', 'admin'], { schema: AddPainterSchema, access: requireJobOwner, audit: 'JOB_PAINTER_ADD' })(
  async (req, ctx) => {
    const { painterId } = ctx.body as z.infer<typeof AddPainterSchema>;

    if (!Types.ObjectId.isValid(painterId)) {
      ctx.fail(400, 'INVALID_PAINTER', 'Invalid painter ID');
    }

    await connectDB();

    const painterExists = await User.exists({ _id: painterId, role: 'painter' });
    if (!painterExists) ctx.fail(404, 'PAINTER_NOT_FOUND', 'Valid painter not found');

    await Job.updateOne(
      { _id: ctx.job!._id },
      { $addToSet: { painters: new Types.ObjectId(painterId) } }
    );

    notify.emit('job.painter_added', {
      actorId: ctx.user!.userId,
      recipientId: painterId,
      data: { jobId: ctx.job!._id.toString(), company: ctx.job!.companyName },
    }).catch(() => {});

    return ok({ message: 'Painter added successfully' });
  }
);
