import { notFound } from 'next/navigation';
import { PreviewClient } from './PreviewClient';
import { renderAuthNewDeviceEmail } from '@/lib/templates/emails/authNewDevice';
import { renderAuthPasswordChangedEmail } from '@/lib/templates/emails/authPasswordChanged';
import { renderAuthPasswordResetEmail } from '@/lib/templates/emails/authPasswordReset';
import { renderJobCreatedEmail } from '@/lib/templates/emails/jobCreated';
import { renderSubmissionRejectEmail } from '@/lib/templates/emails/submissionReject';
import { renderSubmissionRevokeEmail } from '@/lib/templates/emails/submissionRevoke';
import { renderOwnerRegisteredEmail } from '@/lib/templates/emails/ownerRegistered';
import { renderUserSuspendedEmail } from '@/lib/templates/emails/userSuspended';
import { renderAdminStorageQuotaEmail } from '@/lib/templates/emails/adminStorageQuota';
import { renderFileFailedEmail } from '@/lib/templates/emails/fileFailed';
import {
  wrapEmail, h2, p, small, btn, badge,
  box, boxLabel, boxText, otpDisplay, dataTable, divider,
} from '@/lib/templates/emails/_base';

export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  // ── email.ts inline templates — reproduced with helpers ──────────────────

  const otpRegisterHtml = wrapEmail(`
    ${h2('Verify your email')}
    ${p('Use the code below to complete your Wallo registration.')}
    ${otpDisplay('847291')}
    ${divider}
    ${small("Never share this code with anyone. Wallo will never ask for it. If you didn't request this, you can safely ignore this email.")}
  `, 'Your verification code');

  const otpLoginHtml = wrapEmail(`
    ${h2('Your sign-in code')}
    ${p('Use the code below to sign in to your Wallo account.')}
    ${otpDisplay('319057')}
    ${divider}
    ${small("Never share this code with anyone. Wallo will never ask for it. If you didn't request this, you can safely ignore this email.")}
  `, 'Your sign-in code');

  const passwordResetDirectHtml = wrapEmail(`
    ${h2('Reset your password')}
    ${p('We received a request to reset your Wallo account password. Click the button below to choose a new password.')}
    ${btn('Reset Password', '#')}
    ${divider}
    ${small("This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.")}
  `, 'Reset link valid for 1 hour');

  const ownerApprovedHtml = wrapEmail(`
    ${badge('Account approved', 'green')}
    ${h2("You're approved — welcome!")}
    ${p('Hi Alex,')}
    ${p('Great news! Your Wallo business owner account has been approved. You can now log in and start managing jobs.')}
    ${btn('Sign in to Wallo', '#')}
    ${small('If you have any questions, reach out to our support team.')}
  `, 'Your account is now active');

  const ownerRejectedHtml = wrapEmail(`
    ${badge('Registration not approved', 'red')}
    ${h2('Your account was not approved')}
    ${p('Hi Alex,')}
    ${p('After review, your Wallo business owner account registration was not approved.')}
    ${box(`
      ${boxLabel('Reason', 'red')}
      ${boxText('Unable to verify the business registration details provided during sign-up. Please ensure all information is accurate before reapplying.', 'red')}
    `, 'red')}
    ${divider}
    ${small('If you believe this is a mistake, contact <a href="mailto:admin@wallo.app" style="color:#5c5040;font-weight:600;">admin@wallo.app</a> to appeal.')}
  `, 'Account registration not approved');

  const adminNotifHtml = wrapEmail(`
    ${badge('Action required', 'orange')}
    ${h2('New owner registration')}
    ${p('A new business owner has registered and is awaiting your approval.')}
    ${dataTable(
      ['Name',  'Raj Sharma'],
      ['Email', 'raj@premiumwalls.co'],
      ['Phone', '+91 98765 43210'],
    )}
    ${small('Log in to the admin dashboard to review and approve or reject this registration.')}
  `, 'Raj Sharma is awaiting approval');

  // ── All templates ─────────────────────────────────────────────────────────

  const templates = [
    {
      id: 'otp-register',
      name: 'OTP — Register',
      category: 'Auth',
      subject: 'Verify your email to complete registration',
      html: otpRegisterHtml,
    },
    {
      id: 'otp-login',
      name: 'OTP — Sign in',
      category: 'Auth',
      subject: 'Your Wallo sign-in code',
      html: otpLoginHtml,
    },
    {
      id: 'password-reset',
      name: 'Password reset link',
      category: 'Auth',
      subject: 'Reset your Wallo password',
      html: passwordResetDirectHtml,
    },
    {
      id: 'password-reset-template',
      name: 'Password reset (named)',
      category: 'Auth',
      subject: 'Reset your Wallo password',
      html: renderAuthPasswordResetEmail({ name: 'Alex Martinez', resetUrl: '#' }).html,
    },
    {
      id: 'password-changed',
      name: 'Password changed',
      category: 'Auth',
      subject: 'Your Wallo password was changed',
      html: renderAuthPasswordChangedEmail({ name: 'Alex Martinez', device: 'iPhone 14 Pro · Safari' }).html,
    },
    {
      id: 'new-device',
      name: 'New device sign-in',
      category: 'Auth',
      subject: 'New sign-in to your Wallo account',
      html: renderAuthNewDeviceEmail({ name: 'Alex Martinez', device: 'iPhone 14 Pro · Safari', city: 'Mumbai' }).html,
    },
    {
      id: 'owner-approved',
      name: 'Owner approved',
      category: 'Account',
      subject: 'Your Wallo account has been approved',
      html: ownerApprovedHtml,
    },
    {
      id: 'owner-rejected',
      name: 'Owner rejected',
      category: 'Account',
      subject: 'Your Wallo account registration was not approved',
      html: ownerRejectedHtml,
    },
    {
      id: 'user-suspended',
      name: 'Account suspended',
      category: 'Account',
      subject: 'Your Wallo account has been suspended',
      html: renderUserSuspendedEmail({
        name: 'Alex Martinez',
        reason: 'Multiple policy violations detected in submission history.',
        adminContact: 'admin@wallo.app',
      }).html,
    },
    {
      id: 'owner-registered',
      name: 'New owner (admin)',
      category: 'Admin',
      subject: 'New owner registration: Raj Sharma',
      html: adminNotifHtml,
    },
    {
      id: 'owner-registered-template',
      name: 'New owner (template)',
      category: 'Admin',
      subject: 'New owner registration: Raj Sharma',
      html: renderOwnerRegisteredEmail({
        ownerName: 'Raj Sharma',
        ownerEmail: 'raj@premiumwalls.co',
        ownerPhone: '+91 98765 43210',
        approvalUrl: '#',
      }).html,
    },
    {
      id: 'storage-quota',
      name: 'Storage quota alert',
      category: 'Admin',
      subject: 'Storage quota alert: Cloudflare R2 (87% used)',
      html: renderAdminStorageQuotaEmail({ service: 'Cloudflare R2', usagePercent: 87 }).html,
    },
    {
      id: 'job-created',
      name: 'Job assigned',
      category: 'Jobs',
      subject: 'You\'ve been added to "Premium Walls Co."',
      html: renderJobCreatedEmail({
        painterName: 'Alex Martinez',
        companyName: 'Premium Walls Co.',
        jobUrl: '#',
      }).html,
    },
    {
      id: 'submission-reject',
      name: 'Submission rejected',
      category: 'Jobs',
      subject: 'Submission #2847 needs revision',
      html: renderSubmissionRejectEmail({
        painterName: 'Alex Martinez',
        reason: 'The surface preparation looks incomplete. Please ensure all gaps are filled and the texture is smooth before repainting.',
        code: 2847,
        jobUrl: '#',
      }).html,
    },
    {
      id: 'submission-revoke',
      name: 'Submission revoked',
      category: 'Jobs',
      subject: 'Submission #2847 revoked — please re-upload',
      html: renderSubmissionRevokeEmail({
        painterName: 'Alex Martinez',
        note: 'Client requested higher resolution photos for the final report. Please re-upload at full quality.',
        code: 2847,
        jobUrl: '#',
      }).html,
    },
    {
      id: 'file-failed',
      name: 'Export failed',
      category: 'Jobs',
      subject: 'Export failed for "Premium Walls Co."',
      html: renderFileFailedEmail({
        ownerName: 'Raj Sharma',
        type: 'PDF Report',
        companyName: 'Premium Walls Co.',
      }).html,
    },
  ];

  return <PreviewClient templates={templates} />;
}
