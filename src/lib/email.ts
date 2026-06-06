import { Resend } from 'resend';
import { wrapEmail, h2, p, small, btn, badge, box, boxLabel, boxText, otpDisplay, dataTable, divider } from '@/lib/templates/emails/_base';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL!;

const OTP_SUBJECTS: Record<string, string> = {
  register:       'Verify your email to complete registration',
  verify:         'Verify your email address',
  'change-email': 'Confirm your new email address',
  login:          'Your Wallo sign-in code',
};

const OTP_HEADINGS: Record<string, string> = {
  register:       'Verify your email',
  verify:         'Verify your email',
  'change-email': 'Confirm your new email',
  login:          'Your sign-in code',
};

const OTP_COPY: Record<string, string> = {
  register:       'Use the code below to complete your Wallo registration.',
  verify:         'Use the code below to verify your email address.',
  'change-email': 'Use the code below to confirm your new email address.',
  login:          'Use the code below to sign in to your Wallo account.',
};

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: 'register' | 'verify' | 'change-email' | 'login'
): Promise<void> {
  const body = `
    ${h2(OTP_HEADINGS[purpose])}
    ${p(OTP_COPY[purpose])}
    ${otpDisplay(otp)}
    ${divider}
    ${small('Never share this code with anyone. Wallo will never ask for it. If you didn\'t request this, you can safely ignore this email.')}
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: OTP_SUBJECTS[purpose],
    html: wrapEmail(body, `Your ${purpose === 'login' ? 'sign-in' : 'verification'} code`),
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const body = `
    ${h2('Reset your password')}
    ${p('We received a request to reset your Wallo account password. Click the button below to choose a new password.')}
    ${btn('Reset Password', resetUrl)}
    ${divider}
    ${small('This link expires in <strong>1 hour</strong>. If you didn\'t request this, you can safely ignore this email.')}
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Wallo password',
    html: wrapEmail(body, 'Reset link valid for 1 hour'),
    text: `Reset your password: ${resetUrl} — link expires in 1 hour.`,
  });
}

export async function sendOwnerApprovedEmail(to: string, name: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wallo.app';
  const body = `
    ${badge('Account approved', 'green')}
    ${h2('You\'re approved — welcome!')}
    ${p(`Hi ${name},`)}
    ${p('Great news! Your Wallo business owner account has been approved. You can now log in and start managing jobs.')}
    ${btn('Sign in to Wallo', `${appUrl}/login`)}
    ${small('If you have any questions, reach out to our support team.')}
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Wallo account has been approved',
    html: wrapEmail(body, 'Your account is now active'),
    text: `Hi ${name}, your owner account has been approved. You can now log in.`,
  });
}

export async function sendOwnerRejectedEmail(
  to: string,
  name: string,
  adminContact: string,
  reason?: string
): Promise<void> {
  const body = `
    ${badge('Registration not approved', 'red')}
    ${h2('Your account was not approved')}
    ${p(`Hi ${name},`)}
    ${p('After review, your Wallo business owner account registration was not approved.')}
    ${reason ? box(`
      ${boxLabel('Reason', 'red')}
      ${boxText(reason, 'red')}
    `, 'red') : ''}
    ${divider}
    ${small(`If you believe this is a mistake, contact <a href="mailto:${adminContact}" style="color:#5c5040;font-weight:600;">${adminContact}</a> to appeal.`)}
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Wallo account registration was not approved',
    html: wrapEmail(body, 'Account registration not approved'),
    text: `Hi ${name}, your owner account registration was rejected.${reason ? ` Reason: ${reason}.` : ''} Contact ${adminContact} to appeal.`,
  });
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  await resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendAdminNewOwnerNotification(
  to: string,
  owner: { name: string; email: string; phone: string }
): Promise<void> {
  const body = `
    ${badge('Action required', 'orange')}
    ${h2('New owner registration')}
    ${p('A new business owner has registered and is awaiting your approval.')}
    ${dataTable(
      ['Name',  owner.name],
      ['Email', owner.email],
      ['Phone', owner.phone],
    )}
    ${small('Log in to the admin dashboard to review and approve or reject this registration.')}
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'New owner registration pending approval',
    html: wrapEmail(body, `${owner.name} is awaiting approval`),
    text: `New owner pending approval — Name: ${owner.name}, Email: ${owner.email}, Phone: ${owner.phone}`,
  });
}
