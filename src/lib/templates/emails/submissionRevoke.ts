import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderSubmissionRevokeEmail(data: {
  painterName: string;
  note?: string;
  code: string | number;
  jobUrl?: string;
}): { subject: string; html: string } {
  const { painterName, note, code, jobUrl } = data;
  const body = `
    <h2>Submission #${code} has been revoked</h2>
    <p>Hi ${painterName},</p>
    <p>Your approved submission <strong>#${code}</strong> has been revoked by the job owner and returned to pending status.</p>
    ${note ? `<hr class="divider" /><p class="meta"><strong>Note from owner:</strong></p><p>${note}</p>` : ''}
    <p>Please upload better photos and resubmit.</p>
    ${jobUrl ? `<p><a href="${jobUrl}" class="button">View Submission</a></p>` : ''}
  `;
  return {
    subject: `Submission #${code} revoked — please re-upload`,
    html: wrapEmail(body, `#${code} revoked — please add better photos`),
  };
}
