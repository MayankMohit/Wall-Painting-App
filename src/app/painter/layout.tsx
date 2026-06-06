"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch } from "@/store/hooks";
import {
  useGetNotificationsQuery,
  useGetPreferencesQuery,
  notificationsApi,
} from "@/store/api/notificationsApi";
import { api } from "@/store/api/api";
import { useNotificationUiStore } from "@/store/notificationUiStore";
import { playNotificationSound } from "@/lib/notificationSound";

const MAX_SEEN_IDS = 200;
const _seenNotifIds = new Set<string>();

function isInQuietHours(
  qh: { start: string; end: string; tz: string } | null | undefined,
): boolean {
  if (!qh) return false;
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: qh.tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const current = `${hour}:${minute}`;
    if (qh.start > qh.end) return current >= qh.start || current <= qh.end;
    return current >= qh.start && current <= qh.end;
  } catch {
    return false;
  }
}

type IconProps = {
  size?: number;
  weight?: number;
  style?: React.CSSProperties;
};
const ico =
  (path: React.ReactNode) =>
  ({ size = 20, weight = 1.6, style }: IconProps = {}) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {path}
    </svg>
  );

const HomeIcon = ico(
  <>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </>,
);
const BellIcon = ico(
  <>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </>,
);
const UserIcon = ico(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 5-6 8-6s7 2 8 6" />
  </>,
);
const LogoutIcon = ico(
  <>
    <path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4" />
    <path d="m10 16 4-4-4-4" />
    <path d="M14 12H3" />
  </>,
);

const TABS = [
  {
    label: "Home",
    href: "/painter/dashboard",
    Icon: HomeIcon,
    isActive: (p: string) =>
      p === "/painter/dashboard" || p.startsWith("/painter/jobs"),
  },
  {
    label: "Inbox",
    href: "/painter/inbox",
    Icon: BellIcon,
    isActive: (p: string) => p.startsWith("/painter/inbox"),
  },
  {
    label: "Me",
    href: "/painter/profile",
    Icon: UserIcon,
    isActive: (p: string) => p.startsWith("/painter/profile"),
  },
];

export default function PainterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, checkAuth } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const dispatch = useAppDispatch();
  const muted = useNotificationUiStore((s) => s.muted);
  const addToast = useNotificationUiStore((s) => s.addToast);

  const mutedRef = useRef(muted);
  const addToastRef = useRef(addToast);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  const { data: prefs } = useGetPreferencesQuery(undefined, {
    skip: !isAuthenticated,
  });
  const qhRef = useRef(prefs?.quietHours ?? null);
  useEffect(() => {
    qhRef.current = prefs?.quietHours ?? null;
  }, [prefs?.quietHours]);

  const { data: notifData } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 60_000,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?.role === "painter" && user.status !== "active") {
      router.replace("/pending-approval");
    }
  }, [user, router]);

  // SSE stream — fires toasts + sounds for live notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("wallpainter_token");
    if (!token) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/notifications/stream", {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data: ")) continue;
            dispatch(notificationsApi.util.invalidateTags(["Notification"]));
            dispatch(api.util.invalidateTags(["Submission", "SubmissionDetail", "JobDetail", "Job"]));
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
                  addToastRef.current({
                    title: payload.title,
                    body: payload.body ?? "",
                  });
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-(--paper)">
      {/* ── Sidebar — desktop only ───────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 bg-(--ink) sticky top-0 h-screen overflow-y-auto">
        {/* Logo lockup */}
        <div className="px-5 pt-6 pb-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-[9px] overflow-hidden shrink-0 shadow-[0_4px_14px_oklch(0.62_0.14_300/0.35)]">
              <Image
                src="/app-icon.png"
                alt="Wallo"
                width={34}
                height={34}
                className="object-cover block"
              />
            </div>
            <span className="text-[21px] font-bold tracking-[-0.04em] text-white">
              Wallo<span className="text-(--accent)">.</span>
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-white/32 font-medium tracking-[.04em] uppercase">
            Painter
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-2.5">
          {TABS.map(({ label, href, Icon, isActive }) => {
            const on = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-2.5 px-5 py-2.5 no-underline text-[14px] transition-[background,color] duration-100",
                  on
                    ? "text-white bg-white/8 border-l-2 border-(--accent) font-semibold"
                    : "text-white/45 bg-transparent border-l-2 border-transparent font-medium",
                ].join(" ")}
              >
                <Icon size={17} weight={on ? 2.2 : 1.6} />
                {label}
                {label === "Inbox" && unreadCount > 0 && (
                  <span className="ml-auto h-4.5 min-w-4.5 px-1.25 bg-(--accent) text-white rounded-full text-[10px] font-bold inline-flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-5 py-4 border-t border-white/8">
          <div className="text-[13px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
            {user?.name ?? "Painter"}
          </div>
          <div className="text-[11px] text-white/35 mt-0.5 mb-3.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer bg-transparent border border-white/12 text-white/45 text-[13px] font-medium transition-[color,border-color] duration-100"
          >
            <LogoutIcon size={15} weight={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content — children rendered once ───────────────── */}
      <main className="flex-1 min-w-0 pb-21 lg:pb-0 bg-(--paper)">
        {children}
      </main>

      {/* ── Bottom tabs — mobile only ────────────────────────────── */}
      <div className="lg:hidden flex fixed bottom-0 left-0 right-0 z-50 bg-(--surface) border-t border-(--border) pt-2 pb-5">
        {TABS.map(({ label, href, Icon, isActive }) => {
          const on = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.75 no-underline ${on ? "text-(--ink)" : "text-(--ink-4)"}`}
            >
              <div className="relative">
                <Icon size={22} weight={on ? 2.2 : 1.6} />
                {label === "Inbox" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-(--accent) rounded-full border-[1.5px] border-(--surface)" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-[.01em] ${on ? "font-semibold" : "font-medium"}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
