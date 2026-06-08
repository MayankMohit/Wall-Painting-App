import mongoose, { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Photo } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withAuth } from '@/lib/middleware';
import { requireSubmissionAccess } from '@/lib/middleware/requireSubmissionAccess';
import { cloudinary } from '@/lib/cloudinary';

// DELETE — Remove a single photo from a submission and destroy its Cloudinary assets.
//          Painters can only remove photos from their own non-approved submissions.
//          Removing from a rejected submission re-opens it to pending.
export const DELETE = withAuth({ access: requireSubmissionAccess, audit: 'PHOTO_DELETE' })(
  async (req, ctx) => {
    const submission = ctx.submission!;
    const { photoId } = ctx.params;

    if (ctx.user!.role === 'painter' && submission.status === 'approved') {
      ctx.fail(400, 'SUBMISSION_APPROVED', 'Cannot edit an approved submission');
    }

    if (!Types.ObjectId.isValid(photoId)) {
      ctx.fail(400, 'INVALID_PHOTO', 'Invalid photo ID');
    }

    const photoObjId = new Types.ObjectId(photoId);

    // Verify the photo belongs to this submission before touching anything.
    if (!submission.images.some(id => id.equals(photoObjId))) {
      ctx.fail(404, 'NOT_FOUND', 'Photo not found in this submission');
    }

    if (submission.images.length <= 1) {
      ctx.fail(400, 'LAST_PHOTO', 'Cannot remove the only photo from a submission');
    }

    await connectDB();

    const photo = await Photo.findById(photoObjId)
      .select('cloudinaryId previewCloudinaryId')
      .lean();
    if (!photo) ctx.fail(404, 'NOT_FOUND', 'Photo not found');

    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      await Photo.deleteOne({ _id: photoObjId }, { session });

      submission.images = submission.images.filter(id => !id.equals(photoObjId));
      if (submission.status === 'rejected') submission.status = 'pending';
      await submission.save({ session });

      await session.commitTransaction();

    } catch (e) {
      if (session) await session.abortTransaction().catch(() => {});
      throw e;
    } finally {
      if (session) await session.endSession();
    }

    // Cloudinary cleanup after commit — allSettled so a CDN failure never causes a 500
    // after the photo record is already deleted from MongoDB.
    const destroys: Promise<unknown>[] = [cloudinary.uploader.destroy(photo!.cloudinaryId)];
    if (photo!.previewCloudinaryId) destroys.push(cloudinary.uploader.destroy(photo!.previewCloudinaryId));
    await Promise.allSettled(destroys);

    return ok({ message: 'Photo removed successfully' });
  }
);
