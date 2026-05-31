import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderAuthPasswordResetEmail(data: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const { name, resetUrl } = data;
  const body = `
    <h2>Reset your password</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your Wall Painter account password. Click the button below to choose a new password.</p>
    <p><a href="${resetUrl}" class="button">Reset Password</a></p>
    <hr class="divider" />
    <p class="meta">This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
  `;
  return {
    subject: 'Reset your Wall Painter password',
    html: wrapEmail(body, 'Reset link valid for 1 hour'),
  };
}
