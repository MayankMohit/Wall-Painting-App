import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Photo } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { RevokeSubmissionSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { requireSubmissionAccess } from '@/lib/middleware/requireSubmissionAccess';
import type { z } from 'zod';

// PUT — Revoke an approved submission back to pending. Clears watermark data from all linked
//       photos. Sequential numbers already minted are not reclaimed. Owner/admin only.
export const PUT = withRole(['owner', 'admin'], {
  schema: RevokeSubmissionSchema,
  access: requireSubmissionAccess,
  audit : 'SUBMISSION_REVOKE',
})(async (req, ctx) => {
  const { revokeNote } = ctx.body as z.infer<typeof RevokeSubmissionSchema>;
  const submission = ctx.submission!;

  if (submission.status !== 'approved') {
    ctx.fail(400, 'NOT_APPROVED', 'Only approved submissions can be revoked');
  }

  await connectDB();

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    await Photo.updateMany(
      { _id: { $in: submission.images } },
      { $set: { generatedNumber: null, watermarkedUrl: null } },
      { session }
    );

    submission.status    = 'pending';
    submission.revokedAt = new Date();
    if (revokeNote !== undefined) submission.revokeNote = revokeNote;
    await submission.save({ session });

    await session.commitTransaction();

  } catch (e) {
    if (session) await session.abortTransaction().catch(() => {});
    throw e;
  } finally {
    if (session) await session.endSession();
  }

  return ok({ message: 'Approval revoked. Submission is now pending' });
});
