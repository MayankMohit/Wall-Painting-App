'use client';
import { useEffect } from 'react';
import { useNotificationUiStore, type NotifToast } from '@/store/notificationUiStore';

const AUTO_DISMISS_MS = 5000;

function BellFilledIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

function Toast({ id, title, body }: NotifToast) {
  const removeToast = useNotificationUiStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div className="notif-slide-in flex items-start gap-3 w-80 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden">
      {/* Colored left strip + icon — decorative only */}
      <div className="shrink-0 flex items-center justify-center w-10 self-stretch bg-blue-600">
        <BellFilledIcon />
      </div>

      {/* Content — non-interactive */}
      <div className="flex-1 min-w-0 py-3 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 leading-none mb-1">
          Wallo
        </p>
        <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
        {body && (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{body}</p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => removeToast(id)}
        className="shrink-0 mt-2 mr-2 p-1 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-10 right-0 h-0.5 bg-blue-500 origin-left"
        style={{ animation: `notif-progress ${AUTO_DISMISS_MS}ms linear forwards` }}
      />
    </div>
  );
}

export function NotificationToastContainer() {
  const toasts = useNotificationUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto relative">
          <Toast {...t} />
        </div>
      ))}
    </div>
  );
}
