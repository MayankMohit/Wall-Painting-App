import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Submission } from '@/lib/models/Submission';
import { Photo } from '@/lib/models/Photo';
import { ApproveSubmissionSchema } from '@/lib/validators';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PUT(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  // 1. FAIL FAST: Guard security boundary instantly
  const auth = await requireAuth(request);
  if (auth.role === 'painter') return forbidden();

  // 2. FAIL FAST: Validate request body before DB connection
  const body = await request.json().catch(() => ({}));
  const parsed = ApproveSubmissionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { jobId, submissionId } = await params;
  await connectDB();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const submission = await Submission.findOne({ _id: submissionId, jobId }).session(session);
    if (!submission) throw new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 });
    if (submission.status === 'approved') throw new Response(JSON.stringify({ error: 'Submission is already approved' }), { status: 400 });

    const { selectedImageIds } = parsed.data;

    // 3. LASER FOCUS: Fetch all current photo documents linked to this submission
    const currentPhotos = await Photo.find({ _id: { $in: submission.images } }).session(session);

    // 4. Filter into Keep vs Delete buckets
    const keptPhotoIds = currentPhotos
      .filter(p => selectedImageIds.includes(p._id.toString()))
      .map(p => p._id);
      
    const rejectedPhotos = currentPhotos.filter(p => !selectedImageIds.includes(p._id.toString()));

    // 5. STORAGE LEAK FIX: Concurrently destroy rejected photos from Cloudinary (Both sizes)
    if (rejectedPhotos.length > 0) {
      const destroyPromises = [];
      for (const photo of rejectedPhotos) {
        if (photo.cloudinaryId) destroyPromises.push(cloudinary.uploader.destroy(photo.cloudinaryId));
        if (photo.previewCloudinaryId) destroyPromises.push(cloudinary.uploader.destroy(photo.previewCloudinaryId));
      }
      
      // Execute all deletions to Cloudinary in parallel
      await Promise.all(destroyPromises);

      // Delete the orphaned Photo documents from MongoDB
      const rejectedPhotoIds = rejectedPhotos.map(p => p._id);
      await Photo.deleteMany({ _id: { $in: rejectedPhotoIds } }, { session });
    }

    // 6. Finalize Submission State
    submission.status = 'approved';
    submission.approvedAt = new Date();
    submission.images = keptPhotoIds; // Save only the kept ObjectIds

    await submission.save({ session });
    await session.commitTransaction();

    return ok({ message: 'Submission approved and rejected photos deleted successfully!' });
  } catch (e) {
    await session.abortTransaction();
    console.error('[Approve Submission Error]:', e);
    if (e instanceof Response) return e;
    return err('Failed to approve submission', 500);
  } finally {
    session.endSession();
  }
}