import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { firebaseApp } from '@/lib/firebase-client';

export async function registerFCM(): Promise<string | null> {
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
