import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

// JWTs are stateless (no server-side revocation), so the token's role/userId alone
// can't reflect an account suspended *after* the token was issued. This re-checks
// live account status per request — use it on sensitive write actions so a
// suspended/inactive user can't keep acting until their token expires.
export const requireActiveAccount: AccessCheck = async (req, ctx) => {
  await connectDB();
  const user = await User.findById(ctx.user!.userId).select('status').lean();

  if (!user) throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Account not found');

  if (user.status === 'suspended') {
    throw new HttpError(
      403,
      ErrorCodes.ACCOUNT_DISABLED,
      `Your account has been suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL ?? 'support'} if you think this is a mistake.`,
    );
  }
  if (user.status !== 'active') {
    throw new HttpError(403, ErrorCodes.ACCOUNT_DISABLED, 'Your account is not active.');
  }
};
