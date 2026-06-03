import { ok } from '@/lib/api-response';
import { withMiddleware } from '@/lib/middleware';

export const GET = withMiddleware()(
  async () => ok({
    name:        'wall-painting-app',
    version:     '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
  })
);
