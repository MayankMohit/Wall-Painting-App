'use client';

import { useAuthStore } from '@/store/authStore';
import { useNotificationUiStore } from '@/store/notificationUiStore';
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  type AppNotification,
} from '@/store/api/notificationsApi';
import { groupByDate } from '@/components/notifications/notifHelpers';
import { Bell, SpeakerOn, SpeakerOff } from '@/components/notifications/icons';
import { Check, Clock, X } from '@/components/owner/icons';

// ── Helpers ────────────────────────────────────────────────────────────────

type NotifKind = 'pending' | 'approved' | 'rejected' | 'info';

function getKind(eventId?: string): NotifKind {
  if (!eventId) return 'info';
  if (eventId === 'submission.create' || eventId === 'submission.resubmit') return 'pending';
  if (eventId === 'submission.approve') return 'approved';
  if (eventId === 'submission.reject' || eventId === 'submission.revoke' || eventId === 'file.failed') return 'rejected';
  return 'info';
}

const KIND_COLOR: Record<NotifKind, string> = {
  pending:  'var(--accent)',
  approved: 'var(--approved)',
  rejected: 'var(--rejected)',
  info:     'var(--info)',
};

function KindIcon({ kind, size = 14 }: { kind: NotifKind; size?: number }) {
  if (kind === 'approved') return <Check size={size} weight={2.4} />;
  if (kind === 'rejected') return <X size={size} weight={2.4} />;
  if (kind === 'pending')  return <Clock size={size} />;
  return <Bell size={size} />;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Row component ──────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onRead,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
}) {
  const unread = notif.readAt === null;
  const kind = getKind(notif.eventId);

  return (
    <button
      onClick={() => { if (unread) onRead(notif._id); }}
      className="flex items-start gap-3.5 w-full px-5 py-3.5 text-left border-b border-(--border) last:border-0 font-(--font) transition-colors"
      style={{ background: unread ? 'oklch(0.97 0.012 60 / .6)' : 'transparent', cursor: unread ? 'pointer' : 'default' }}
    >
      {/* Icon circle */}
      <div
        className="w-8.5 h-8.5 rounded-full shrink-0 flex items-center justify-center text-white mt-0.5"
        style={{ background: KIND_COLOR[kind] }}
      >
        <KindIcon kind={kind} size={14} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] leading-[1.35] text-(--ink)" style={{ fontWeight: unread ? 600 : 500 }}>
          {notif.title}
        </div>
        {notif.body && (
          <div className="text-[13px] text-(--ink-2) mt-0.5 leading-[1.4] line-clamp-2">
            {notif.body}
          </div>
        )}
      </div>

      {/* Right: unread dot + time */}
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {unread && (
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
        )}
        <div className="text-[11px] whitespace-nowrap" style={{ color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
          {relativeTime(notif.createdAt)}
        </div>
      </div>
    </button>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3.5 px-5 py-3.5 border-b border-(--border) last:border-0 animate-pulse">
      <div className="w-8.5 h-8.5 rounded-full bg-(--paper-2) shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 w-48 bg-(--paper-2) rounded" />
        <div className="h-3 w-64 bg-(--paper-2) rounded" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function OwnerInboxPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const muted = useNotificationUiStore((s) => s.muted);
  const toggleMute = useNotificationUiStore((s) => s.toggleMute);

  const { data, isLoading } = useGetNotificationsQuery(
    { limit: 50 },
    { skip: !isAuthenticated, pollingInterval: 30_000 },
  );
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount ?? 0;
  const groups        = groupByDate(notifications);

  // ── Shared header ─────────────────────────────────────────────────────────
  function Header({ desktop = false }: { desktop?: boolean }) {
    return (
      <div
        className={[
          'flex items-center justify-between border-b border-(--border)',
          desktop
            ? 'pb-5'
            : 'px-4 pt-3.5 pb-3 bg-(--paper) sticky top-0 z-10',
        ].join(' ')}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={['font-bold tracking-tight text-(--ink)', desktop ? 'text-[28px]' : 'text-[22px]'].join(' ')}
          >
            Inbox
          </span>
          {unreadCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 bg-(--accent) text-white rounded-full text-[11px] font-bold inline-flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="h-8 px-3 rounded-full border border-(--border-2) bg-transparent text-[12px] font-semibold cursor-pointer transition-[color,border-color] hover:border-(--border-3)"
              style={{ color: 'var(--accent-deep)' }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute notifications' : 'Mute notifications'}
            className={[
              'w-8 h-8 rounded-full border border-(--border-2) flex items-center justify-center cursor-pointer shrink-0 transition-[background,color,border-color]',
              muted ? 'bg-(--ink) text-white border-(--ink)' : 'bg-transparent text-(--ink-2)',
            ].join(' ')}
          >
            {muted ? <SpeakerOff size={15} weight={2} /> : <SpeakerOn size={15} weight={2} />}
          </button>
        </div>
      </div>
    );
  }

  // ── Shared body ───────────────────────────────────────────────────────────
  function Body() {
    if (isLoading) {
      return (
        <div
          className="overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}
        >
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="py-18 px-6 text-center">
          <div className="w-12 h-12 rounded-[14px] bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-3) mx-auto mb-4">
            <Bell size={22} />
          </div>
          <div className="text-[15px] font-semibold text-(--ink) mb-1.5">All caught up</div>
          <div className="text-[13px] text-(--ink-3)">No notifications yet.</div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groups.map(({ label, items }) => (
          <div key={label}>
            {/* Date group header */}
            <div className="text-[11px] font-bold tracking-wider uppercase mb-0 px-0 pt-0 pb-0" style={{ color: 'var(--ink-3)' }}>
              {label}
            </div>
            <div
              className="mt-2 overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}
            >
              {items.map((n) => (
                <NotifRow key={n._id} notif={n} onRead={(id) => markRead(id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────── */}
      <div className="lg:hidden bg-(--paper) min-h-screen">
        <Header />
        <div className="px-4 py-4">
          <Body />
        </div>
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex justify-center px-8 py-8">
        <div className="w-full max-w-180">
          <Header desktop />
          <div className="mt-5">
            <Body />
          </div>
        </div>
      </div>
    </>
  );
}
