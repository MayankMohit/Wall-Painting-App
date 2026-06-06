import { wrapEmail, h2, p, small, badge } from './_base';

const FF = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

export function renderAdminStorageQuotaEmail(data: {
  service: string;
  usagePercent?: number;
}): { subject: string; html: string } {
  const { service, usagePercent } = data;
  const usageText = usagePercent != null ? ` (${usagePercent}% used)` : '';

  const barColor = usagePercent == null ? '#d97b3a'
    : usagePercent >= 90 ? '#b84231'
    : usagePercent >= 75 ? '#d97b3a'
    : '#2d7a4e';

  const usageBar = usagePercent != null ? `
    <div style="background:#fdf1e7;border:1px solid #f0c99a;border-left:3px solid #d97b3a;border-radius:0 8px 8px 0;padding:14px 16px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a6030;font-family:${FF};">${service} — Storage usage</p>
      <div style="background:#e8e2d8;border-radius:999px;height:8px;overflow:hidden;">
        <div style="width:${Math.min(usagePercent, 100)}%;height:8px;background:${barColor};border-radius:999px;"></div>
      </div>
      <p style="margin:8px 0 0;font-size:13px;color:#5c5040;font-family:${FF};">${usagePercent}% of free-tier limit used</p>
    </div>` : '';

  const body = `
    ${badge('Storage alert', 'orange')}
    ${h2('Storage quota warning')}
    ${p(`<strong>${service}</strong> is approaching its free-tier storage limit${usageText}.`)}
    ${usageBar}
    ${p('Please review usage and consider upgrading or cleaning up old files to avoid service interruption.')}
    ${small('This is an automated alert triggered when storage usage approaches the free-tier limit.')}
  `;

  return {
    subject: `Storage quota alert: ${service}${usageText}`,
    html: wrapEmail(body, `${service} approaching free-tier limit`),
  };
}
