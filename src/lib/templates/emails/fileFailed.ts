import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderFileFailedEmail(data: {
  ownerName: string;
  type: string;
  companyName: string;
}): { subject: string; html: string } {
  const { ownerName, type, companyName } = data;
  const body = `
    <h2>Export failed</h2>
    <p>Hi ${ownerName},</p>
    <p>The <strong>${type}</strong> export for job <strong>"${companyName}"</strong> encountered an error and could not be completed.</p>
    <p>Our admin team has been notified. You can retry the export from your dashboard once the issue is resolved.</p>
    <p class="meta">If this problem persists, please contact support.</p>
  `;
  return {
    subject: `Export failed for "${companyName}"`,
    html: wrapEmail(body, `${type} export errored — admin notified`),
  };
}
