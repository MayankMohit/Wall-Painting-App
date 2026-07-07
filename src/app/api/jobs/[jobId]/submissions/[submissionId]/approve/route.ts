import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Photo, Job } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { ApproveSubmissionSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { requireSubmissionAccess } from '@/lib/middleware/requireSubmissionAccess';
import { cloudinary } from '@/lib/cloudinary';
import type { z } from 'zod';
import { notify } from '@/lib/notify/emit';

// PUT — Approve a submission: drop unselected images from DB, mint sequential numbers
//       on kept images, and mark the submission approved. Owner/admin only.
export const PUT = withRole(['owner', 'admin'], {
  schema: ApproveSubmissionSchema,
  access: requireSubmissionAccess,
  audit : 'SUBMISSION_APPROVE',
})(async (req, ctx) => {
  const { selectedImageIds } = ctx.body as z.infer<typeof ApproveSubmissionSchema>;
  const submission = ctx.submission!;

  if (submission.status === 'approved') {
    ctx.fail(400, 'ALREADY_APPROVED', 'Submission is already approved');
  }

  await connectDB();

  const currentPhotos = await Photo.find({ _id: { $in: submission.images } }).lean();

  const keptPhotos     = currentPhotos.filter(p =>  selectedImageIds.includes(p._id.toString()));
  const rejectedPhotos = currentPhotos.filter(p => !selectedImageIds.includes(p._id.toString()));
  const keptPhotoIds   = keptPhotos.map(p => p._id);
  const rejectedPhotoIds = rejectedPhotos.map(p => p._id);
  
  if (keptPhotos.length === 0) {
    ctx.fail(400, 'NO_VALID_IMAGES', 'None of the selected image IDs match photos in this submission');
  }

  const photosToMint   = keptPhotos.filter(p => !p.generatedNumber);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    if (rejectedPhotoIds.length > 0) {
      await Photo.deleteMany({ _id: { $in: rejectedPhotoIds } }, { session });
    }

    if (photosToMint.length > 0) {
      // One atomic increment reserves exactly the right number of slots.
      const updatedJob = await Job.findByIdAndUpdate(
        submission.jobId,
        { $inc: { nextGeneratedNumber: photosToMint.length } },
        { new: true, session }
      );
      if (!updatedJob) ctx.fail(404, 'NOT_FOUND', 'Job not found during number allocation');

      const startNumber = updatedJob!.nextGeneratedNumber - photosToMint.length + 1;

      const bulkOps = photosToMint.map((photo, i) => {
        const rawCode      = String(startNumber + i).padStart(4, '0');
        const displayCode  = `#${rawCode}`;
        
        // Removed text overlay. Just using a basic auto-quality optimization for the saved URL.
        const watermarkedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto/${photo.cloudinaryId}`;

        return {
          updateOne: {
            filter: { _id: photo._id },
            update: { $set: { generatedNumber: displayCode, watermarkedUrl } },
          },
        };
      });

      await Photo.bulkWrite(bulkOps, { session });
    }

    submission.status     = 'approved';
    submission.approvedAt = new Date();
    submission.images     = keptPhotoIds;
    // Owner's size set defaults to whatever the painter's sizes are at approval time.
    submission.ownerSizes = submission.sizes.map(([w, h]) => [w, h]);
    await submission.save({ session });

    await session.commitTransaction();

  } catch (e) {
    if (session) await session.abortTransaction().catch(() => {});
    throw e;
  } finally {
    if (session) await session.endSession();
  }

  ctx.setAudit('SUBMISSION_APPROVE', { type: 'Submission', id: submission._id.toString() }, {
    jobId: submission.jobId.toString(),
    painterId: submission.painterId.toString(),
    photoNo: submission.photoNo,
    keptCount: keptPhotos.length,
  });

  notify.emit('submission.approve', {
    actorId: ctx.user!.userId,
    recipientId: submission.painterId.toString(),
    data: { code: submission.photoNo, count: keptPhotos.length },
  }).catch(() => {});

  // Cloudinary cleanup runs after the DB commit
  if (rejectedPhotos.length > 0) {
    const destroys = rejectedPhotos.flatMap(p => {
      const ops: Promise<unknown>[] = [cloudinary.uploader.destroy(p.cloudinaryId)];
      if (p.previewCloudinaryId) ops.push(cloudinary.uploader.destroy(p.previewCloudinaryId));
      return ops;
    });
    await Promise.allSettled(destroys);
  }

  return ok({ message: 'Submission approved and watermarks generated successfully' });
});