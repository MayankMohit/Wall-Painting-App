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
import {
  LayoutGrid, Terminal, Bell, UserIcon, LogoutIcon, List, ChartBar,
} from '@/components/admin/icons';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; weight?: number }>;
  isActive: (p: string) => boolean;
  badge?: boolean;
}

// ── Nav config ────────────────────────────────────────────────────────────────

const SIDEBAR_LINKS: NavItem[] = [
  { label: 'System',    href: '/admin/dashboard', Icon: LayoutGrid, isActive: (p) => p.startsWith('/admin/dashboard') },
  { label: 'Analytics', href: '/admin/analytics', Icon: ChartBar,   isActive: (p) => p.startsWith('/admin/analytics') },
  { label: 'Logs',      href: '/admin/logs',      Icon: List,       isActive: (p) => p.startsWith('/admin/logs') },
  { label: 'Inbox',     href: '/admin/inbox',     Icon: Bell,       isActive: (p) => p.startsWith('/admin/inbox'), badge: true },
  { label: 'Me',        href: '/admin/profile',   Icon: UserIcon,   isActive: (p) => p.startsWith('/admin/profile') },
];

const BOTTOM_TABS: NavItem[] = [
  { label: 'System',    href: '/admin/dashboard', Icon: LayoutGrid, isActive: (p) => p.startsWith('/admin/dashboard') },
  { label: 'Analytics', href: '/admin/analytics', Icon: ChartBar,   isActive: (p) => p.startsWith('/admin/analytics') },
  { label: 'Logs',      href: '/admin/logs',      Icon: Terminal,   isActive: (p) => p.startsWith('/admin/logs') },
  { label: 'Inbox',     href: '/admin/inbox',     Icon: Bell,       isActive: (p) => p.startsWith('/admin/inbox'), badge: true },
  { label: 'Me',        href: '/admin/profile',   Icon: UserIcon,   isActive: (p) => p.startsWith('/admin/profile') },
];

// Suppress bottom tabs on deep drilldown pages
const HIDE_TABS_RE = /^\/admin\/users\/.+|^\/admin\/jobs\/.+/;

// ── Notification dedup ────────────────────────────────────────────────────────

const MAX_SEEN = 200;
const _seen = new Set<string>();

function isInQuietHours(qh: { start: string; end: string; tz: string } | null | undefined) {
  if (!qh) return false;
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: qh.tz, hour: '2-digit', minute: '2-digit', hour12: false });
    const parts = fmt.formatToParts(new Date());
    const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const cur = `${h}:${m}`;
    return qh.start > qh.end ? cur >= qh.start || cur <= qh.end : cur >= qh.start && cur <= qh.end;
  } catch { return false; }
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { logout, user, checkAuth } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const dispatch    = useAppDispatch();
  const muted       = useNotificationUiStore((s) => s.muted);
  const addToast    = useNotificationUiStore((s) => s.addToast);
  const mutedRef    = useRef(muted);
  const addToastRef = useRef(addToast);
  useEffect(() => { mutedRef.current    = muted;    }, [muted]);
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

  // SSE real-time notification stream
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
        const reader  = res.body.getReader();
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
              const payload = JSON.parse(line.slice(6)) as { id?: string; title?: string; body?: string };
              if (payload.title) {
                if (payload.id && _seen.has(payload.id)) continue;
                if (payload.id) {
                  _seen.add(payload.id);
                  if (_seen.size > MAX_SEEN) {
                    const oldest = _seen.values().next().value;
                    if (oldest) _seen.delete(oldest);
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

  const hideTabs = HIDE_TABS_RE.test(pathname);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-(--paper)">

      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-52 shrink-0 bg-(--ink) sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] overflow-hidden shrink-0">
              <Image src="/app-icon.png" alt="Wallo" width={32} height={32} className="object-cover block" />
            </div>
            <div>
              <span className="text-[18px] font-bold tracking-[-0.04em] text-white">
                Wallo<span className="text-(--accent)">.</span>
              </span>
              <div className="text-[9px] font-bold uppercase tracking-[.1em] text-white/30 mt-0">Admin</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {SIDEBAR_LINKS.map(({ label, href, Icon, isActive, badge }) => {
            const on = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-2.5 px-5 py-2.5 no-underline text-[13px] transition-[background,color] duration-100',
                  on
                    ? 'text-white bg-white/10 border-l-2 border-(--accent) font-semibold'
                    : 'text-white/45 bg-transparent border-l-2 border-transparent font-medium hover:text-white/70',
                ].join(' ')}
              >
                <Icon size={16} weight={on ? 2.2 : 1.6} />
                {label}
                {badge && unreadCount > 0 && (
                  <span className="ml-auto h-4 min-w-4 px-1 bg-(--accent) text-white rounded-full text-[10px] font-bold inline-flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-5 py-4 border-t border-white/8">
          <Link
            href="/admin/profile"
            className="flex items-center gap-2 mb-3 no-underline group"
          >
            <div className="w-7 h-7 rounded-full bg-(--accent) text-white flex items-center justify-center text-[11px] font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white truncate group-hover:text-white/80 transition-colors">
                {user?.name ?? 'Admin'}
              </div>
              <div className="text-[10px] text-white/30 truncate">{user?.email}</div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer bg-transparent border border-white/12 text-white/45 text-[12px] font-medium transition-[color,border-color] duration-100 hover:text-white/70 hover:border-white/20"
          >
            <LogoutIcon size={14} weight={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className={`flex-1 min-w-0 bg-(--paper) lg:pb-0 ${hideTabs ? 'pb-0' : 'pb-[84px]'}`}>
        {children}
      </main>

      {/* ── Mobile bottom tabs ────────────────────────────────────────── */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-(--surface) border-t border-(--border) pt-2 pb-5 flex ${hideTabs ? 'hidden' : ''}`}>
        {BOTTOM_TABS.map(({ label, href, Icon, isActive, badge }) => {
          const on = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 no-underline ${on ? 'text-(--ink)' : 'text-(--ink-4)'}`}
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
