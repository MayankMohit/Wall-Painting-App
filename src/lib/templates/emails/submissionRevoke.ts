import { wrapEmail, h2, p, small, btn, box, boxLabel, boxText, badge } from './_base';

export function renderSubmissionRevokeEmail(data: {
  painterName: string;
  note?: string;
  code: string | number;
  jobUrl?: string;
}): { subject: string; html: string } {
  const { painterName, note, code, jobUrl } = data;

  const body = `
    ${badge('Approval revoked', 'red')}
    ${h2(`Submission #${code} revoked`)}
    ${p(`Hi ${painterName},`)}
    ${p(`Your previously approved submission <strong>#${code}</strong> has been revoked by the job owner and returned to pending status.`)}
    ${note ? box(`
      ${boxLabel('Note from owner')}
      ${boxText(note)}
    `) : ''}
    ${p('Please upload better quality photos and resubmit when ready.')}
    ${jobUrl ? btn('Resubmit Photos', jobUrl) : ''}
  `;

  return {
    subject: `Submission #${code} revoked — please re-upload`,
    html: wrapEmail(body, `#${code} revoked — please add better photos`),
  };
}
