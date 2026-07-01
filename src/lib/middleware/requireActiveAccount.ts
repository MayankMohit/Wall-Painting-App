import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

// JWTs are stateless (no built-in revocation), so the token's role/userId alone
// can't reflect an account suspended *after* the token was issued. This re-checks
// live account status per request — use it on sensitive write actions so a
// suspended/inactive user can't keep acting until their token expires.
// It also enforces token revocation (M-3): if the account's tokenVersion has moved
// past the value baked into the JWT (logout / password change / admin suspend), the
// token is rejected. Legacy tokens minted before tokenVersion existed carry undefined,
// treated as 0 so a one-time deploy doesn't force everyone to re-login.
export const requireActiveAccount: AccessCheck = async (req, ctx) => {
  await connectDB();
  const user = await User.findById(ctx.user!.userId).select('status tokenVersion').lean();

  if (!user) throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Account not found');

  if ((ctx.user!.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Session expired — please sign in again');
  }

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
