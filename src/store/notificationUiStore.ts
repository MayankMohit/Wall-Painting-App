import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotifToast {
  id: string;
  title: string;
  body: string;
}

interface NotificationUiState {
  muted: boolean;
  toasts: NotifToast[];
  toggleMute: () => void;
  addToast: (toast: Omit<NotifToast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useNotificationUiStore = create<NotificationUiState>()(
  persist(
    (set) => ({
      muted:  false,
      toasts: [],

      toggleMute: () => set((s) => ({ muted: !s.muted })),

      addToast: (toast) =>
        set((s) => ({
          toasts: [
            ...s.toasts.slice(-2), // keep at most 3 visible
            { ...toast, id: `${Date.now()}-${Math.random()}` },
          ],
        })),

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name:        'wallpainter_notif_ui',
      partialize:  (s) => ({ muted: s.muted }), // only persist mute setting
    }
  )
);
