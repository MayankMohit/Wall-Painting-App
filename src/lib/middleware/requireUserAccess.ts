import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

// Grants access if: admin, OR the user themselves,
// OR an owner who shares at least one job with the target painter.
export const requireUserAccess: AccessCheck = async (req, ctx) => {
  const { userId: targetId } = ctx.params;
  const { userId, role }     = ctx.user!;

  if (role === 'admin') return;
  if (userId === targetId) return;

  if (role === 'owner') {
    await connectDB();
    const sharedJob = await Job.findOne({ ownerId: userId, painters: targetId }).lean();
    if (sharedJob) return;
    throw new HttpError(403, ErrorCodes.NOT_LINKED, 'This painter is not in any of your jobs');
  }

  throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'You do not have access to this user');
};
