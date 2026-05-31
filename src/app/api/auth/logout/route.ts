import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok } from '@/lib/api-response';

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch {
    // Stateless JWT — treat invalid/missing token as already logged out
    return ok({ message: 'Logged out' });
  }

  const body = await request.json().catch(() => ({}));
  const fcmToken =
    typeof body?.fcmToken === 'string' && body.fcmToken.trim()
      ? body.fcmToken.trim()
      : null;

  if (fcmToken) {
    await connectDB();
    await User.updateOne(
      { _id: payload.userId },
      { $pull: { fcmTokens: fcmToken } }
    );
  }

  return ok({ message: 'Logged out' });
}
