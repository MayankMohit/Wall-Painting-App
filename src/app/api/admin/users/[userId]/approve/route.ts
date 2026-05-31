import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireRole } from '@/lib/rbac';
import { sendOwnerApprovedEmail } from '@/lib/email';
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

  await connectDB();
  const user = await User.findById(userId);
  if (!user) return notFound('User not found');
  if (user.role !== 'owner') return badRequest('User is not an owner');
  if (user.status !== 'inactive') return badRequest('User is not pending approval');

  user.status = 'active';
  await user.save();

  await Promise.allSettled([
    sendOwnerApprovedEmail(user.email, user.name),
    notify.emit('account.approved', {
      recipientId: String(user._id),
      data: { name: user.name },
    }),
  ]);

  const updated = await User.findById(userId).select(EXCLUDED);
  return ok(updated);
}
