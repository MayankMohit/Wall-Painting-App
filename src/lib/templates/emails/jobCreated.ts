import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderJobCreatedEmail(data: {
  painterName: string;
  companyName: string;
  jobUrl?: string;
}): { subject: string; html: string } {
  const { painterName, companyName, jobUrl } = data;
  const body = `
    <h2>You've been added to a job</h2>
    <p>Hi ${painterName},</p>
    <p>You have been added to the job <strong>"${companyName}"</strong>. You can now start submitting photos for this job.</p>
    ${jobUrl ? `<p><a href="${jobUrl}" class="button">View Job</a></p>` : ''}
  `;
  return {
    subject: `You've been added to "${companyName}"`,
    html: wrapEmail(body, `Added to "${companyName}"`),
  };
}
