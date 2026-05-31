export function wrapEmail(body: string, previewText?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${previewText ? `<meta name="description" content="${previewText}" />` : ''}
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .header { background: #1e293b; padding: 24px 32px; }
    .header h1 { margin: 0; color: #f8fafc; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
    .body { padding: 32px; color: #334155; line-height: 1.6; font-size: 15px; }
    .body h2 { margin: 0 0 16px; font-size: 20px; color: #0f172a; font-weight: 600; }
    .body p { margin: 0 0 16px; }
    .body p:last-child { margin-bottom: 0; }
    .button { display: inline-block; padding: 10px 22px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; margin: 8px 0; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .meta { font-size: 13px; color: #64748b; }
    .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Wall Painter</h1></div>
    <div class="body">${body}</div>
    <div class="footer">This is an automated notification from Wall Painter. Please do not reply to this email.</div>
  </div>
</body>
</html>`;
}
