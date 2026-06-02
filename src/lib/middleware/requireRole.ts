import { HttpError, ErrorCodes } from '@/lib/errors';
import type { TokenPayload } from '@/lib/auth';

export type Role = 'painter' | 'owner' | 'admin';

export function assertRole(user: TokenPayload, roles: Role[]): void {
  if (!roles.includes(user.role as Role)) {
    throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'Insufficient permissions');
  }
}
