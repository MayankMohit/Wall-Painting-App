import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Submission } from '@/lib/models/Submission';
import { Photo } from '@/lib/models/Photo';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string, submissionId: string, photoId: string }> }
) {
  // 1. FAIL FAST: Check authorization before touching the database
  const auth = await requireAuth(request);
  const { jobId, submissionId, photoId } = await params;

  await connectDB();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 2. THE BOUNCER: Check submission and ownership
    const submission = await Submission.findOne({ _id: submissionId, jobId }).session(session);
    if (!submission) throw new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 });

    if (auth.role === 'painter') {
      if (submission.painterId.toString() !== auth.userId) throw new Response(null, { status: 403 });
      if (submission.status === 'approved') throw new Response(JSON.stringify({ error: 'Cannot edit an approved submission' }), { status: 400 });
    }

    const photoToDelete = await Photo.findOne({ _id: photoId, jobId }).session(session);
    if (!photoToDelete) throw new Response(JSON.stringify({ error: 'Photo not found' }), { status: 404 });

    // 3. STORAGE LEAK FIX: Delete both Print AND Preview versions from Cloudinary concurrently
    const destroyPromises = [];
    if (photoToDelete.cloudinaryId) {
      destroyPromises.push(cloudinary.uploader.destroy(photoToDelete.cloudinaryId));
    }
    if (photoToDelete.previewCloudinaryId) {
      destroyPromises.push(cloudinary.uploader.destroy(photoToDelete.previewCloudinaryId));
    }
    await Promise.all(destroyPromises);

    // 4. ATOMIC DB UPDATES
    await Photo.findByIdAndDelete(photoId, { session });
    
    // Remove the photo ID from the submission's images array
    submission.images = submission.images.filter((id: any) => id.toString() !== photoId);

    // Automatically revert a rejected submission back to pending if they are editing/deleting photos to fix it
    if (submission.status === 'rejected') {
      submission.status = 'pending';
    }

    await submission.save({ session });
    await session.commitTransaction();

    return ok({ message: 'Photo removed successfully' });

  } catch (e) {
    await session.abortTransaction();
    console.error('[DELETE Single Photo]', e);
    if (e instanceof Response) return e;
    return err('Failed to remove photo', 500);
  } finally {
    session.endSession();
  }
}