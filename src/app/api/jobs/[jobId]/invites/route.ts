import { connectDB } from '@/lib/db';
import { Invite, User } from '@/lib/models';
import { ok, created } from '@/lib/api-response';
import { InvitePainterSchema } from '@/lib/validators';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';
import { ErrorCodes } from '@/lib/errors';
import { generateInviteToken, inviteExpiry, buildInviteLinks, expiryLabel } from '@/lib/invite';
import type { z } from 'zod';

type InviteBody = z.infer<typeof InvitePainterSchema>;

// GET — invites for this job. Active ones include the rebuilt share link/message so the
// owner can Share/Copy at any time (the raw token is stored for exactly this).
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (req, ctx) => {
    await connectDB();
    const job = ctx.job!;

    const [owner, invites] = await Promise.all([
      User.findById(job.ownerId).select('name').lean(),
      Invite.find({ jobId: job._id }).select('painterId status expiresAt lastUsedAt token').lean(),
    ]);

    const painterIds = invites.map((iv) => iv.painterId);
    const painters = await User.find({ _id: { $in: painterIds } }).select('name phone').lean();
    const pMap = new Map(painters.map((p) => [p._id.toString(), p]));

    const result = invites.map((iv) => {
      const painterId = iv.painterId.toString();
      const base = {
        _id:        iv._id.toString(),
        painterId,
        status:     iv.status,
        expiresAt:  iv.expiresAt,
        lastUsedAt: iv.lastUsedAt,
      };
      const painter = pMap.get(painterId);
      if (iv.status === 'active' && iv.token && painter) {
        const links = buildInviteLinks({
          token:        iv.token,
          painterName:  painter.name,
          ownerName:    owner?.name ?? 'Your contractor',
          companyName:  job.companyName,
          painterPhone: painter.phone,
        });
        return { ...base, ...links, expiresLabel: expiryLabel(iv.expiresAt) };
      }
      return base;
    });

    return ok(result);
  }
);

// POST — create (or regenerate) an invite link for a painter already on the job.
// Any prior active invite for the same (job, painter) is revoked first.
export const POST = withRole(['owner', 'admin'], { schema: InvitePainterSchema, access: requireJobOwner, audit: 'INVITE_CREATED' })(
  async (req, ctx) => {
    const { painterId } = ctx.body as InviteBody;
    const job = ctx.job!;

    await connectDB();

    if (!job.painters.some((p) => p.toString() === painterId)) {
      ctx.fail(400, ErrorCodes.NOT_ASSIGNED_TO_JOB, 'Add the painter to this job before sharing a link');
    }

    const painter = await User.findOne({ _id: painterId, role: 'painter' }).select('name phone');
    if (!painter) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'Painter not found');

    await Invite.updateMany({ jobId: job._id, painterId, status: 'active' }, { status: 'revoked' });

    const { token, tokenHash } = generateInviteToken();
    const expiresAt = inviteExpiry();
    await Invite.create({
      token, tokenHash, painterId, jobId: job._id, ownerId: job.ownerId, status: 'active', expiresAt, lastUsedAt: null,
    });

    const owner = await User.findById(ctx.user!.userId).select('name');
    const { url, waLink, message } = buildInviteLinks({
      token,
      painterName: painter.name,
      ownerName:   owner?.name ?? 'Your contractor',
      companyName: job.companyName,
      painterPhone: painter.phone,
    });

    ctx.setAudit('INVITE_CREATED', { type: 'Job', id: job._id.toString() }, { painterId, companyName: job.companyName });

    return created({ url, waLink, message, expiresAt, expiresLabel: expiryLabel(expiresAt) });
  }
);

// DELETE — revoke the active invite(s) for a painter on this job.
export const DELETE = withRole(['owner', 'admin'], { schema: InvitePainterSchema, access: requireJobOwner, audit: 'INVITE_REVOKED' })(
  async (req, ctx) => {
    const { painterId } = ctx.body as InviteBody;
    const job = ctx.job!;

    await connectDB();
    const res = await Invite.updateMany({ jobId: job._id, painterId, status: 'active' }, { status: 'revoked' });

    ctx.setAudit('INVITE_REVOKED', { type: 'Job', id: job._id.toString() }, { painterId });

    return ok({ revoked: res.modifiedCount });
  }
);
