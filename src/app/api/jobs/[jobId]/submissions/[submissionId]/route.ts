import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Photo, Submission } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { UpdateSubmissionSchema } from '@/lib/validators';
import { withAuth, withRole } from '@/lib/middleware';
import { requireSubmissionAccess } from '@/lib/middleware/requireSubmissionAccess';
import { cloudinary } from '@/lib/cloudinary';
import type { z } from 'zod';

// GET — Fetch a single submission with full image data. Painters can only access their own.
export const GET = withAuth({ access: requireSubmissionAccess })(
  async (req, ctx) => {
    await ctx.submission!.populate('images', 'cloudinaryUrl previewCloudinaryUrl generatedNumber');
    return ok(ctx.submission!.toObject());
  }
);

// PUT — Update location, sizes, or append images. No role can edit an approved submission.
//       Editing a rejected submission re-opens it to pending. Cleans up Cloudinary on any failure.
export const PUT = withAuth({ schema: UpdateSubmissionSchema, access: requireSubmissionAccess, audit: 'SUBMISSION_UPDATE' })(
  async (req, ctx) => {
    const { location, sizes, uploadedImages } = ctx.body as z.infer<typeof UpdateSubmissionSchema>;
    const submission = ctx.submission!;

    // Fast path: no new images — nothing in Cloudinary to clean up, so fail fast is safe.
    if (!uploadedImages?.length) {
      if (submission.status === 'approved') {
        ctx.fail(400, 'SUBMISSION_APPROVED', 'Cannot edit an approved submission');
      }

      await connectDB();
      if (location) submission.location = location;
      if (sizes)    submission.sizes    = sizes;
      if (submission.status === 'rejected') submission.status = 'pending';
      await submission.save();
      return ok({ message: 'Submission updated successfully' });
    }

    // Slow path: images are already in Cloudinary — every failure must clean them up.
    let session: mongoose.ClientSession | null = null;
    try {
      if (submission.status === 'approved') {
        ctx.fail(400, 'SUBMISSION_APPROVED', 'Cannot edit an approved submission');
      }

      if (submission.images.length + uploadedImages.length > 20) {
        ctx.fail(
          400,
          'TOO_MANY_IMAGES',
          `Submission already has ${submission.images.length} image(s); adding ${uploadedImages.length} would exceed the 20-image limit`,
        );
      }

      await connectDB();

      if (location) submission.location = location;
      if (sizes)    submission.sizes    = sizes;
      if (submission.status === 'rejected') submission.status = 'pending';

      session = await mongoose.startSession();
      session.startTransaction();

      const photoDocs = uploadedImages.map(img => ({
        jobId               : submission.jobId,
        cloudinaryId        : img.cloudinaryId,
        cloudinaryUrl       : img.cloudinaryUrl,
        previewCloudinaryId : img.previewCloudinaryId,
        previewCloudinaryUrl: img.previewCloudinaryUrl,
      }));

      const savedPhotos = await Photo.insertMany(photoDocs, { session });
      submission.images.push(...savedPhotos.map(p => p._id));
      await submission.save({ session });
      await session.commitTransaction();
      return ok({ message: 'Submission updated successfully' });

    } catch (e) {
      if (session) await session.abortTransaction().catch(() => {});

      // Compensating cleanup — allSettled so a Cloudinary failure can't mask the
      // original error, and all assets are attempted even if one fails.
      const destroys: Promise<unknown>[] = uploadedImages.flatMap(img => {
        const ops: Promise<unknown>[] = [cloudinary.uploader.destroy(img.cloudinaryId)];
        if (img.previewCloudinaryId) ops.push(cloudinary.uploader.destroy(img.previewCloudinaryId));
        return ops;
      });
      await Promise.allSettled(destroys);

      throw e;
    } finally {
      if (session) await session.endSession();
    }
  }
);

// DELETE — Delete a submission and destroy all linked Cloudinary assets. Owner/admin only.
export const DELETE = withRole(['owner', 'admin'], { access: requireSubmissionAccess, audit: 'SUBMISSION_DELETE' })(
  async (req, ctx) => {
    const submission = ctx.submission!;

    await connectDB();

    // Fetch only the two ID fields needed for Cloudinary cleanup.
    const photos = await Photo.find({ _id: { $in: submission.images } })
      .select('cloudinaryId previewCloudinaryId')
      .lean();

    // Delete from MongoDB first in a transaction, then clean Cloudinary after commit.
    // This way a transient Cloudinary failure never causes a 500 after the data is gone.
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      await Photo.deleteMany({ _id: { $in: submission.images } }, { session });
      await submission.deleteOne({ session });
      await session.commitTransaction();

    } catch (e) {
      if (session) await session.abortTransaction().catch(() => {});
      throw e;
    } finally {
      if (session) await session.endSession();
    }

    // Cloudinary cleanup runs after the DB commit so a failure here never rolls back
    // already-deleted records. allSettled ensures all assets are attempted.
    const destroys: Promise<unknown>[] = photos.flatMap(p => {
      const ops: Promise<unknown>[] = [cloudinary.uploader.destroy(p.cloudinaryId)];
      if (p.previewCloudinaryId) ops.push(cloudinary.uploader.destroy(p.previewCloudinaryId));
      return ops;
    });
    await Promise.allSettled(destroys);

    return ok({ message: 'Submission deleted successfully' });
  }
);
