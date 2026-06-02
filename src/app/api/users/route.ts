import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, forbidden, err } from '@/lib/api-response';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const payload = await requireAuth(request);
    if (payload.role !== 'owner' && payload.role !== 'admin') return forbidden();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const roleParam = searchParams.get('role');
    const statusParam = searchParams.get('status');

    // Owner may only list painters
    const roleFilter = payload.role === 'owner' ? 'painter' : (roleParam ?? undefined);

    const filter: Record<string, unknown> = {};
    if (roleFilter) filter.role = roleFilter;
    if (statusParam && payload.role === 'admin') filter.status = statusParam;

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    await connectDB();

    // 3. LASER FOCUS & HEAVY BACKPACK
    // Explicitly defining fields is a massive security upgrade over excluding fields
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('_id name email phone status createdAt') 
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      User.countDocuments(filter),
    ]);

    return ok({ users, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[GET /api/users]', e);
    return err('Failed to fetch users', 500);
  }
}