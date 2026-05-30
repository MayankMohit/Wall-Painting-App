import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Submission } from '@/lib/models/Submission';
import { Photo } from '@/lib/models/Photo';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (uses your backend environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string, submissionId: string, photoId: string }> }
) {
  await connectDB();
  const { jobId, submissionId, photoId } = await params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const auth = await requireAuth(request);

    const submission = await Submission.findOne({ _id: submissionId, jobId }).session(session);
    if (!submission) {
      await session.abortTransaction();
      session.endSession();
      return notFound('Submission not found');
    }

    if (auth.role === 'painter') {
      if (submission.painterId.toString() !== auth.userId) {
        await session.abortTransaction();
        session.endSession();
        return forbidden();
      }
      if (submission.status === 'approved') {
        await session.abortTransaction();
        session.endSession();
        return badRequest('Cannot edit an approved submission');
      }
    }

    const photoToDelete = await Photo.findOne({ _id: photoId, jobId }).session(session);
    if (!photoToDelete) {
      await session.abortTransaction();
      session.endSession();
      return notFound('Photo not found');
    }

    if (photoToDelete.cloudinaryId) {
      await cloudinary.uploader.destroy(photoToDelete.cloudinaryId);
    }

    await Photo.findByIdAndDelete(photoId, { session });

    submission.images = submission.images.filter((id: any) => id.toString() !== photoId);

    if (submission.status === 'rejected') {
      submission.status = 'pending';
    }

    await submission.save({ session });

    await session.commitTransaction();
    session.endSession();

    return ok({ message: 'Photo removed successfully' });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e instanceof Response) return e;
    return err('Failed to remove photo', 500);
  }
}