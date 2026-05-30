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
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return badRequest('A rejection reason is required so the painter knows what to fix.');
    }

    const submission = await Submission.findOne({ _id: submissionId, jobId });
    if (!submission) {
      return notFound('Submission not found');
    }

    // Update status, reason, and timestamp matching your schema
    submission.status = 'rejected';
    submission.rejectionReason = rejectionReason;
    submission.rejectedAt = new Date(); // Logs the exact moment of rejection

    await submission.save();

    return ok({ message: 'Submission rejected successfully.' });
  } catch (e: any) {
    console.error('Reject Error:', e);
    return err('Failed to reject submission', 500);
  }
}