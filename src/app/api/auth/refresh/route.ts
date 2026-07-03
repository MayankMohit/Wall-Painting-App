import { signToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';

export const POST = withAuth({ rateLimit: 'standard' })(
  async (req, ctx) => {
    // Re-check the live account before minting a new token so a revoked token
    // (logout / password change / suspend bumped tokenVersion) can't be refreshed
    // into a fresh one (M-3).
    await connectDB();
    const user = await User.findById(ctx.user!.userId).select('role name status tokenVersion readOnly').lean();
    if (!user || user.status !== 'active') {
      return ctx.fail(401, ErrorCodes.NOT_AUTHORIZED, 'Session expired — please sign in again');
    }
    if ((ctx.user!.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return ctx.fail(401, ErrorCodes.NOT_AUTHORIZED, 'Session expired — please sign in again');
    }

    const token = signToken({ userId: ctx.user!.userId, role: user.role, name: user.name, tokenVersion: user.tokenVersion, readOnly: user.readOnly || undefined });
    return Response.json({ data: { token } });
  }
);
