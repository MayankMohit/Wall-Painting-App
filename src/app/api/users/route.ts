import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

const PAGE_SIZE = 20;

export const GET = withRole(['owner', 'admin'])(
  async (req, ctx) => {
    const { role } = ctx.user!;
    const { searchParams } = new URL(req.url);
    const q          = searchParams.get('q') ?? '';
    const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const roleParam  = searchParams.get('role');
    const statusParam = searchParams.get('status');

    // Owner may only list painters
    const roleFilter = role === 'owner' ? 'painter' : (roleParam ?? undefined);

    const filter: Record<string, unknown> = {};
    if (roleFilter) filter.role = roleFilter;
    if (statusParam && role === 'admin') filter.status = statusParam;
    if (q) {
      filter.$or = [
        { name:  { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    await connectDB();

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('_id name email phone role status createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      User.countDocuments(filter),
    ]);

    return ok({ users, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  }
);
