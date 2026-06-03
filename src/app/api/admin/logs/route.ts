import { connectDB } from '@/lib/db';
import { AuditLog } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

export const GET = withRole(['admin'], { audit: 'ADMIN_LOGS_VIEW' })(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);

    const filter: Record<string, unknown> = {};
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const from   = searchParams.get('from');
    const to     = searchParams.get('to');

    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to)   range.$lte = new Date(to);
      filter.timestamp = range;
    }

    const page  = Math.max(1, Number(searchParams.get('page')  ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)));

    await connectDB();
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return ok({ logs, total, page, limit, pages: Math.ceil(total / limit) });
  }
);
