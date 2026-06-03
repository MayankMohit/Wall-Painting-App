import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { ok, err, forbidden, notFound, badRequest } from '@/lib/api-response';
import { Photo } from '@/lib/models/Photo';
import { Submission } from '@/lib/models/Submission';
import { RevokeSubmissionSchema } from '@/lib/validators';

export async function PUT(request: Request, { params }: { params: Promise<{ jobId: string, submissionId: string }> }) {
  // 1. FAIL FAST: Guard security boundary instantly
  const auth = await requireAuth(request);
  if (auth.role === 'painter') return forbidden();

  // 2. FAIL FAST: Validate request body via Zod before DB connection
  const body = await request.json().catch(() => ({}));
  const parsed = RevokeSubmissionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { jobId, submissionId } = await params;

  try {
    await connectDB();

    const submission = await Submission.findOne({ _id: submissionId, jobId });
    if (!submission) return notFound('Submission not found');

    if (submission.status !== 'approved') {
      return badRequest('Only approved submissions can be revoked back to pending.');
    }

    await Photo.updateMany(
      { _id: { $in: submission.images } },
      { 
        $set: { 
          generatedNumber: null, 
          watermarkedUrl: null 
        } 
      }
    );

    submission.status = 'pending';
    await submission.save();

    return ok({ message: 'Approval revoked. Submission is now pending.' });
  } catch (e) {
    console.error('[Revoke Submission Error]:', e);
    // 5. PREVENT 500 MASKS
    if (e instanceof Response) return e;
    return err('Failed to revoke submission', 500);
  }
}