import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, badRequest } from '@/lib/api-response';
import { UpdateProfileSchema } from '@/lib/validators';

const EXCLUDED = '-password -resetPasswordToken -resetPasswordExpires';

export async function GET(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  await connectDB();
  const user = await User.findById(payload.userId).select(EXCLUDED);
  if (!user) return notFound('User not found');

  return ok(user);
}

export async function PUT(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const user = await User.findByIdAndUpdate(
    payload.userId,
    { $set: parsed.data },
    { new: true }
  ).select(EXCLUDED);
  if (!user) return notFound('User not found');

  return ok(user);
}
