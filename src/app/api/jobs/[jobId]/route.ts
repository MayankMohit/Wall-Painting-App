import mongoose, { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Job, User, Submission, Photo, GeneratedFile } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { UpdateJobSchema } from '@/lib/validators';
import { withAuth, withRole } from '@/lib/middleware';
import { requireJobAccess } from '@/lib/middleware/requireJobAccess';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';
import { cloudinary } from '@/lib/cloudinary';
import { r2 } from '@/lib/r2';
import type { z } from 'zod';
import { notify } from '@/lib/notify/emit';

// GET — Fetch full job detail with per-painter submission stats. Accessible to assigned painters, the owning owner, and admins.
export const GET = withAuth({ access: requireJobAccess })(
  async (req, ctx) => {
    await connectDB();

    const job = ctx.job!;

    const [subs, painterDocs] = await Promise.all([
      Submission.find({ jobId: job._id }).select('status painterId').lean(),
      User.find({ _id: { $in: job.painters } }).select('name phone').lean(),
    ]);

    const stats = {
      submitted: subs.length,
      approved:  subs.filter(s => s.status === 'approved').length,
      pending:   subs.filter(s => s.status === 'pending').length,
    };

    const painters = painterDocs.map(p => {
      const pId   = p._id.toString();
      const pSubs = subs.filter(s => s.painterId.toString() === pId);
      return {
        _id  : p._id,
        name : p.name,
        phone: p.phone,
        stats: {
          submitted: pSubs.length,
          approved:  pSubs.filter(s => s.status === 'approved').length,
          pending:   pSubs.filter(s => s.status === 'pending').length,
        },
      };
    });

    return ok({
      _id        : job._id,
      companyName: job.companyName,
      description: job.description,
      status     : job.status,
      createdAt  : job.createdAt,
      startDate  : job.startDate,
      endDate    : job.endDate,
      ownerId    : job.ownerId,
      stats,
      painters,
    });
  }
);

// PATCH — Update job fields (name, description, status, painters). Validates painter IDs when provided. Auto-sets endDate on transition to 'invoiced'. Owner-only.
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

    ctx.setAudit('JOB_UPDATE', { type: 'Job', id: ctx.params.jobId }, { companyName: ctx.job!.companyName });

    if (rest.status === 'completed') {
      notify.emit('job.completed', {
        actorId: ctx.user!.userId,
        data: { jobId: ctx.params.jobId, company: ctx.job!.companyName },
      }).catch(() => {});
    }

    return ok(updated);
  }
);

// DELETE — Delete a job and cascade-remove all linked submissions, photos, and generated files.
//          Runs DB deletes in a transaction, then destroys Cloudinary assets after commit so a
//          CDN failure never rolls back an already-completed deletion. Owner-only.
export const DELETE = withRole(['owner'], { access: requireJobOwner, audit: 'JOB_DELETE' })(
  async (req, ctx) => {
    const job = ctx.job!;

    await connectDB();

    // Fetch external asset references before the transaction — needed for cleanup after commit.
    const submissions = await Submission.find({ jobId: job._id }).select('images').lean();
    const photoIds    = submissions.flatMap(s => s.images);

    const [photos, generatedFiles] = await Promise.all([
      photoIds.length > 0
        ? Photo.find({ _id: { $in: photoIds } }).select('cloudinaryId previewCloudinaryId').lean()
        : Promise.resolve([]),
      GeneratedFile.find({ jobId: job._id }).select('r2Path').lean(),
    ]);

    const r2Paths = generatedFiles.map(f => f.r2Path).filter(Boolean) as string[];

    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      if (photoIds.length > 0) {
        await Photo.deleteMany({ _id: { $in: photoIds } }, { session });
      }
      await Submission.deleteMany({ jobId: job._id }, { session });
      await GeneratedFile.deleteMany({ jobId: job._id }, { session });
      await Job.deleteOne({ _id: job._id }, { session });

      await session.commitTransaction();
    } catch (e) {
      if (session) await session.abortTransaction().catch(() => {});
      throw e;
    } finally {
      if (session) await session.endSession();
    }

    // External storage cleanup after commit — allSettled ensures all assets are attempted even
    // if one fails, and a storage failure never causes a 500 after DB records are already gone.
    const cleanupOps: Promise<unknown>[] = [];

    if (photos.length > 0) {
      photos.forEach(p => {
        cleanupOps.push(cloudinary.uploader.destroy(p.cloudinaryId));
        if (p.previewCloudinaryId) cleanupOps.push(cloudinary.uploader.destroy(p.previewCloudinaryId));
      });
    }

    r2Paths.forEach(path => cleanupOps.push(r2.delete(path)));

    if (cleanupOps.length > 0) await Promise.allSettled(cleanupOps);

    ctx.setAudit('JOB_DELETE', { type: 'Job', id: job._id.toString() }, { companyName: job.companyName });

    return ok({ message: 'Job deleted' });
  }
);
