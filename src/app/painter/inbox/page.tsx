"use client";

import { useAuthStore } from "@/store/authStore";
import { useNotificationUiStore } from "@/store/notificationUiStore";
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from "@/store/api/notificationsApi";
import { Bell, SpeakerOn, SpeakerOff } from "@/components/notifications/icons";
import { groupByDate } from "@/components/notifications/notifHelpers";
import { NotifRow } from "@/components/notifications/NotifRow";

export default function PainterInboxPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const muted = useNotificationUiStore((s) => s.muted);
  const toggleMute = useNotificationUiStore((s) => s.toggleMute);

  const { data, isLoading } = useGetNotificationsQuery(
    { limit: 50 },
    {
      skip: !isAuthenticated,
      pollingInterval: 30_000,
    },
  );
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const groups = groupByDate(notifications);

  // ── Shared sections ────────────────────────────────────────────────────────
  const Header = ({ desktop = false }: { desktop?: boolean }) => (
    <div
      className={[
        "flex items-center justify-between border-b border-(--border)",
        desktop
          ? "pb-6 bg-transparent"
          : "px-4 pt-[14px] pb-2.5 bg-(--paper) sticky top-0 z-10",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={[
            "font-bold tracking-[-0.02em] text-(--ink)",
            desktop ? "text-[28px]" : "text-[22px]",
          ].join(" ")}
        >
          Inbox
        </div>
        {unreadCount > 0 && (
          <span className="h-5 min-w-[20px] px-1.5 bg-(--accent) text-white rounded-full text-[11px] inline-flex items-center justify-center font-(--mono)">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="h-8 px-3 rounded-full border border-(--border-2) bg-transparent text-[12px] text-(--ink-2) cursor-pointer font-(--font) whitespace-nowrap"
          >
            Mark all read
          </button>
        )}
        <button
          onClick={toggleMute}
          title={muted ? "Unmute notifications" : "Mute notifications"}
          className={[
            "w-8 h-8 rounded-full border border-(--border-2) flex items-center justify-center cursor-pointer shrink-0",
            muted ? "bg-(--ink) text-white" : "bg-transparent text-(--ink-2)",
          ].join(" ")}
        >
          {muted ? (
            <SpeakerOff size={15} weight={2} />
          ) : (
            <SpeakerOn size={15} weight={2} />
          )}
        </button>
      </div>
    </div>
  );

  const Body = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-[72px]">
          <div className="landing-spinner" />
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="py-[72px] px-6 text-center">
          <div className="w-12 h-12 rounded-[14px] bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-3) mx-auto mb-4">
            <Bell size={22} />
          </div>
          <div className="text-[15px] font-semibold text-(--ink) mb-1.5">
            All caught up
          </div>
          <div className="text-[13px] text-(--ink-3)">
            No notifications yet.
          </div>
        </div>
      );
    }

    return (
      <>
        {groups.map(({ label, items }) => (
          <div key={label}>
            <div className="px-4 pt-2.5 pb-1.5 text-[11px] font-bold text-(--ink-3) tracking-[.06em] uppercase bg-(--paper-2) border-b border-(--border)">
              {label}
            </div>
            {items.map((n) => (
              <NotifRow key={n._id} notif={n} onRead={(id) => markRead(id)} />
            ))}
          </div>
        ))}
      </>
    );
  };

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────── */}
      <div className="lg:hidden bg-(--paper)">
        <Header />
        <Body />
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────── */}
      <div className="hidden lg:block px-8 py-11 max-w-[720px] mx-auto">
        <Header desktop />
        <div className="mt-2">
          <Body />
        </div>
      </div>
    </>
  );
}
