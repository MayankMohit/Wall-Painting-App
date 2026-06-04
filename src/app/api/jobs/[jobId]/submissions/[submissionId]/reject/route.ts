import { connectDB } from '@/lib/db';
import { ok } from '@/lib/api-response';
import { RejectSubmissionSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { requireSubmissionAccess } from '@/lib/middleware/requireSubmissionAccess';
import type { z } from 'zod';

// PUT — Reject a pending submission with a required reason. Cannot reject an already-approved
//       submission. Owner/admin only.
export const PUT = withRole(['owner', 'admin'], {
  schema: RejectSubmissionSchema,
  access: requireSubmissionAccess,
  audit : 'SUBMISSION_REJECT',
})(async (req, ctx) => {
  const { rejectionReason } = ctx.body as z.infer<typeof RejectSubmissionSchema>;
  const submission = ctx.submission!;

  if (submission.status === 'approved') {
    ctx.fail(400, 'ALREADY_APPROVED', 'Cannot reject a submission that has already been approved');
  }

  submission.status          = 'rejected';
  submission.rejectionReason = rejectionReason;
  submission.rejectedAt      = new Date();

  await connectDB();
  await submission.save();

  return ok({ message: 'Submission rejected successfully' });
});
