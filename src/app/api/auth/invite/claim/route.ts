import { connectDB } from '@/lib/db';
import { Invite, User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { signToken } from '@/lib/auth';
import { InviteClaimSchema } from '@/lib/validators';
import { withMiddleware } from '@/lib/middleware';
import { hashInviteToken } from '@/lib/invite';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type InviteClaimBody = z.infer<typeof InviteClaimSchema>;

const INVALID_MSG = 'This invite link is no longer valid. Ask your contractor to send a new link.';

// POST — public. The painter taps /join/<token>; the page POSTs the raw token here
// to log in. Multi-use until expiry/revocation. Rate-limited by IP.
export const POST = withMiddleware({ rateLimit: 'strict', schema: InviteClaimSchema, audit: 'AUTH_LOGIN_INVITE' })(
  async (req, ctx) => {
    const { token } = ctx.body as InviteClaimBody;

    await connectDB();

    const invite = await Invite.findOne({ tokenHash: hashInviteToken(token) });
    if (!invite || invite.status !== 'active') return ctx.fail(410, ErrorCodes.INVITE_INVALID, INVALID_MSG);
    if (invite.expiresAt.getTime() <= Date.now()) return ctx.fail(410, ErrorCodes.INVITE_EXPIRED, INVALID_MSG);

    const painter = await User.findById(invite.painterId);
    if (!painter || painter.role !== 'painter') return ctx.fail(410, ErrorCodes.INVITE_INVALID, INVALID_MSG);
    if (painter.status === 'suspended') {
      return ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, `Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`);
    }

    invite.lastUsedAt = new Date();
    await invite.save();

    const authToken = signToken({ userId: painter._id.toString(), role: painter.role, name: painter.name, tokenVersion: painter.tokenVersion });
    ctx.setAudit('AUTH_LOGIN_INVITE', undefined, { userId: painter._id.toString(), role: painter.role });

    return ok({
      token: authToken,
      user: {
        id:            painter._id,
        email:         painter.email ?? null,
        name:          painter.name,
        role:          painter.role,
        phone:         painter.phone,
        emailVerified: painter.emailVerified,
        status:        painter.status,
      },
      jobId: invite.jobId.toString(),
    });
  }
);
