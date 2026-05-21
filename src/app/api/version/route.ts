import { ok } from '@/lib/api-response';

export function GET() {
  return ok({
    name: 'wall-painting-app',
    version: '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
  });
}
