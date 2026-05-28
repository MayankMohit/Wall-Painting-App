import { connectDB } from '@/lib/db';
import { User, Notification } from '@/lib/models';
import { requireRole } from '@/lib/rbac';
import { admin } from '@/lib/firebase-admin';
import { sendOwnerRejectedEmail } from '@/lib/email';
import { ok, notFound, badRequest } from '@/lib/api-response';

const EXCLUDED = '-password -resetPasswordToken -resetPasswordExpires';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  let payload;
  try {
    payload = await requireRole(request, 'admin');
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { userId } = await context.params;

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' && body.reason.trim()
    ? body.reason.trim()
    : undefined;

  await connectDB();
  const user = await User.findById(userId);
  if (!user) return notFound('User not found');
  if (user.role !== 'owner') return badRequest('User is not an owner');
  if (user.status !== 'inactive') return badRequest('User is not pending approval');

  user.status = 'suspended';
  await user.save();

  const notifBody = reason
    ? `Your registration was rejected. Reason: ${reason}`
    : 'Your registration was rejected.';

  await Promise.allSettled([
    sendOwnerRejectedEmail(
      user.email,
      user.name,
      process.env.ADMIN_CONTACT_EMAIL!,
      reason
    ),
    Notification.create({
      userId: user._id,
      title: 'Account registration rejected',
      body: notifBody,
    }),
    ...(user.fcmTokens.length > 0
      ? user.fcmTokens.map((token) =>
          admin.messaging().send({
            token,
            notification: { title: 'Account registration rejected', body: notifBody },
          })
        )
      : []),
  ]);

  const updated = await User.findById(userId).select(EXCLUDED);
  return ok(updated);
}
