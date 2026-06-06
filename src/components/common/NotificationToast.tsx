'use client';

import { useEffect } from 'react';
import { useNotificationUiStore, type NotifToast } from '@/store/notificationUiStore';

const AUTO_DISMISS_MS = 5000;

function BellIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
    <div
      className="notif-slide-in relative overflow-hidden flex items-start gap-3"
      style={{
        width: 320,
        background: 'oklch(0.18 0.012 80)',
        border: '1px solid oklch(0.28 0.01 80)',
        borderRadius: 'var(--r-md)',
        padding: '13px 14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Bell icon badge */}
      <div
        style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0, marginTop: 1,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}
      >
        <BellIcon />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 3, lineHeight: 1,
        }}>
          Wallo
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#fff',
          lineHeight: 1.3, letterSpacing: '-0.01em',
        }}>
          {title}
        </div>
        {body && (
          <div style={{
            fontSize: 12, color: 'oklch(0.65 0.006 80)',
            marginTop: 3, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {body}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => removeToast(id)}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, marginTop: 1, padding: 4, borderRadius: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'oklch(0.48 0.006 80)', display: 'flex', alignItems: 'center',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.26 0.01 80)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.48 0.006 80)'; }}
      >
        <CloseIcon />
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'oklch(0.26 0.01 80)',
        }}
      >
        <div
          style={{
            height: '100%', background: 'var(--accent)', transformOrigin: 'left',
            animation: `notif-progress ${AUTO_DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function NotificationToastContainer() {
  const toasts = useNotificationUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[88px] lg:bottom-5 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} />
        </div>
      ))}
    </div>
  );
}
