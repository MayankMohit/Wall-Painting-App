import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { withAuth } from '@/lib/middleware';

export const POST = withAuth({ audit: 'AUTH_LOGOUT' })(
  async (req, ctx) => {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const fcmToken =
      typeof body.fcmToken === 'string' && body.fcmToken.trim()
        ? body.fcmToken.trim()
        : null;

    if (fcmToken) {
      await connectDB();
      await User.updateOne(
        { _id: ctx.user!.userId },
        { $pull: { fcmTokens: fcmToken } }
      );
    }

    return Response.json({ data: { message: 'Logged out' } });
  }
);
