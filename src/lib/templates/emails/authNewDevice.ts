import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderAuthNewDeviceEmail(data: {
  name: string;
  device: string;
  city?: string;
}): { subject: string; html: string } {
  const { name, device, city } = data;
  const location = city ? ` from <strong>${city}</strong>` : '';
  const body = `
    <h2>New sign-in detected</h2>
    <p>Hi ${name},</p>
    <p>We noticed a sign-in to your Wall Painter account from a new device:</p>
    <p><strong>${device}</strong>${location}</p>
    <hr class="divider" />
    <p class="meta">If this was you, no action is needed. If you don't recognise this sign-in, please change your password immediately.</p>
  `;
  return {
    subject: 'New sign-in to your Wall Painter account',
    html: wrapEmail(body, `Sign-in from ${device}${city ? ` · ${city}` : ''}`),
  };
}
