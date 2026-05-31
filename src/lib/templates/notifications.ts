import { renderSubmissionRejectEmail }    from '@/lib/templates/emails/submissionReject';
import { renderSubmissionRevokeEmail }    from '@/lib/templates/emails/submissionRevoke';
import { renderJobCreatedEmail }          from '@/lib/templates/emails/jobCreated';
import { renderFileFailedEmail }          from '@/lib/templates/emails/fileFailed';
import { renderAuthPasswordResetEmail }   from '@/lib/templates/emails/authPasswordReset';
import { renderAuthPasswordChangedEmail } from '@/lib/templates/emails/authPasswordChanged';
import { renderAuthNewDeviceEmail }       from '@/lib/templates/emails/authNewDevice';
import { renderUserSuspendedEmail }       from '@/lib/templates/emails/userSuspended';
import { renderAdminStorageQuotaEmail }   from '@/lib/templates/emails/adminStorageQuota';
import { renderOwnerRegisteredEmail }     from '@/lib/templates/emails/ownerRegistered';

type D = Record<string, unknown>;
type PushTpl  = (data: D) => { title: string; body: string };
type EmailTpl = (data: D) => { subject: string; html: string };
type InAppTpl = (data: D) => { title: string; body: string };

interface EventTemplate {
  push?:  PushTpl;
  email?: EmailTpl;
  inApp?: InAppTpl;
}

export const templates: Record<string, EventTemplate> = {
  'submission.create': {
    push: (d) => ({
      title: 'New submission',
      body:  `${d.painter} submitted #${d.code} · ${d.location}`,
    }),
  },

  'submission.resubmit': {
    push: (d) => ({
      title: 'Submission updated',
      body:  `${d.painter} resubmitted #${d.code} after rejection`,
    }),
  },

  'submission.approve': {
    push: (d) => ({
      title: 'Submission approved',
      body:  `#${d.code} approved — ${d.count} photo(s) selected`,
    }),
  },

  'submission.reject': {
    push:  (d) => ({ title: 'Submission needs revision', body: `#${d.code}: ${d.reason}` }),
    email: (d) => renderSubmissionRejectEmail({
      painterName: String(d.painterName ?? d.painter ?? ''),
      reason:      String(d.reason ?? ''),
      code:        String(d.code ?? ''),
      jobUrl:      d.jobUrl as string | undefined,
    }),
  },

  'submission.revoke': {
    push:  (d) => ({ title: 'Submission revoked', body: `#${d.code} revoked — please re-upload` }),
    email: (d) => renderSubmissionRevokeEmail({
      painterName: String(d.painterName ?? d.painter ?? ''),
      note:        d.note as string | undefined,
      code:        String(d.code ?? ''),
      jobUrl:      d.jobUrl as string | undefined,
    }),
  },

  'submission.edited_by_owner': {
    inApp: (d) => ({
      title: 'Submission edited',
      body:  `Owner edited #${d.code}${d.fields ? ` — ${d.fields}` : ''}`,
    }),
  },

  'job.created': {
    push:  (d) => ({ title: 'Added to a job', body: `You were added to "${d.company}"` }),
    email: (d) => renderJobCreatedEmail({
      painterName: String(d.painterName ?? ''),
      companyName: String(d.company ?? ''),
      jobUrl:      d.jobUrl as string | undefined,
    }),
  },

  'job.painter_added': {
    push: (d) => ({ title: 'Added to a job', body: `You were added to "${d.company}"` }),
  },

  'job.painter_removed': {
    inApp: (d) => ({ title: 'Removed from job', body: `You're no longer on "${d.company}"` }),
  },

  'job.completed': {
    inApp: (d) => ({ title: 'Job completed', body: `"${d.company}" was marked as completed` }),
  },

  'file.ready': {
    push: (d) => ({
      title: 'File ready',
      body:  `Your ${d.type} for "${d.company}" is ready to download`,
    }),
  },

  'file.failed': {
    push:  (d) => ({ title: 'Export failed', body: `${d.type} export errored — admin notified` }),
    email: (d) => renderFileFailedEmail({
      ownerName:   String(d.ownerName ?? ''),
      type:        String(d.type ?? 'File'),
      companyName: String(d.company ?? ''),
    }),
  },

  'auth.password_reset': {
    email: (d) => renderAuthPasswordResetEmail({
      name:     String(d.name ?? ''),
      resetUrl: String(d.resetUrl ?? ''),
    }),
    inApp: () => ({ title: 'Password reset email sent', body: 'Check your inbox for the reset link.' }),
  },

  'auth.password_changed': {
    inApp:  (d) => ({ title: 'Password changed', body: `Your password was changed${d.device ? ` on ${d.device}` : ''}.` }),
    email:  (d) => renderAuthPasswordChangedEmail({
      name:   String(d.name ?? ''),
      device: d.device as string | undefined,
    }),
  },

  'auth.new_device': {
    inApp:  (d) => ({ title: 'New sign-in', body: `Sign-in from ${d.device}${d.city ? ` · ${d.city}` : ''}` }),
    email:  (d) => renderAuthNewDeviceEmail({
      name:   String(d.name ?? ''),
      device: String(d.device ?? 'unknown device'),
      city:   d.city as string | undefined,
    }),
  },

  'user.suspended': {
    inApp:  (d) => ({ title: 'Account suspended', body: String(d.reason ?? '') }),
    email:  (d) => renderUserSuspendedEmail({
      name:         String(d.name ?? ''),
      reason:       String(d.reason ?? ''),
      adminContact: d.adminContact as string | undefined,
    }),
  },

  'admin.bg_job_failed': {
    push: (d) => ({
      title: 'Background job failed',
      body:  `${d.queue} · ${d.jobId} · ${d.error}`,
    }),
  },

  'admin.storage_quota': {
    inApp:  (d) => ({ title: 'Storage quota alert', body: `${d.service} approaching free-tier limit` }),
    email:  (d) => renderAdminStorageQuotaEmail({
      service:      String(d.service ?? ''),
      usagePercent: d.usagePercent as number | undefined,
    }),
  },

  'account.approved': {
    push: (d) => ({ title: 'Account approved', body: `Hi ${d.name}, your owner account has been approved.` }),
  },

  'account.rejected': {
    push: (d) => ({ title: 'Account rejected', body: String(d.reason ?? 'Your registration was rejected.') }),
  },

  'owner.registered': {
    inApp:  (d) => ({ title: 'New owner pending', body: `${d.name} (${d.email}) is awaiting approval` }),
    email:  (d) => renderOwnerRegisteredEmail({
      ownerName:  String(d.name ?? ''),
      ownerEmail: String(d.email ?? ''),
      ownerPhone: d.phone as string | undefined,
    }),
  },
};
