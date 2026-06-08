import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

const PAGE_SIZE = 50;

export const GET = withRole(['admin'], { audit: 'ADMIN_USERS_VIEW' })(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const role   = searchParams.get('role');
    const status = searchParams.get('status');
    const q      = searchParams.get('q') ?? '';
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1));

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (role   && role   !== 'all') filter.role   = role;
    if (status && status !== 'all') filter.status = status;
    if (q) filter.$or = [
      { name:  { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      User.countDocuments(filter),
    ]);

    return ok({ users, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  }
);
