import { wrapEmail, h2, p, small, box, boxLabel, boxText, badge, divider } from './_base';

export function renderUserSuspendedEmail(data: {
  name: string;
  reason: string;
  adminContact?: string;
}): { subject: string; html: string } {
  const { name, reason, adminContact } = data;
  const contact = adminContact ?? process.env.ADMIN_CONTACT_EMAIL ?? 'support';

  const body = `
    ${badge('Account suspended', 'red')}
    ${h2('Your account has been suspended')}
    ${p(`Hi ${name},`)}
    ${p('Your Wallo account has been suspended by an administrator.')}
    ${box(`
      ${boxLabel('Reason', 'red')}
      ${boxText(reason, 'red')}
    `, 'red')}
    ${divider}
    ${small(`If you believe this is a mistake, contact <a href="mailto:${contact}" style="color:#5c5040;font-weight:600;">${contact}</a> to appeal.`)}
  `;

  return {
    subject: 'Your Wallo account has been suspended',
    html: wrapEmail(body, `Account suspended — ${reason}`),
  };
}
