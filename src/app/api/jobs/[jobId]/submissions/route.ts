import mongoose from 'mongoose';
import { requireAuth } from '@/lib/rbac';
import { ok, created, err, forbidden, badRequest, notFound } from '@/lib/api-response';
import { Photo } from '@/lib/models/Photo';
import { Submission } from '@/lib/models/Submission';
import { Job } from '@/lib/models/Job'; 
import { CreateSubmissionSchema } from '@/lib/validators';
import { connectDB } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await connectDB();

    const { jobId } = await params;
    
    const auth = await requireAuth(request);

    const query: any = { jobId };
    if (auth.role === 'painter') {
      query.painterId = auth.userId;
    }

    const submissions = await Submission.find(query)
      .populate('images') 
      .sort({ submittedAt: -1 });

    return ok(submissions);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Failed to fetch submissions', 500);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {

  await connectDB();

  const { jobId } = await params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const auth = await requireAuth(request);
    if (auth.role !== 'painter') {
      await session.abortTransaction();
      session.endSession();
      return forbidden();
    }

    const body = await request.json().catch(() => ({}));
    const parsed = CreateSubmissionSchema.safeParse(body);
    
    if (!parsed.success) {
      await session.abortTransaction();
      session.endSession();
      return badRequest(parsed.error.issues[0].message);
    }

    const targetJob = await Job.findById(jobId).session(session);
    if (!targetJob) {
      await session.abortTransaction();
      session.endSession();
      return notFound('Job not found');
    }

    const isAssigned = targetJob.painters?.some((id: mongoose.Types.ObjectId) => id.toString() === auth.userId);
    if (!isAssigned) {
      await session.abortTransaction();
      session.endSession();
      return forbidden();
    }

    const { photoNo, location, sizes, uploadedImages } = parsed.data;
    const createdPhotoIds: mongoose.Types.ObjectId[] = [];

    for (const img of uploadedImages) {
      const uniqueNum = `IMG-${jobId.slice(-6)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
      
      const [newPhoto] = await Photo.create([{
        jobId: new mongoose.Types.ObjectId(jobId),
        cloudinaryId: img.cloudinaryId,
        cloudinaryUrl: img.cloudinaryUrl,
        watermarkedUrl: null,
        generatedNumber: uniqueNum,
      }], { session });

      createdPhotoIds.push(newPhoto._id as mongoose.Types.ObjectId);
    }

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
    session.endSession();

    return created({ submissionId: newSubmission._id });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e instanceof Response) return e;
    return err('Failed to create submission', 500);
  }
}