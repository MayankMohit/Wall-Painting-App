# Notifications System

---

## Architecture — Single Entry Point

Every notification in the app flows through one function:

```typescript
notify.emit(eventId, {
  recipientId,   // user._id
  actorId,       // who caused it (optional)
  data: { /* template vars */ },
});
```

Route handlers **never** call FCM or Resend directly. `emit()` enqueues work and returns immediately, keeping request latency low, isolating retry/failure per channel, and making tests simple (assert `emit()` was called, not three services).

### What `emit()` does

1. Look up the event in `NOTIF_EVENTS` (channels, template strings)
2. Read the recipient's `NotificationPreference` doc
3. For each channel still enabled after preferences → `notifyQueue.add({ channel, eventId, recipientId, data })`
4. Always insert an **in-app row** (`Notification` collection) for the bell UI
5. Return immediately — actual delivery is async via the worker

### The `notifyWorker`

`workers/notifyWorker.ts` reads `notifyQueue`:

```typescript
switch (job.data.channel) {
  case 'push':  await fcm.sendToUser(recipientId, render(eventId, data)); break;
  case 'email': await resend.emails.send(render(eventId, data, 'email')); break;
}
// In-app row already inserted by emit(); worker never touches DB.
```

> **Why a queue per delivery attempt (not per event)?**
> One bad email server won't block push delivery. Different retry policies apply per channel (FCM tolerates 5 retries; email 2). The email queue can be drained independently during a Resend outage.

---

## Event Catalog

| Event | Actor → Recipient | Channels | Template Body | Urgency |
|-------|-------------------|----------|---------------|---------|
| `submission.create` | painter → owner | push, in-app | `{painter} submitted #{code} · {location}` | normal |
| `submission.resubmit` | painter → owner | push, in-app | `{painter} resubmitted #{code} after rejection` | normal |
| `submission.approve` | owner → painter | push, in-app | `#{code} approved — {count} photo(s) selected` | normal |
| `submission.reject` | owner → painter | push, email, in-app | `{reason}` | **URGENT** |
| `submission.revoke` | owner → painter | push, email, in-app | `{note} — please add better photos` | **URGENT** |
| `submission.edited_by_owner` | owner → painter | in-app | `Owner edited #{code} {fields}` | normal |
| `job.created` | owner → painter | push, email, in-app | `Added to "{company}"` | normal |
| `job.painter_added` | owner → painter | push, in-app | `Added to "{company}"` | normal |
| `job.painter_removed` | owner → painter | in-app | `You're no longer on "{company}"` | normal |
| `job.completed` | owner → painter | in-app | `"{company}" was completed` | normal |
| `file.ready` | system → owner | push, in-app | `Your {type} for "{company}" is ready to download` | normal |
| `file.failed` | system → owner | push, email, in-app | `{type} export errored — admin notified` | **URGENT** |
| `auth.password_reset` | self → self | email | `Reset link valid 1h. If this wasn't you, ignore.` | normal |
| `auth.password_changed` | self → self | email, in-app | `Your password was changed on {device}.` | normal |
| `auth.new_device` | self → self | email, in-app | `Sign-in from {device} · {city}` | **URGENT** |
| `user.suspended` | admin → user | email, in-app | `{reason}` | **URGENT** |
| `admin.bg_job_failed` | system → admin | push, in-app | `{queue} · {jobId} · {error}` | normal |
| `admin.storage_quota` | system → admin | email, in-app | `{service} approaching free-tier limit` | normal |

---

## Channel Setup

### Frontend — FCM

```typescript
// lib/firebase-fcm.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function registerFCM() {
  if (!('serviceWorker' in navigator)) return;

  await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    await fetch('/api/users/me/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  onMessage(messaging, (payload) => {
    store.dispatch(
      notificationsSlice.actions.addNotification({
        title: payload.notification?.title,
        body: payload.notification?.body,
        type: 'info',
      })
    );
  });
}
```

```typescript
// hooks/useFCM.ts
export function useFCM() {
  useEffect(() => {
    const token = useAuthStore((state) => state.token);
    if (token) registerFCM();
  }, []);
}
```

### Backend — Firebase Admin

```typescript
// lib/firebase-admin.ts
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
  ),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

export const messaging = admin.messaging();
```

### Backend — Email (Resend)

```typescript
// services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  return await resend.emails.send({
    from: 'notifications@wallpainter.app',
    to,
    subject,
    html,
  });
}
```