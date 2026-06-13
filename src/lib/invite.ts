import crypto from 'crypto';

// Invite link lifetime — env-tunable per §7.3 of the plan, defaults to 30 days.
export const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS) || 30;

/** A ~256-bit URL-safe token plus its SHA-256 hash (only the hash is stored). */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Human "Expires in N days/hours" — computed server-side so the client never has
 *  to call Date.now() in render (which the React Compiler purity rule forbids). */
export function expiryLabel(expiresAt: Date | string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `Expires in ${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.floor(ms / 3_600_000);
  return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`;
}

/** Build the join URL, the prefilled WhatsApp deep link, and the raw message. */
export function buildInviteLinks(opts: {
  token: string;
  painterName: string;
  ownerName: string;
  companyName: string;
  painterPhone?: string;
}): { url: string; waLink: string; message: string } {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const url = `${base}/join/${opts.token}`;
  // Newlines + WhatsApp markdown (*bold*); the URL sits alone on the last line so
  // WhatsApp reliably auto-links it and renders a preview card.
  const message =
    `Hi ${opts.painterName}!\n\n` +
    `${opts.ownerName} added you to *${opts.companyName}* on Wallo.\n\n` +
    `Tap to open your job and upload your work\n` +
    `${url}`;

  // wa.me wants a bare digit string; with no phone, the number-less form lets the
  // owner pick any chat (§7.2).
  const phoneDigits = (opts.painterPhone ?? '').replace(/\D/g, '');
  const waLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return { url, waLink, message };
}
