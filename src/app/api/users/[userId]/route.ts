import { connectDB } from '@/lib/db';
import { User, Job } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden, badRequest } from '@/lib/api-response';
import { UpdateAdminUserSchema } from '@/lib/validators';

const EXCLUDED = '-password -resetPasswordToken -resetPasswordExpires';

export async function GET(request: Request, context: RouteContext<'/api/users/[userId]'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'admin' && payload.role !== 'owner') return forbidden();

  const { userId } = await context.params;

  await connectDB();

  if (payload.role === 'owner') {
    const assigned = await Job.exists({ ownerId: payload.userId, painters: userId });
    if (!assigned) return forbidden();
  }

  const user = await User.findById(userId).select(EXCLUDED);
  if (!user) return notFound('User not found');

  return ok(user);
}

export async function PUT(request: Request, context: RouteContext<'/api/users/[userId]'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'admin') return forbidden();

  const { userId } = await context.params;
  const body = await request.json();
  const parsed = UpdateAdminUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const user = await User.findByIdAndUpdate(userId, { $set: parsed.data }, { new: true }).select(EXCLUDED);
  if (!user) return notFound('User not found');

  return ok(user);
}

export async function DELETE(request: Request, context: RouteContext<'/api/users/[userId]'>) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'admin') return forbidden();

  const { userId } = await context.params;

  await connectDB();
  const user = await User.findByIdAndUpdate(userId, { $set: { status: 'inactive' } }, { new: true }).select(
    EXCLUDED
  );
  if (!user) return notFound('User not found');

  return ok({ message: 'User deactivated' });
}
