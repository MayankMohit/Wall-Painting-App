import { requireAuth } from '@/lib/rbac';
import { ok } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch {
    // Stateless JWT — treat invalid/missing token as already logged out
  }
  return ok({ message: 'Logged out' });
}
