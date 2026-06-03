import mongoose from 'mongoose';
import { requireAuth } from '@/lib/rbac';
import { ok, created, err, forbidden, badRequest, notFound } from '@/lib/api-response';
import { Photo } from '@/lib/models/Photo';
import { Submission } from '@/lib/models/Submission';
import { Job } from '@/lib/models/Job'; 
import { CreateSubmissionSchema } from '@/lib/validators';
import { connectDB } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  // Fail Fast: Auth first
  const auth = await requireAuth(request);
  const { jobId } = await params;

  try {
    await connectDB();

    const query: any = { jobId };
    if (auth.role === 'painter') query.painterId = auth.userId;

    // Laser Focus: Only populate preview fields for the list view
    const submissions = await Submission.find(query)
      .populate('images', 'previewCloudinaryUrl status generatedNumber') 
      .sort({ submittedAt: -1 });

    return ok(submissions);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Failed to fetch submissions', 500);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  // Fail Fast: Auth & Validation
  const auth = await requireAuth(request);
  if (auth.role !== 'painter') return forbidden();

  const body = await request.json().catch(() => ({}));
  const parsed = CreateSubmissionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const { jobId } = await params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // The Bouncer: Assignment check
    const targetJob = await Job.findById(jobId).select('painters').session(session);
    if (!targetJob) throw new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
    
    const isAssigned = targetJob.painters?.some((id: any) => id.toString() === auth.userId);
    if (!isAssigned) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });

    const { photoNo, location, sizes, uploadedImages } = parsed.data;

    // Heavy Backpack: Batch photo creation
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

    const [newSubmission] = await Submission.create([{
      painterId: new mongoose.Types.ObjectId(auth.userId),
      jobId: new mongoose.Types.ObjectId(jobId),
      photoNo,
      location,
      sizes,
      images: createdPhotoIds,
      status: 'pending',
      submittedAt: new Date()
    }], { session });

    await session.commitTransaction();
    return created({ submissionId: newSubmission._id });
  } catch (e) {
    await session.abortTransaction();
    if (e instanceof Response) return e;
    console.error('[POST Submissions]', e);
    return err('Failed to create submission', 500);
  } finally {
    session.endSession();
  }
}