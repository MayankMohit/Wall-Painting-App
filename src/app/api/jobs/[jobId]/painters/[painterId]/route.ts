import { connectDB } from '@/lib/db';
import { Job, User, Submission } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';
import { Types } from 'mongoose';
import { notify } from '@/lib/notify/emit';

// GET — Fetch a painter's detail view for a job: company name, painter name, all their
//       submissions, and a pending/approved/rejected stats breakdown. Owner/admin only.
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (req, ctx) => {
    const { painterId } = ctx.params;

    if (!Types.ObjectId.isValid(painterId)) {
      ctx.fail(400, 'INVALID_PAINTER', 'Invalid painter ID');
    }

    await connectDB();

    const [painter, submissions] = await Promise.all([
      User.findById(painterId).select('name').lean(),
      Submission.find({ jobId: ctx.job!._id, painterId: new Types.ObjectId(painterId) })
        .select('_id location photoNo sizes status submittedAt')
        .sort({ submittedAt: -1 })
        .lean(),
    ]);

    if (!painter) ctx.fail(404, 'PAINTER_NOT_FOUND', 'Painter not found');

    const stats = { pending: 0, approved: 0, rejected: 0 };
    for (const sub of submissions) {
      if (sub.status === 'pending')  stats.pending++;
      if (sub.status === 'approved') stats.approved++;
      if (sub.status === 'rejected') stats.rejected++;
    }

    return ok({
      job        : { companyName: ctx.job!.companyName },
      painter    : { name: painter!.name },
      stats,
      submissions,
    });
  }
);

// DELETE — Remove a painter from the job's painters array. Owner/admin only.
export const DELETE = withRole(['owner', 'admin'], { access: requireJobOwner, audit: 'JOB_PAINTER_REMOVE' })(
  async (req, ctx) => {
    const { painterId } = ctx.params;

    if (!Types.ObjectId.isValid(painterId)) {
      ctx.fail(400, 'INVALID_PAINTER', 'Invalid painter ID');
    }

    await connectDB();

    await Job.updateOne(
      { _id: ctx.job!._id },
      { $pull: { painters: new Types.ObjectId(painterId) } }
    );

    notify.emit('job.painter_removed', {
      actorId: ctx.user!.userId,
      recipientId: painterId,
      data: { jobId: ctx.job!._id.toString(), company: ctx.job!.companyName },
    }).catch(() => {});

    return ok({ message: 'Painter removed' });
  }
);
