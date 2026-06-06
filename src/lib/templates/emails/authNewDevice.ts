import { wrapEmail, h2, p, small, badge, box, boxLabel, boxText, divider } from './_base';

export function renderAuthNewDeviceEmail(data: {
  name: string;
  device: string;
  city?: string;
}): { subject: string; html: string } {
  const { name, device, city } = data;

  const body = `
    ${badge('Security notice', 'blue')}
    ${h2('New sign-in detected')}
    ${p(`Hi ${name},`)}
    ${p(`We noticed a sign-in to your Wallo account from a new device${city ? ` in <strong>${city}</strong>` : ''}.`)}
    ${box(`
      ${boxLabel('Device', 'neutral')}
      ${boxText(`<strong>${device}</strong>${city ? `<span style="font-weight:400;color:#7a6e60;"> &middot; ${city}</span>` : ''}`, 'neutral')}
    `)}
    ${divider}
    ${small('If this was you, no action is needed. If you don\'t recognise this sign-in, <strong>change your password immediately</strong> to secure your account.')}
  `;

  return {
    subject: 'New sign-in to your Wallo account',
    html: wrapEmail(body, `Sign-in from ${device}${city ? ` · ${city}` : ''}`),
  };
}
