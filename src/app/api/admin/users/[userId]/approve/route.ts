import { connectDB } from '@/lib/db';
import { User, Notification } from '@/lib/models';
import { requireRole } from '@/lib/rbac';
import { admin } from '@/lib/firebase-admin';
import { sendOwnerApprovedEmail } from '@/lib/email';
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

  await connectDB();
  const user = await User.findById(userId);
  if (!user) return notFound('User not found');
  if (user.role !== 'owner') return badRequest('User is not an owner');
  if (user.status !== 'inactive') return badRequest('User is not pending approval');

  user.status = 'active';
  await user.save();

  await Promise.allSettled([
    sendOwnerApprovedEmail(user.email, user.name),
    Notification.create({
      userId: user._id,
      title: 'Account approved',
      body: 'Your owner account has been approved. You can now log in.',
    }),
    ...(user.fcmTokens.length > 0
      ? user.fcmTokens.map((token) =>
          admin.messaging().send({
            token,
            notification: {
              title: 'Account approved',
              body: 'Your owner account has been approved. You can now log in.',
            },
          })
        )
      : []),
  ]);

  const updated = await User.findById(userId).select(EXCLUDED);
  return ok(updated);
}
