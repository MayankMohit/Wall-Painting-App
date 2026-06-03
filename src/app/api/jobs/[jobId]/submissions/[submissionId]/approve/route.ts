import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Submission } from '@/lib/models/Submission';
import { Photo } from '@/lib/models/Photo';
import { Job } from '@/lib/models/Job';
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
    const keptPhotos = currentPhotos.filter(p => selectedImageIds.includes(p._id.toString()));
    const keptPhotoIds = keptPhotos.map(p => p._id);
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

    // 6. THE MINTING ENGINE: Assign unique numbers and generate watermarks
    const photosToMint = keptPhotos.filter(p => !p.generatedNumber);

    if (photosToMint.length > 0) {
      // Atomic Bulk Increment: Safely grab the required number of slots from the Job document
      const jobUpdate = await Job.findByIdAndUpdate(
        jobId,
        { $inc: { nextGeneratedNumber: photosToMint.length } },
        { new: true, session }
      );

      if (!jobUpdate) throw new Error("Job missing during counter increment");

      // Back-calculate the starting number for this batch
      let currentNumber = jobUpdate.nextGeneratedNumber - photosToMint.length + 1;
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

      for (const photo of photosToMint) {
        const rawCode = String(currentNumber).padStart(4, '0');
        const displayCode = `#${rawCode}`;
        const urlCode = `%23${rawCode}`; // URL Encoded '#'

        // Cloudinary Inline Watermark Transformation
        const transform = `l_text:Arial_60_bold:${urlCode},co_white,bo_3px_solid_rgb:00000099,g_south_east,x_24,y_24`;
        const watermarkedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${photo.cloudinaryId}`;

        photo.generatedNumber = displayCode;
        photo.watermarkedUrl = watermarkedUrl;
        // Notice: watermarkedAt has been intentionally omitted
        
        await photo.save({ session });

        // Fire-and-forget eager caching to warm Cloudinary's CDN instantly
        cloudinary.uploader.explicit(photo.cloudinaryId, {
          type: 'upload',
          eager: [{ raw_transformation: transform }],
          eager_async: true
        }).catch(err => console.error('[Cloudinary Eager Cache Error]', err));

        currentNumber++;
      }
    }

    // 7. Finalize Submission State
    submission.status = 'approved';
    submission.approvedAt = new Date();
    submission.images = keptPhotoIds; // Save only the kept ObjectIds

    await submission.save({ session });
    await session.commitTransaction();

    return ok({ message: 'Submission approved and watermarks generated successfully!' });
  } catch (e) {
    await session.abortTransaction();
    console.error('[Approve Submission Error]:', e);
    if (e instanceof Response) return e;
    return err('Failed to approve submission', 500);
  } finally {
    session.endSession();
  }
}