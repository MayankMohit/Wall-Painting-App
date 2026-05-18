# Notifications System

---

## Push Notifications (FCM)

### Frontend Setup

```typescript
// lib/firebase-fcm.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function registerFCM() {
  if (!('serviceWorker' in navigator)) return;

  // Register service worker
  await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // Get device token
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  });

  if (token) {
    // Send token to backend
    await fetch('/api/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  // Listen for foreground messages
  onMessage(messaging, (payload) => {
    console.log('Message:', payload);
    // Show in-app notification
    store.dispatch(
      notificationsSlice.actions.addNotification({
        title: payload.notification?.title,
        body: payload.notification?.body,
        type: 'info'
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
    if (token) {
      registerFCM();
    }
  }, []);
}
```

### Backend Setup

```typescript
// lib/firebase-admin.ts
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
  ),
  projectId: process.env.FIREBASE_PROJECT_ID
});

export const messaging = admin.messaging();
```

### Sending Notifications

```typescript
// services/notificationService.ts
export async function notifyOwner(
  ownerId: string,
  title: string,
  body: string
) {
  const user = await User.findById(ownerId);
  if (!user?.fcmTokens?.length) return;

  const message = {
    notification: { title, body },
    webpush: {
      notification: {
        title,
        body,
        icon: '/icon.png'
      }
    }
  };

  for (const token of user.fcmTokens) {
    try {
      await messaging.send({ ...message, token });
    } catch (error) {
      // Remove invalid token
      await User.updateOne({ _id: ownerId }, { $pull: { fcmTokens: token } });
    }
  }
}
```

---

## Email Notifications (Resend)

```typescript
// services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(painterEmail: string, jobName: string) {
  return await resend.emails.send({
    from: 'notifications@wallpainter.app',
    to: painterEmail,
    subject: 'Submission Approved ✓',
    html: `
      <h2>Your submission has been approved!</h2>
      <p>Job: ${jobName}</p>
      <p>You can now view your approval status in the app.</p>
    `
  });
}

export async function sendRejectionEmail(
  painterEmail: string,
  reason: string
) {
  return await resend.emails.send({
    from: 'notifications@wallpainter.app',
    to: painterEmail,
    subject: 'Submission Needs Revision',
    html: `
      <h2>Your submission needs revision</h2>
      <p>Reason: ${reason}</p>
      <p>Please re-submit with corrections.</p>
    `
  });
}
```

---

## Notification Types

| Event | Method | Recipient |
|-------|--------|-----------|
| **New submission received** | FCM + Email | Owner |
| **Submission approved** | FCM + Email | Painter |
| **Submission rejected** | FCM + Email | Painter |
| **File ready for download** | FCM + In-app | Owner |
| **New job assigned** | FCM + Email | Painter |

---

## Notification Flow

**Event**: Painter submits form
→ FCM Push Notification (Owner)
→ Email from Resend (Owner)

**Event**: Owner approves submission
→ FCM Push Notification (Painter)
→ Email from Resend (Painter)
