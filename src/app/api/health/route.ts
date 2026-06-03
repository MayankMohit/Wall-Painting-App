import { connectDB } from '@/lib/db';
import { ok } from '@/lib/api-response';
import { withMiddleware } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';

export const GET = withMiddleware()(
  async (req, ctx) => {
    try {
      await connectDB();
    } catch (e) {
      ctx.fail(503, ErrorCodes.INTERNAL, `DB unavailable: ${(e as Error).message}`);
    }
    return ok({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  }
);
