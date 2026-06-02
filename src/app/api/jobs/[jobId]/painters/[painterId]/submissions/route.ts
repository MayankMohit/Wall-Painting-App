import { connectDB } from '@/lib/db';
import { Job, Submission } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden, err } from '@/lib/api-response';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string, painterId: string }> }
) {
  // 1. FAIL FAST: Guard security role boundaries instantly
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId, painterId } = await context.params;
  await connectDB();

  try {
    // 2. THE BOUNCER: Enforce administrative job access boundaries
    const job = await Job.findById(jobId).select('ownerId').lean();
    if (!job) return notFound('Job not found');
    if (auth.role === 'owner' && job.ownerId.toString() !== auth.userId) return forbidden();

    // 3. LASER FOCUS & HEAVY BACKPACK: Streamline sub-document lookups
    const submissions = await Submission.find({
      jobId: new mongoose.Types.ObjectId(jobId),
      painterId: new mongoose.Types.ObjectId(painterId),
    })
      // Select only the web preview fields to minimize network payload sizing
      .populate('images', 'previewCloudinaryUrl generatedNumber status')
      .sort({ submittedAt: -1 })
      .lean();

    return ok(submissions);
  } catch (e) {
    console.error('[GET Painter Submissions]', e);
    return err('Failed to fetch painter submissions', 500);
  }
}