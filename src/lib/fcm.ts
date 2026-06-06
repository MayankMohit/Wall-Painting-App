import { admin } from '@/lib/firebase-admin';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

export async function sendFcmToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  await connectDB();
  const user = await User.findById(userId, 'fcmTokens').lean();
  if (!user || !user.fcmTokens.length) return;

  const dead: string[] = [];

  for (const token of user.fcmTokens) {
    try {
      await admin.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        ...(payload.data ? { data: payload.data } : {}),
        webpush: {
          notification: {
            icon:     '/app-icon.png',
            badge:    '/app-icon.png',
            tag:      'wallo-notif',
            renotify: true,
          },
          // Clicking the OS notification opens/focuses the app
          fcmOptions: { link: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' },
        },
      });
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        dead.push(token);
      } else {
        throw e;
      }
    }
  }

  if (dead.length > 0) {
    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: dead } } });
  }
}
