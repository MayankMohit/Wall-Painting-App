import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Photo, Job } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { ApproveSubmissionSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { requireSubmissionAccess } from '@/lib/middleware/requireSubmissionAccess';
import { cloudinary } from '@/lib/cloudinary';
import type { z } from 'zod';

// PUT — Approve a submission: drop unselected images from DB, mint sequential watermark numbers
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

  // Populated inside the transaction; used after commit for eager cache warming.
  let mintingData: Array<{ cloudinaryId: string; transform: string }> = [];

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
        const urlCode      = `%23${rawCode}`;
        const transform    = `l_text:Arial_60_bold:${urlCode},co_white,bo_3px_solid_rgb:00000099,g_south_east,x_24,y_24`;
        const watermarkedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${photo.cloudinaryId}`;

        mintingData.push({ cloudinaryId: photo.cloudinaryId, transform });

        return {
          updateOne: {
            filter: { _id: photo._id },
            update: { $set: { generatedNumber: displayCode, watermarkedUrl } },
          },
        };
      });

      await Photo.bulkWrite(bulkOps, { session });
    }

    submission.status    = 'approved';
    submission.approvedAt = new Date();
    submission.images    = keptPhotoIds;
    await submission.save({ session });

    await session.commitTransaction();

  } catch (e) {
    if (session) await session.abortTransaction().catch(() => {});
    throw e;
  } finally {
    if (session) await session.endSession();
  }

  // Cloudinary cleanup runs after the DB commit so a Cloudinary failure never rolls back
  // an already-approved submission. allSettled ensures all assets are attempted.
  if (rejectedPhotos.length > 0) {
    const destroys = rejectedPhotos.flatMap(p => {
      const ops: Promise<unknown>[] = [cloudinary.uploader.destroy(p.cloudinaryId)];
      if (p.previewCloudinaryId) ops.push(cloudinary.uploader.destroy(p.previewCloudinaryId));
      return ops;
    });
    await Promise.allSettled(destroys);
  }

  // Fire-and-forget: warm Cloudinary's CDN for each newly watermarked image.
  for (const { cloudinaryId, transform } of mintingData) {
    cloudinary.uploader.explicit(cloudinaryId, {
      type       : 'upload',
      eager      : [{ raw_transformation: transform }],
      eager_async: true,
    }).catch(() => {});
  }

  return ok({ message: 'Submission approved and watermarks generated successfully' });
});
