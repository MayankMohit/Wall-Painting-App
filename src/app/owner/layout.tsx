'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAppDispatch } from '@/store/hooks';
import {
  useGetNotificationsQuery,
  useGetPreferencesQuery,
  notificationsApi,
} from '@/store/api/notificationsApi';
import { api } from '@/store/api/api';
import { useNotificationUiStore } from '@/store/notificationUiStore';
import { playNotificationSound } from '@/lib/notificationSound';
import { Bell, List, LogoutIcon, UserIcon, Users } from '@/components/owner/icons';

const MAX_SEEN_IDS = 200;
const _seenNotifIds = new Set<string>();

function isInQuietHours(
  qh: { start: string; end: string; tz: string } | null | undefined,
): boolean {
  if (!qh) return false;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: qh.tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const current = `${hour}:${minute}`;
    if (qh.start > qh.end) return current >= qh.start || current <= qh.end;
    return current >= qh.start && current <= qh.end;
  } catch {
    return false;
  }
}

const NAV_LINKS = [
  {
    label: 'Jobs',
    href: '/owner/jobs',
    Icon: List,
    isActive: (p: string) => p.startsWith('/owner/jobs'),
  },
  {
    label: 'Painters',
    href: '/owner/painters',
    Icon: Users,
    isActive: (p: string) => p.startsWith('/owner/painters'),
  },
  {
    label: 'Inbox',
    href: '/owner/inbox',
    Icon: Bell,
    isActive: (p: string) => p.startsWith('/owner/inbox'),
    badge: true,
  },
  {
    label: 'Me',
    href: '/owner/profile',
    Icon: UserIcon,
    isActive: (p: string) => p.startsWith('/owner/profile'),
  },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, checkAuth } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const dispatch = useAppDispatch();
  const muted = useNotificationUiStore((s) => s.muted);
  const addToast = useNotificationUiStore((s) => s.addToast);

  const mutedRef = useRef(muted);
  const addToastRef = useRef(addToast);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  const { data: prefs } = useGetPreferencesQuery(undefined, { skip: !isAuthenticated });
  const qhRef = useRef(prefs?.quietHours ?? null);
  useEffect(() => { qhRef.current = prefs?.quietHours ?? null; }, [prefs?.quietHours]);

  const { data: notifData } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 60_000,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (user?.role === 'owner' && user.status !== 'active') {
      router.replace('/pending-approval');
    }
  }, [user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('wallpainter_token');
    if (!token) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/notifications/stream', {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
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
            dispatch(api.util.invalidateTags(['Submission', 'SubmissionDetail', 'JobDetail', 'Job']));
            try {
              const payload = JSON.parse(line.slice(6)) as {
                id?: string;
                title?: string;
                body?: string;
              };
              if (payload.title) {
                if (payload.id && _seenNotifIds.has(payload.id)) continue;
                if (payload.id) {
                  _seenNotifIds.add(payload.id);
                  if (_seenNotifIds.size > MAX_SEEN_IDS) {
                    const oldest = _seenNotifIds.values().next().value;
                    if (oldest) _seenNotifIds.delete(oldest);
                  }
                }
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

  const hideBottomNav = /\/submissions\/[^/]+$/.test(pathname);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-(--paper)">

      {/* ── Desktop sidebar ────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-44 shrink-0 bg-(--ink) sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] overflow-hidden shrink-0">
              <Image src="/app-icon.png" alt="Wallo" width={32} height={32} className="object-cover block" />
            </div>
            <span className="text-[20px] font-bold tracking-[-0.04em] text-white">
              Wallo<span className="text-(--accent)">.</span>
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3">
          {NAV_LINKS.map(({ label, href, Icon, isActive, badge }) => {
            const on = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-2.5 px-5 py-2.5 no-underline text-[14px] transition-[background,color] duration-100',
                  on
                    ? 'text-white bg-white/10 border-l-2 border-(--accent) font-semibold'
                    : 'text-white/45 bg-transparent border-l-2 border-transparent font-medium hover:text-white/70',
                ].join(' ')}
              >
                <Icon size={17} weight={on ? 2.2 : 1.6} />
                {label}
                {badge && unreadCount > 0 && (
                  <span className="ml-auto h-4.5 min-w-4.5 px-1.25 bg-(--accent) text-white rounded-full text-[10px] font-bold inline-flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-5 py-4 border-t border-white/8">
          <div className="text-[13px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
            {user?.name ?? 'Owner'}
          </div>
          <div className="text-[11px] text-white/35 mt-0.5 mb-3.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer bg-transparent border border-white/12 text-white/45 text-[13px] font-medium transition-[color,border-color] duration-100 hover:text-white/70 hover:border-white/20"
          >
            <LogoutIcon size={15} weight={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className={`flex-1 min-w-0 lg:pb-0 bg-(--paper) ${hideBottomNav ? 'pb-0' : 'pb-21'}`}>
        {children}
      </main>

      {/* ── Mobile bottom tabs ─────────────────────────────────────── */}
      <div className={`lg:hidden flex fixed bottom-0 left-0 right-0 z-50 bg-(--surface) border-t border-(--border) pt-2 pb-5 ${hideBottomNav ? 'hidden' : ''}`}>
        {NAV_LINKS.map(({ label, href, Icon, isActive, badge }) => {
          const on = isActive(pathname);
          return (
            <Link
              key={label}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.75 no-underline ${on ? 'text-(--ink)' : 'text-(--ink-4)'}`}
            >
              <div className="relative">
                <Icon size={22} weight={on ? 2.2 : 1.6} />
                {badge && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-(--accent) rounded-full border-[1.5px] border-(--surface)" />
                )}
              </div>
              <span className={`text-[10px] tracking-[.01em] ${on ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
