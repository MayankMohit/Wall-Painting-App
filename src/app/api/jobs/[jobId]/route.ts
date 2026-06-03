import { connectDB } from '@/lib/db';
import { Job, User, Submission, Photo, GeneratedFile } from '@/lib/models';
import { ok, notFound } from '@/lib/api-response';
import { UpdateJobSchema } from '@/lib/validators';
import { withAuth, withRole } from '@/lib/middleware';
import { requireJobAccess } from '@/lib/middleware/requireJobAccess';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';
import type { z } from 'zod';
import { Types } from 'mongoose';

export const GET = withAuth({ access: requireJobAccess })(
  async (req, ctx) => {
    const { jobId } = ctx.params;

    await connectDB();

    const result = await Job.aggregate([
      { $match: { _id: new Types.ObjectId(jobId) } },

      { $lookup: { from: 'submissions', localField: '_id', foreignField: 'jobId', as: 'subs' } },
      { $lookup: { from: 'users', localField: 'painters', foreignField: '_id', as: 'painterDocs' } },

      {
        $addFields: {
          stats: {
            submitted: { $size: '$subs' },
            approved: { $size: { $filter: { input: '$subs', as: 's', cond: { $eq: ['$$s.status', 'approved'] } } } },
            pending:  { $size: { $filter: { input: '$subs', as: 's', cond: { $eq: ['$$s.status', 'pending']  } } } },
          },
          mappedPainters: {
            $map: {
              input: '$painterDocs',
              as: 'p',
              in: {
                _id  : '$$p._id',
                name : '$$p.name',
                phone: '$$p.phone',
                stats: {
                  submitted: { $size: { $filter: { input: '$subs', as: 's', cond: { $eq: ['$$s.painterId', '$$p._id'] } } } },
                  approved : { $size: { $filter: { input: '$subs', as: 's', cond: { $and: [{ $eq: ['$$s.painterId', '$$p._id'] }, { $eq: ['$$s.status', 'approved'] }] } } } },
                  pending  : { $size: { $filter: { input: '$subs', as: 's', cond: { $and: [{ $eq: ['$$s.painterId', '$$p._id'] }, { $eq: ['$$s.status', 'pending']  }] } } } },
                },
              },
            },
          },
        },
      },

      {
        $project: {
          companyName: 1,
          description: 1,
          status     : 1,
          createdAt  : 1,
          startDate  : 1,
          endDate    : 1,
          ownerId    : 1,
          stats      : 1,
          painters   : '$mappedPainters',
        },
      },
    ]);

    if (!result || result.length === 0) return notFound('Job not found');
    return ok(result[0]);
  }
);

export const PATCH = withRole(['owner'], { schema: UpdateJobSchema, access: requireJobOwner, audit: 'JOB_UPDATE' })(
  async (req, ctx) => {
    const { painterIds, ...rest } = ctx.body as z.infer<typeof UpdateJobSchema>;

    await connectDB();

    const update: Record<string, unknown> = { ...rest };

    if (painterIds !== undefined) {
      if (painterIds.some(id => !Types.ObjectId.isValid(id))) {
        ctx.fail(400, 'INVALID_PAINTERS', 'One or more painter IDs are invalid');
      }

      const found = await User.find({ _id: { $in: painterIds }, role: 'painter' })
        .select('_id')
        .lean();

      if (found.length !== painterIds.length) {
        ctx.fail(400, 'INVALID_PAINTERS', 'One or more painter IDs are invalid');
      }

      update.painters = found.map(u => u._id);
    }

    if (rest.status === 'invoiced' && !ctx.job!.endDate) update.endDate = new Date();

    const updated = await Job.findByIdAndUpdate(
      ctx.params.jobId,
      { $set: update },
      { returnDocument: 'after' }
    ).lean();

    return ok(updated);
  }
);

export const DELETE = withRole(['owner'], { access: requireJobOwner, audit: 'JOB_DELETE' })(
  async (req, ctx) => {
    const job = ctx.job!;

    await connectDB();

    const submissions = await Submission.find({ jobId: job._id }).select('_id images').lean();
    const photoIds = submissions.flatMap(s => s.images);

    await Promise.all([
      Photo.deleteMany({ _id: { $in: photoIds } }),
      Submission.deleteMany({ jobId: job._id }),
      GeneratedFile.deleteMany({
        _id: { $in: [job.generatedExcel, job.generatedPDFFile, job.generatedPDFPhotos].filter(Boolean) },
      }),
      Job.findByIdAndDelete(job._id),
    ]);

    return ok({ message: 'Job deleted' });
  }
);
