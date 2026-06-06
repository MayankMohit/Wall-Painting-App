const FF = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
const MONO = `'Courier New', Courier, 'Lucida Console', monospace`;

export function wrapEmail(body: string, previewText?: string): string {
  const preview = previewText
    ? `<div aria-hidden="true" style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f3efe9;">${previewText} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Wallo</title>
<style>
body{margin:0;padding:0;background:#f3efe9;}
@media only screen and (max-width:600px){
  .ew{padding:0 !important;}
  .eh,.ef{border-radius:0 !important;}
  .eb{padding:28px 20px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:#f3efe9;">
${preview}
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f3efe9;width:100%;">
<tr><td align="center" class="ew" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;max-width:560px;">

  <tr><td class="eh" style="background:#231e14;padding:22px 32px;border-radius:12px 12px 0 0;">
    <span style="font-size:20px;font-weight:700;letter-spacing:-0.025em;color:#fff;font-family:${FF};line-height:1;">Wallo<span style="color:#d97b3a;">.</span></span>
  </td></tr>

  <tr><td class="eb" style="background:#fff;padding:36px 32px;border-left:1px solid #e8e2d8;border-right:1px solid #e8e2d8;">
    ${body}
  </td></tr>

  <tr><td class="ef" style="background:#f9f7f4;padding:16px 32px;border:1px solid #e8e2d8;border-top:none;border-radius:0 0 12px 12px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#9a8e80;font-family:${FF};">This is an automated message from <strong style="color:#7a6e60;font-weight:600;">Wallo</strong>. Please do not reply.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function h2(text: string): string {
  return `<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:-0.025em;color:#231e14;line-height:1.2;font-family:${FF};">${text}</h2>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#5c5040;line-height:1.65;font-family:${FF};">${text}</p>`;
}

export function small(text: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;color:#9a8e80;line-height:1.55;font-family:${FF};">${text}</p>`;
}

export function btn(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:8px 0 20px;"><tr><td style="border-radius:8px;background:#d97b3a;"><a href="${url}" style="display:inline-block;padding:13px 26px;background:#d97b3a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:-0.01em;font-family:${FF};">${text} →</a></td></tr></table>`;
}

export const divider = `<hr style="border:none;border-top:1px solid #e8e2d8;margin:24px 0;" />`;

export function badge(text: string, variant: 'red' | 'green' | 'orange' | 'blue' | 'gray' = 'gray'): string {
  const v = {
    red:    { bg: '#f5ebe8', color: '#b84231', border: '#e0bbb5' },
    green:  { bg: '#e8f5ee', color: '#2d7a4e', border: '#a8d4bc' },
    orange: { bg: '#fdf1e7', color: '#b56028', border: '#f0c99a' },
    blue:   { bg: '#e8f0f8', color: '#3a6fa3', border: '#b0c8e8' },
    gray:   { bg: '#f0ebe3', color: '#7a6555', border: '#ddd5c8' },
  }[variant];
  return `<div style="margin-bottom:18px;"><span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${v.color};background:${v.bg};border:1px solid ${v.border};padding:3px 10px;border-radius:999px;font-family:${FF};">${text}</span></div>`;
}

export function box(content: string, variant: 'neutral' | 'red' | 'green' | 'orange' | 'blue' = 'neutral'): string {
  const v = {
    neutral: { bg: '#f9f7f4', border: '#e8e2d8', left: '#d0c8bc' },
    red:     { bg: '#f5ebe8', border: '#e0bbb5', left: '#b84231' },
    green:   { bg: '#e8f5ee', border: '#a8d4bc', left: '#2d7a4e' },
    orange:  { bg: '#fdf1e7', border: '#f0c99a', left: '#d97b3a' },
    blue:    { bg: '#e8f0f8', border: '#b0c8e8', left: '#3a6fa3' },
  }[variant];
  return `<div style="background:${v.bg};border:1px solid ${v.border};border-left:3px solid ${v.left};border-radius:0 8px 8px 0;padding:14px 16px;margin:20px 0;">${content}</div>`;
}

export function boxLabel(text: string, variant: 'neutral' | 'red' | 'green' | 'orange' | 'blue' = 'neutral'): string {
  const color = { neutral: '#7a6e60', red: '#9a4030', green: '#2d7a4e', orange: '#9a6030', blue: '#3a6fa3' }[variant];
  return `<p style="margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${color};font-family:${FF};">${text}</p>`;
}

export function boxText(text: string, variant: 'neutral' | 'red' = 'neutral'): string {
  const color = { neutral: '#3d3628', red: '#5a1f14' }[variant];
  return `<p style="margin:0;font-size:14px;color:${color};line-height:1.65;font-family:${FF};">${text}</p>`;
}

export function otpDisplay(code: string): string {
  return `<div style="text-align:center;margin:28px 0 24px;">
  <div style="display:inline-block;background:#f9f7f4;border:1.5px solid #e8e2d8;border-radius:10px;padding:18px 32px;">
    <span style="font-size:36px;font-weight:700;letter-spacing:.3em;color:#231e14;font-family:${MONO};line-height:1;">${code}</span>
  </div>
  <p style="margin:12px 0 0;font-size:13px;color:#9a8e80;font-family:${FF};">Expires in 10 minutes</p>
</div>`;
}

export function dataTable(...rows: Array<[string, string]>): string {
  const rowHtml = rows.map(([label, value], i) => {
    const last = i === rows.length - 1;
    const bb = last ? '' : 'border-bottom:1px solid #e8e2d8;';
    return `<tr><td style="padding:11px 14px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a8e80;white-space:nowrap;${bb}font-family:${FF};">${label}</td><td style="padding:11px 14px;font-size:14px;color:#231e14;${bb}font-family:${FF};">${value}</td></tr>`;
  }).join('');
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;border:1px solid #e8e2d8;border-radius:8px;overflow:hidden;margin:16px 0 20px;">${rowHtml}</table>`;
}
