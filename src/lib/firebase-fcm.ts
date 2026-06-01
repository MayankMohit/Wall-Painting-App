import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { firebaseApp } from '@/lib/firebase-client';

// Module-level flag: once registerFCM has successfully completed in this
// browser session, return the cached token instead of re-running the full
// permission/SW/getToken/POST flow on every caller (e.g. bell clicks).
// Resets implicitly on full page reload. Also self-resets if the cached
// token disappears from localStorage (e.g. after logout) so a fresh login
// re-registers correctly.
let _fcmRegistered = false;

export async function registerFCM(): Promise<string | null> {
  if (_fcmRegistered) {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_fcm_token') : null;
    if (cached) return cached;
    _fcmRegistered = false;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { updateViaCache: 'none' } // always fetch latest SW, never serve stale cached version
    );
    await registration.update();

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      serviceWorkerRegistration: registration,
    });
    if (!token) return null;

    localStorage.setItem('wallpainter_fcm_token', token);

    const authToken = localStorage.getItem('wallpainter_token');
    if (authToken) {
      await fetch('/api/users/me/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });
    }

    _fcmRegistered = true;
    return token;
  } catch {
    return null;
  }
}

export function setupFCMForeground(
  handler: (payload: MessagePayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  try {
    const messaging = getMessaging(firebaseApp);
    return onMessage(messaging, handler);
  } catch {
    return () => {};
  }
}
