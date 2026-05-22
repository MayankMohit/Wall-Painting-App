import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, badRequest } from '@/lib/api-response';
import { FCMTokenSchema } from '@/lib/validators';

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parsed = FCMTokenSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const user = await User.findByIdAndUpdate(
    payload.userId,
    { $addToSet: { fcmTokens: parsed.data.token } },
    { new: true }
  ).select('fcmTokens');
  if (!user) return notFound('User not found');

  return ok({ fcmTokens: user.fcmTokens });
}

export async function DELETE(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parsed = FCMTokenSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const user = await User.findByIdAndUpdate(
    payload.userId,
    { $pull: { fcmTokens: parsed.data.token } },
    { new: true }
  ).select('fcmTokens');
  if (!user) return notFound('User not found');

  return ok({ fcmTokens: user.fcmTokens });
}
