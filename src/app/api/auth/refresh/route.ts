import { requireAuth } from '@/lib/rbac';
import { signToken } from '@/lib/auth';
import { ok } from '@/lib/api-response';

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const token = signToken({ userId: payload.userId, role: payload.role });
  return ok({ token });
}
