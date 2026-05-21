import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound } from '@/lib/api-response';

export async function GET(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  await connectDB();
  const user = await User.findById(payload.userId).select('-password -resetPasswordToken -resetPasswordExpires');
  if (!user) return notFound('User not found');

  return ok(user);
}
