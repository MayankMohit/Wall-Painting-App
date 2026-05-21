import { verifyToken, type TokenPayload } from '@/lib/auth';
import { unauthorized, forbidden } from '@/lib/api-response';

export type { TokenPayload };

export type Role = 'painter' | 'owner' | 'admin';

export async function requireAuth(request: Request): Promise<TokenPayload> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) throw unauthorized();

  const payload = verifyToken(token);
  if (!payload) throw unauthorized();

  return payload;
}

export async function requireRole(request: Request, ...roles: Role[]): Promise<TokenPayload> {
  const payload = await requireAuth(request);

  if (!roles.includes(payload.role)) throw forbidden();

  return payload;
}
