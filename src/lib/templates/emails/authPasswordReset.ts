import { wrapEmail, h2, p, small, btn, divider } from './_base';

export function renderAuthPasswordResetEmail(data: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const { name, resetUrl } = data;

  const body = `
    ${h2('Reset your password')}
    ${p(`Hi ${name},`)}
    ${p('We received a request to reset your Wallo account password. Click the button below to choose a new password.')}
    ${btn('Reset Password', resetUrl)}
    ${divider}
    ${small('This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.')}
  `;

  return {
    subject: 'Reset your Wallo password',
    html: wrapEmail(body, 'Reset link valid for 1 hour'),
  };
}
