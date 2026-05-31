import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderSubmissionRejectEmail(data: {
  painterName: string;
  reason: string;
  code: string | number;
  jobUrl?: string;
}): { subject: string; html: string } {
  const { painterName, reason, code, jobUrl } = data;
  const body = `
    <h2>Submission #${code} needs revision</h2>
    <p>Hi ${painterName},</p>
    <p>Your submission <strong>#${code}</strong> has been rejected by the job owner.</p>
    <hr class="divider" />
    <p class="meta"><strong>Reason:</strong></p>
    <p>${reason}</p>
    ${jobUrl ? `<p><a href="${jobUrl}" class="button">View Submission</a></p>` : ''}
    <p class="meta">You can edit your submission and resubmit at any time.</p>
  `;
  return {
    subject: `Submission #${code} needs revision`,
    html: wrapEmail(body, `#${code} needs revision — ${reason}`),
  };
}
