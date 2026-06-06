"use client";

import type { AppNotification } from "@/store/api/notificationsApi";
import { formatTime } from "./notifHelpers";

export function NotifRow({
  notif,
  onRead,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
}) {
  const unread = notif.readAt === null;

  return (
    <button
      onClick={() => {
        if (unread) onRead(notif._id);
      }}
      className={[
        "flex items-start gap-3 w-full px-4 py-3.5 text-left border-b border-(--border) font-(--font)",
        unread
          ? "bg-(--surface) cursor-pointer"
          : "bg-transparent cursor-default",
      ].join(" ")}
    >
      <div
        className={[
          "w-2 h-2 rounded-full shrink-0 mt-1.25",
          unread ? "bg-(--accent)" : "bg-transparent",
        ].join(" ")}
      />
      <div className="flex-1 min-w-0">
        <div
          className={[
            "text-[14px] leading-[1.3] mb-[3px]",
            unread
              ? "font-semibold text-(--ink)"
              : "font-medium text-(--ink-2)",
          ].join(" ")}
        >
          {notif.title}
        </div>
        {notif.body && (
          <div className="text-[13px] text-(--ink-3) leading-[1.4] line-clamp-2">
            {notif.body}
          </div>
        )}
        <div className="text-[11px] text-(--ink-4) mt-[5px] font-(--mono)">
          {formatTime(notif.createdAt)}
        </div>
      </div>
    </button>
  );
}
