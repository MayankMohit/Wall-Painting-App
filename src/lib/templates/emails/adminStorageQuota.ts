import { wrapEmail } from '@/lib/templates/emails/_base';

export function renderAdminStorageQuotaEmail(data: {
  service: string;
  usagePercent?: number;
}): { subject: string; html: string } {
  const { service, usagePercent } = data;
  const usageText = usagePercent != null ? ` (${usagePercent}% used)` : '';
  const body = `
    <h2>Storage quota alert</h2>
    <p><strong>${service}</strong> is approaching its free-tier storage limit${usageText}.</p>
    <p>Please review usage and consider upgrading or cleaning up old files to avoid service interruption.</p>
  `;
  return {
    subject: `Storage quota alert: ${service}${usageText}`,
    html: wrapEmail(body, `${service} approaching free-tier limit`),
  };
}
