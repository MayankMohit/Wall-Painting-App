import { wrapEmail, h2, p, small, badge, divider } from './_base';

export function renderAuthPasswordChangedEmail(data: {
  name: string;
  device?: string;
}): { subject: string; html: string } {
  const { name, device } = data;

  const body = `
    ${badge('Security notice', 'blue')}
    ${h2('Password changed')}
    ${p(`Hi ${name},`)}
    ${p(`Your Wallo account password was successfully updated${device ? ` on <strong>${device}</strong>` : ''}.`)}
    ${divider}
    ${small('If you made this change, you\'re all set. If you did <strong>not</strong> change your password, please reset it immediately and contact support.')}
  `;

  return {
    subject: 'Your Wallo password was changed',
    html: wrapEmail(body, `Password changed${device ? ` on ${device}` : ''}`),
  };
}
