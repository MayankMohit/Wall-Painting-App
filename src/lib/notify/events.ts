export type Channel = 'inApp' | 'push' | 'email';
export type Role    = 'painter' | 'owner' | 'admin';
export type ResolverName = 'paintersOnJob' | 'jobOwner';

export type Audience =
  | { kind: 'explicit' }
  | { kind: 'role'; role: Role }
  | { kind: 'resolver'; name: ResolverName }
  | { kind: 'all' };

export interface NotifTarget {
  audience: Audience;
  channels: Channel[];
}

export interface NotifEvent {
  id: string;
  category: 'submission' | 'job' | 'file' | 'auth' | 'admin' | 'announcement';
  urgency:  'normal' | 'urgent';
  mandatory?: boolean;
  targets: NotifTarget[];
}

export const NOTIF_EVENTS: Record<string, NotifEvent> = {
  'submission.create': {
    id: 'submission.create', category: 'submission', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'inApp'] }],
  },
  'submission.resubmit': {
    id: 'submission.resubmit', category: 'submission', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'inApp'] }],
  },
  'submission.approve': {
    id: 'submission.approve', category: 'submission', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'inApp'] }],
  },
  'submission.reject': {
    id: 'submission.reject', category: 'submission', urgency: 'urgent',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'email', 'inApp'] }],
  },
  'submission.revoke': {
    id: 'submission.revoke', category: 'submission', urgency: 'urgent',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'email', 'inApp'] }],
  },
  'submission.edited_by_owner': {
    id: 'submission.edited_by_owner', category: 'submission', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['inApp'] }],
  },
  'job.created': {
    id: 'job.created', category: 'job', urgency: 'normal',
    targets: [{ audience: { kind: 'resolver', name: 'paintersOnJob' }, channels: ['push', 'email', 'inApp'] }],
  },
  'job.painter_added': {
    id: 'job.painter_added', category: 'job', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'inApp'] }],
  },
  'job.painter_removed': {
    id: 'job.painter_removed', category: 'job', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['inApp'] }],
  },
  'job.completed': {
    id: 'job.completed', category: 'job', urgency: 'normal',
    targets: [{ audience: { kind: 'resolver', name: 'paintersOnJob' }, channels: ['inApp'] }],
  },
  'file.ready': {
    id: 'file.ready', category: 'file', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'inApp'] }],
  },
  'file.failed': {
    id: 'file.failed', category: 'file', urgency: 'urgent',
    targets: [
      { audience: { kind: 'explicit' },             channels: ['push', 'email', 'inApp'] },
      { audience: { kind: 'role', role: 'admin' },  channels: ['push', 'inApp'] },
    ],
  },
  'auth.password_reset': {
    id: 'auth.password_reset', category: 'auth', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['email'] }],
  },
  'auth.password_changed': {
    id: 'auth.password_changed', category: 'auth', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['email', 'inApp'] }],
  },
  'auth.new_device': {
    id: 'auth.new_device', category: 'auth', urgency: 'urgent',
    targets: [{ audience: { kind: 'explicit' }, channels: ['email', 'inApp'] }],
  },
  'user.suspended': {
    id: 'user.suspended', category: 'auth', urgency: 'urgent', mandatory: true,
    targets: [{ audience: { kind: 'explicit' }, channels: ['email', 'inApp'] }],
  },
  'admin.bg_job_failed': {
    id: 'admin.bg_job_failed', category: 'admin', urgency: 'normal',
    targets: [{ audience: { kind: 'role', role: 'admin' }, channels: ['push', 'inApp'] }],
  },
  'admin.storage_quota': {
    id: 'admin.storage_quota', category: 'admin', urgency: 'normal',
    targets: [{ audience: { kind: 'role', role: 'admin' }, channels: ['push', 'email', 'inApp'] }],
  },
  'account.approved': {
    id: 'account.approved', category: 'auth', urgency: 'normal',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'inApp'] }],
  },
  'account.rejected': {
    id: 'account.rejected', category: 'auth', urgency: 'urgent',
    targets: [{ audience: { kind: 'explicit' }, channels: ['push', 'inApp'] }],
  },
  'owner.registered': {
    id: 'owner.registered', category: 'admin', urgency: 'normal',
    // email is handled directly by sendAdminNewOwnerNotification in register/route.ts
    targets: [{ audience: { kind: 'role', role: 'admin' }, channels: ['push', 'inApp'] }],
  },
};
