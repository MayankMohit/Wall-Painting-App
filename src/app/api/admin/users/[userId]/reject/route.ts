import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireRole } from '@/lib/rbac';
import { sendOwnerRejectedEmail } from '@/lib/email';
import { ok, notFound, badRequest } from '@/lib/api-response';
import { notify } from '@/lib/notify/emit';

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

  void payload;

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
    notify.emit('account.rejected', {
      recipientId: String(user._id),
      data: { reason: notifBody },
    }),
  ]);

  const updated = await User.findById(userId).select(EXCLUDED);
  return ok(updated);
}
