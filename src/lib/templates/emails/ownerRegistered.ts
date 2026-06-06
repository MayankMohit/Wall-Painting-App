import { wrapEmail, h2, p, small, btn, badge, dataTable } from './_base';

export function renderOwnerRegisteredEmail(data: {
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  approvalUrl?: string;
}): { subject: string; html: string } {
  const { ownerName, ownerEmail, ownerPhone, approvalUrl } = data;

  const rows: Array<[string, string]> = [
    ['Name', ownerName],
    ['Email', ownerEmail],
    ...(ownerPhone ? [['Phone', ownerPhone] as [string, string]] : []),
  ];

  const body = `
    ${badge('Action required', 'orange')}
    ${h2('New owner registration')}
    ${p('A new business owner has registered and is awaiting your approval.')}
    ${dataTable(...rows)}
    ${approvalUrl ? btn('Review in Dashboard', approvalUrl) : ''}
    ${small('Log in to the admin dashboard to approve or reject this registration.')}
  `;

  return {
    subject: `New owner registration: ${ownerName}`,
    html: wrapEmail(body, `${ownerName} (${ownerEmail}) is awaiting approval`),
  };
}
