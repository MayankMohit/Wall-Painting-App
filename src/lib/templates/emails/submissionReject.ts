import { wrapEmail, h2, p, small, btn, box, boxLabel, boxText, badge, divider } from './_base';

export function renderSubmissionRejectEmail(data: {
  painterName: string;
  reason: string;
  code: string | number;
  jobUrl?: string;
}): { subject: string; html: string } {
  const { painterName, reason, code, jobUrl } = data;

  const body = `
    ${badge('Needs revision', 'orange')}
    ${h2(`Submission #${code} needs revision`)}
    ${p(`Hi ${painterName},`)}
    ${p(`Your submission <strong>#${code}</strong> has been rejected by the job owner.`)}
    ${box(`
      ${boxLabel('Reason', 'orange')}
      ${boxText(reason)}
    `, 'orange')}
    ${jobUrl ? btn('View Submission', jobUrl) : ''}
    ${divider}
    ${small('You can edit your submission and resubmit at any time from the Wallo dashboard.')}
  `;

  return {
    subject: `Submission #${code} needs revision`,
    html: wrapEmail(body, `#${code} needs revision — ${reason}`),
  };
}
