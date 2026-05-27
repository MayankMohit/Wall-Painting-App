import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Submission } from '@/lib/models/Submission';
import { Photo } from '@/lib/models/Photo';
import { UpdateSubmissionSchema } from '@/lib/validators';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  try {
    await connectDB();
    const { jobId, submissionId } = await params;
    const auth = await requireAuth(request);

    const submission = await Submission.findOne({ _id: submissionId, jobId }).populate('images');
    if (!submission) return notFound('Submission not found');

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
  await connectDB();
  const { jobId, submissionId } = await params;
  
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

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      await session.abortTransaction();
      session.endSession();
      return badRequest(parsed.error.issues[0].message);
    }

    const { location, sizes, uploadedImages } = parsed.data;

    if (location) submission.location = location;
    if (sizes) submission.sizes = sizes;

    if (uploadedImages && uploadedImages.length > 0) {

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

      submission.images.push(...createdPhotoIds);
    }

    if (submission.status === 'rejected') {
      submission.status = 'pending';
    }

    await submission.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    return ok({ message: 'Submission updated successfully' });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e instanceof Response) return e;
    return err('Failed to update submission', 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  await connectDB();
  const { jobId, submissionId } = await params;

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
        return badRequest('Cannot delete an approved submission');
      }
    }

    await Photo.deleteMany({ _id: { $in: submission.images } }, { session });

    await submission.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    return ok({ message: 'Submission deleted successfully' });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e instanceof Response) return e;
    return err('Failed to delete submission', 500);
  }
}