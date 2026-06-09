import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { RejectSubmissionSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { requireSubmissionAccess } from '@/lib/middleware/requireSubmissionAccess';
import type { z } from 'zod';
import { notify } from '@/lib/notify/emit';

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

  ctx.setAudit('SUBMISSION_REJECT', { type: 'Submission', id: submission._id.toString() }, {
    jobId: submission.jobId.toString(),
    painterId: submission.painterId.toString(),
    photoNo: submission.photoNo,
    reason: rejectionReason,
  });

  User.findById(submission.painterId, 'name').lean().then((painterDoc) => {
    notify.emit('submission.reject', {
      actorId: ctx.user!.userId,
      recipientId: submission.painterId.toString(),
      data: {
        code: submission.photoNo,
        reason: rejectionReason,
        painterName: (painterDoc as { name?: string } | null)?.name,
      },
    }).catch(() => {});
  }).catch(() => {});

  return ok({ message: 'Submission rejected successfully' });
});
