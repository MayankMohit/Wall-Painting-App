import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL!;

const OTP_SUBJECTS: Record<string, string> = {
  register: 'Verify your email to complete registration',
  verify: 'Verify your email address',
  'change-email': 'Confirm your new email address',
  login: 'Your login OTP',
};

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: 'register' | 'verify' | 'change-email' | 'login'
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: OTP_SUBJECTS[purpose],
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your password',
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a> — link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`,
    text: `Reset your password: ${resetUrl} — link expires in 1 hour.`,
  });
}

export async function sendOwnerApprovedEmail(to: string, name: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your account has been approved',
    html: `<p>Hi ${name}, your owner account has been approved. You can now log in.</p>`,
    text: `Hi ${name}, your owner account has been approved. You can now log in.`,
  });
}

export async function sendOwnerRejectedEmail(
  to: string,
  name: string,
  adminContact: string,
  reason?: string
): Promise<void> {
  const reasonText = reason ? `<p>Reason: ${reason}</p>` : '';
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your account registration was rejected',
    html: `<p>Hi ${name}, your owner account registration was rejected.</p>${reasonText}<p>If you think this is a mistake, contact <a href="mailto:${adminContact}">${adminContact}</a>.</p>`,
    text: `Hi ${name}, your owner account registration was rejected.${reason ? ` Reason: ${reason}.` : ''} Contact ${adminContact} to appeal.`,
  });
}

export async function sendAdminNewOwnerNotification(
  to: string,
  owner: { name: string; email: string; phone: string }
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'New owner registration pending approval',
    html: `<p>A new owner has registered and is pending your approval.</p><ul><li>Name: ${owner.name}</li><li>Email: ${owner.email}</li><li>Phone: ${owner.phone}</li></ul>`,
    text: `New owner pending approval — Name: ${owner.name}, Email: ${owner.email}, Phone: ${owner.phone}`,
  });
}
