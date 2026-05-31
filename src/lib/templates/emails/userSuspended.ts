import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderUserSuspendedEmail(data: {
  name: string;
  reason: string;
  adminContact?: string;
}): { subject: string; html: string } {
  const { name, reason, adminContact } = data;
  const contact = adminContact ?? process.env.ADMIN_CONTACT_EMAIL ?? 'support';
  const body = `
    <h2>Your account has been suspended</h2>
    <p>Hi ${name},</p>
    <p>Your Wall Painter account has been suspended by an administrator.</p>
    <hr class="divider" />
    <p class="meta"><strong>Reason:</strong></p>
    <p>${reason}</p>
    <hr class="divider" />
    <p class="meta">If you believe this is a mistake, please contact <a href="mailto:${contact}">${contact}</a>.</p>
  `;
  return {
    subject: 'Your Wall Painter account has been suspended',
    html: wrapEmail(body, `Account suspended — ${reason}`),
  };
}
