import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Submission } from '@/lib/models/Submission';
import { Photo } from '@/lib/models/Photo';
import { UpdateSubmissionSchema } from '@/lib/validators';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  
  const auth = await requireAuth(request);
  const { jobId, submissionId } = await params;

  try {
    await connectDB();
    
    // 2. Laser Focus: Fetch only needed image fields
    const submission = await Submission.findOne({ _id: submissionId, jobId })
      .populate('images', 'cloudinaryUrl previewCloudinaryUrl previewCloudinaryId generatedNumber');
      
    if (!submission) return notFound('Submission not found');

    // 3. The Bouncer
    if (auth.role === 'painter' && submission.painterId.toString() !== auth.userId) {
      return forbidden();
    }

    return ok(submission);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Failed to fetch submission', 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  // 1. Fail Fast: Auth and Validation first
  const auth = await requireAuth(request);
  
  const body = await request.json().catch(() => ({}));
  const parsed = UpdateSubmissionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { jobId, submissionId } = await params;
  await connectDB();
  
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const submission = await Submission.findOne({ _id: submissionId, jobId }).session(session);
    if (!submission) throw new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 });

    // 2. The Bouncer
    if (auth.role === 'painter') {
      if (submission.painterId.toString() !== auth.userId) throw new Response(null, { status: 403 });
      if (submission.status === 'approved') throw new Response(JSON.stringify({ error: 'Cannot edit an approved submission' }), { status: 400 });
    }

    const { location, sizes, uploadedImages } = parsed.data;

    if (location) submission.location = location;
    if (sizes) submission.sizes = sizes;

    if (uploadedImages && uploadedImages.length > 0) {
      // 3. Heavy Backpack: Prepare docs and insertMany (including preview fields)
      const photoDocs = uploadedImages.map((img: any) => ({
        jobId: new mongoose.Types.ObjectId(jobId),
        cloudinaryId: img.cloudinaryId,
        cloudinaryUrl: img.cloudinaryUrl,
        previewCloudinaryId: img.previewCloudinaryId,
        previewCloudinaryUrl: img.previewCloudinaryUrl,
        watermarkedUrl: null,
        generatedNumber: null,
      }));

      const savedPhotos = await Photo.insertMany(photoDocs, { session });
      const createdPhotoIds = savedPhotos.map(p => p._id);
      
      submission.images.push(...createdPhotoIds);
    }

    if (submission.status === 'rejected') {
      submission.status = 'pending';
    }

    await submission.save({ session });
    await session.commitTransaction();
    return ok({ message: 'Submission updated successfully' });

  } catch (e) {
    await session.abortTransaction();
    if (e instanceof Response) return e;
    console.error('[PUT Submission]', e);
    return err('Failed to update submission', 500);
  } finally {
    session.endSession();
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  // 1. Fail Fast
  const auth = await requireAuth(request);
  if (auth.role === 'painter') return forbidden();

  const { jobId, submissionId } = await params;
  await connectDB();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const submission = await Submission.findOne({ _id: submissionId, jobId }).session(session);
    if (!submission) throw new Response(null, { status: 404 });

    const photosToDelete = await Photo.find({ _id: { $in: submission.images } }).session(session);

    // 2. Storage Leak Fix: Destroy BOTH high-res and preview images concurrently
    const destroyPromises = [];
    for (const photo of photosToDelete) {
      if (photo.cloudinaryId) destroyPromises.push(cloudinary.uploader.destroy(photo.cloudinaryId));
      if (photo.previewCloudinaryId) destroyPromises.push(cloudinary.uploader.destroy(photo.previewCloudinaryId));
    }
    
    // Process all deletions in parallel
    await Promise.all(destroyPromises);

    await Photo.deleteMany({ _id: { $in: submission.images } }, { session });
    await submission.deleteOne({ session });

    await session.commitTransaction();
    return ok({ message: 'Submission deleted successfully' });

  } catch (e) {
    await session.abortTransaction();
    if (e instanceof Response) return e;
    console.error('[DELETE Submission]', e);
    return err('Failed to delete submission', 500);
  } finally {
    session.endSession();
  }
}