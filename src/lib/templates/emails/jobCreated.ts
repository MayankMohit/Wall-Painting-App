import { wrapEmail, h2, p, small, btn, badge } from './_base';

export function renderJobCreatedEmail(data: {
  painterName: string;
  companyName: string;
  jobUrl?: string;
}): { subject: string; html: string } {
  const { painterName, companyName, jobUrl } = data;

  const body = `
    ${badge('New assignment', 'green')}
    ${h2('You\'ve been added to a job')}
    ${p(`Hi ${painterName},`)}
    ${p(`You have been added to the job <strong>&ldquo;${companyName}&rdquo;</strong>. You can now start submitting photos for review.`)}
    ${jobUrl ? btn('View Job', jobUrl) : ''}
    ${small('Log in to Wallo to see your assignment details and start uploading work.')}
  `;

  return {
    subject: `You've been added to "${companyName}"`,
    html: wrapEmail(body, `Added to "${companyName}"`),
  };
}
