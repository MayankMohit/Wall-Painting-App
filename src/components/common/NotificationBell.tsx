'use client';
import { useState, useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import {
  useGetNotificationsQuery,
  useGetPreferencesQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  notificationsApi,
  type AppNotification,
} from '@/store/api/notificationsApi';
import { useAuthStore } from '@/store/authStore';
import { useNotificationUiStore } from '@/store/notificationUiStore';
import { playNotificationSound } from '@/lib/notificationSound';
import { registerFCM } from '@/lib/firebase-fcm';

// Module-level dedup: prevents double sound when Strict Mode mounts effects
// twice or when two SSE connections briefly overlap. Bounded to MAX_SEEN_IDS
// entries with FIFO eviction so it cannot grow without bound across a long
// session — JS Sets preserve insertion order, so the first .values() entry
// is always the oldest.
const MAX_SEEN_IDS = 200;
const _seenNotifIds = new Set<string>();

// Pure helper: is "now" inside the user's quiet-hours window, evaluated in the
// stored timezone? Used to silence the in-app toast + chime client-side. The
// server already blocks push/email via its own quiet-hours check; the in-app
// row and SSE publish always happen by design so the bell badge stays accurate.
function isInQuietHours(
  qh: { start: string; end: string; tz: string } | null | undefined
): boolean {
  if (!qh) return false;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: qh.tz,
      hour:     '2-digit',
      minute:   '2-digit',
      hour12:   false,
    });
    const parts  = formatter.formatToParts(new Date());
    const hour   = parts.find((p) => p.type === 'hour')?.value   ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const current = `${hour}:${minute}`;
    // Overnight range (e.g. 22:00 → 08:00)
    if (qh.start > qh.end) return current >= qh.start || current <= qh.end;
    return current >= qh.start && current <= qh.end;
  } catch {
    return false;
  }
}

function SpeakerOnIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.536 8.464a5 5 0 0 1 0 7.072M12 6v12m0 0-3-3H6a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1h3l3-3z" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}

function NotificationItem({
  notif,
  onRead,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
}) {
  const isRead = notif.readAt !== null;
  const time = new Date(notif.createdAt).toLocaleString(undefined, {
    month: 'short',
    day:   'numeric',
    hour:  '2-digit',
    minute:'2-digit',
  });

  return (
    <button
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${isRead ? 'opacity-60' : ''}`}
      onClick={() => { if (!isRead) onRead(notif._id); }}
    >
      <div className="flex items-start gap-2">
        {!isRead && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
        )}
        <div className={isRead ? 'ml-4' : ''}>
          <p className="text-sm font-medium text-gray-900 leading-snug">{notif.title}</p>
          <p className="text-sm text-gray-500 mt-0.5 leading-snug">{notif.body}</p>
          <p className="text-xs text-gray-400 mt-1">{time}</p>
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen]           = useState(false);
  const [permState, setPermState] = useState<NotificationPermission | 'unsupported'>('default');
  const dropdownRef               = useRef<HTMLDivElement>(null);
  const dispatch                  = useAppDispatch();

  // Sync permission state on mount and when dropdown opens
  useEffect(() => {
    if (typeof Notification === 'undefined') { setPermState('unsupported'); return; }
    setPermState(Notification.permission);
  }, [open]);
  const isAuthenticated     = useAuthStore((s) => s.isAuthenticated);
  const muted               = useNotificationUiStore((s) => s.muted);
  const toggleMute          = useNotificationUiStore((s) => s.toggleMute);
  const addToast            = useNotificationUiStore((s) => s.addToast);

  // Pull the user's quietHours pref (shared cache with the prefs panel).
  const { data: prefs } = useGetPreferencesQuery(undefined, { skip: !isAuthenticated });

  // Refs so the SSE effect doesn't tear down + reopen the stream every time
  // the user toggles mute or edits quiet hours. The handler reads from
  // `.current` to always see the latest value without being a dep.
  const mutedRef    = useRef(muted);
  const addToastRef = useRef(addToast);
  const qhRef       = useRef(prefs?.quietHours ?? null);
  useEffect(() => { mutedRef.current    = muted;                     }, [muted]);
  useEffect(() => { addToastRef.current = addToast;                  }, [addToast]);
  useEffect(() => { qhRef.current       = prefs?.quietHours ?? null; }, [prefs?.quietHours]);

  const { data, isLoading } = useGetNotificationsQuery(undefined, {
    skip:            !isAuthenticated,
    pollingInterval: 60_000,
  });
  const [markRead]    = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount   ?? 0;

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // SSE stream for live updates
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('wallpainter_token');
    if (!token) return;

    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/notifications/stream', {
          headers: { Authorization: `Bearer ${token}` },
          signal:  ctrl.signal,
        });
        if (!res.ok || !res.body) return;

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        // Buffer carries any trailing partial line between reads so a chunk
        // boundary in the middle of a `data: {...}` event no longer drops the
        // JSON.parse and silently loses the toast + sound.
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith('data: ')) continue;
            dispatch(notificationsApi.util.invalidateTags(['Notification']));
            try {
              const payload = JSON.parse(line.slice(6)) as { id?: string; title?: string; body?: string };
              if (payload.title) {
                if (payload.id && _seenNotifIds.has(payload.id)) continue;
                if (payload.id) {
                  _seenNotifIds.add(payload.id);
                  if (_seenNotifIds.size > MAX_SEEN_IDS) {
                    const oldest = _seenNotifIds.values().next().value;
                    if (oldest) _seenNotifIds.delete(oldest);
                  }
                }
                // Bell badge already updated above via invalidateTags. During
                // quiet hours, suppress the intrusive toast + chime here so
                // the UI stays silent while still tracking unread counts.
                if (!isInQuietHours(qhRef.current)) {
                  addToastRef.current({ title: payload.title, body: payload.body ?? '' });
                  playNotificationSound(mutedRef.current);
                }
              }
            } catch {}
          }
        }
      } catch {}
    })();

    return () => ctrl.abort();
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={async () => {
          setOpen((v) => !v);
          if (typeof Notification === 'undefined') return;

          if (Notification.permission === 'default') {
            // First-time: request from user gesture (required by mobile browsers)
            const result = await Notification.requestPermission();
            setPermState(result);
            if (result === 'granted') registerFCM().catch(() => {});
          } else if (Notification.permission === 'granted') {
            // Re-register if token was cleared from DB or permission was just enabled in settings
            registerFCM().catch(() => {});
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
                title={muted ? 'Unmute sound' : 'Mute sound'}
              >
                {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Permission banners */}
          {permState === 'default' && (
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-left border-b border-blue-100 hover:bg-blue-100 transition-colors"
              onClick={async () => {
                const result = await Notification.requestPermission();
                setPermState(result);
                if (result === 'granted') registerFCM().catch(() => {});
              }}
            >
              <span className="text-blue-600 text-lg">🔔</span>
              <span className="text-xs text-blue-700 font-medium">Tap to enable push notifications</span>
            </button>
          )}
          {permState === 'denied' && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-xs font-semibold text-amber-800 mb-1">Push notifications blocked</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                To enable: tap the <strong>🔒 lock icon</strong> in your browser address bar
                → <strong>Permissions</strong> → <strong>Notifications</strong> → <strong>Allow</strong>
              </p>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
            )}
            {!isLoading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet</p>
            )}
            {notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notif={n}
                onRead={(id) => markRead(id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
