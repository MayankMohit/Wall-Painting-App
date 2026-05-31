import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderOwnerRegisteredEmail(data: {
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  approvalUrl?: string;
}): { subject: string; html: string } {
  const { ownerName, ownerEmail, ownerPhone, approvalUrl } = data;
  const body = `
    <h2>New owner registration pending approval</h2>
    <p>A new owner account is awaiting your approval:</p>
    <ul style="padding-left:20px;margin:12px 0;">
      <li><strong>Name:</strong> ${ownerName}</li>
      <li><strong>Email:</strong> ${ownerEmail}</li>
      ${ownerPhone ? `<li><strong>Phone:</strong> ${ownerPhone}</li>` : ''}
    </ul>
    ${approvalUrl ? `<p><a href="${approvalUrl}" class="button">Review in Dashboard</a></p>` : ''}
  `;
  return {
    subject: `New owner registration: ${ownerName}`,
    html: wrapEmail(body, `${ownerName} (${ownerEmail}) is awaiting approval`),
  };
}
