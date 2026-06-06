import { wrapEmail, h2, p, small, box, boxText, badge, divider } from './_base';

export function renderFileFailedEmail(data: {
  ownerName: string;
  type: string;
  companyName: string;
}): { subject: string; html: string } {
  const { ownerName, type, companyName } = data;

  const body = `
    ${badge('Export failed', 'red')}
    ${h2('Export could not be completed')}
    ${p(`Hi ${ownerName},`)}
    ${p(`The <strong>${type}</strong> export for job <strong>&ldquo;${companyName}&rdquo;</strong> encountered an error and could not be completed.`)}
    ${box(`${boxText('Our admin team has been notified automatically. You can retry the export from your dashboard once the issue is resolved.')}`, 'neutral')}
    ${divider}
    ${small('If this problem persists after a few minutes, please contact support.')}
  `;

  return {
    subject: `Export failed for "${companyName}"`,
    html: wrapEmail(body, `${type} export errored — admin notified`),
  };
}
