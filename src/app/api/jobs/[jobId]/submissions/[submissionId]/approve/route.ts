import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Submission } from '@/lib/models/Submission';

export async function PUT(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  try {
    await connectDB();
    const { jobId, submissionId } = await params;
    
    // Security Check: Only owners/admins
    const auth = await requireAuth(request);
    if (auth.role === 'painter') {
      return forbidden();
    }

    const body = await request.json().catch(() => ({}));
    const { selectedImageIds } = body;

    if (!selectedImageIds || selectedImageIds.length === 0) {
      return badRequest('You must select at least one image to approve.');
    }

    const submission = await Submission.findOne({ _id: submissionId, jobId });
    if (!submission) {
      return notFound('Submission not found');
    }

    // Update status and timestamp matching your schema
    submission.status = 'approved';
    submission.approvedAt = new Date(); // Logs the exact moment of approval
    submission.images = selectedImageIds; 

    await submission.save();

    return ok({ message: 'Submission approved successfully!' });
  } catch (e: any) {
    console.error('Approve Error:', e);
    return err('Failed to approve submission', 500);
  }
}