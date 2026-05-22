import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, badRequest, err } from '@/lib/api-response';
import { ChangePasswordSchema } from '@/lib/validators';
import { comparePassword, hashPassword } from '@/lib/auth';

export async function PUT(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const user = await User.findById(payload.userId);
  if (!user) return notFound('User not found');

  const valid = await comparePassword(parsed.data.currentPassword, user.password);
  if (!valid) return err('Current password is incorrect', 400);

  user.password = await hashPassword(parsed.data.newPassword);
  await user.save();

  return ok({ message: 'Password updated' });
}
