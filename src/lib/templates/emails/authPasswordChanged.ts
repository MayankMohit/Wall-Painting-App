import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderAuthPasswordChangedEmail(data: {
  name: string;
  device?: string;
}): { subject: string; html: string } {
  const { name, device } = data;
  const body = `
    <h2>Your password was changed</h2>
    <p>Hi ${name},</p>
    <p>Your Wall Painter account password was successfully changed${device ? ` from <strong>${device}</strong>` : ''}.</p>
    <p class="meta">If you made this change, no action is needed. If you did not change your password, please reset it immediately and contact support.</p>
  `;
  return {
    subject: 'Your Wall Painter password was changed',
    html: wrapEmail(body, `Password changed${device ? ` on ${device}` : ''}`),
  };
}
