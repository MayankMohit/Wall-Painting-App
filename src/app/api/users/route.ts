import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, forbidden } from '@/lib/api-response';

const PAGE_SIZE = 20;
const EXCLUDED = '-password -resetPasswordToken -resetPasswordExpires';

export async function GET(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (payload.role !== 'owner' && payload.role !== 'admin') return forbidden();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const roleParam = searchParams.get('role');

  // Owner may only list painters
  const roleFilter = payload.role === 'owner' ? 'painter' : (roleParam ?? undefined);

  const filter: Record<string, unknown> = {};
  if (roleFilter) filter.role = roleFilter;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  await connectDB();
  const [users, total] = await Promise.all([
    User.find(filter)
      .select(EXCLUDED)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    User.countDocuments(filter),
  ]);

  return ok({ users, total, page, pages: Math.ceil(total / PAGE_SIZE) });
}
