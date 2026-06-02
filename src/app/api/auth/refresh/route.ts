import { signToken } from '@/lib/auth';
import { withAuth } from '@/lib/middleware';

export const POST = withAuth({ rateLimit: 'standard' })(
  async (req, ctx) => {
    const token = signToken({ userId: ctx.user!.userId, role: ctx.user!.role });
    return Response.json({ data: { token } });
  }
);
