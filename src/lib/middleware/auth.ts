import { verifyToken, type TokenPayload } from '@/lib/auth';
import { HttpError, ErrorCodes } from '@/lib/errors';

export function extractAndVerifyToken(req: Request): TokenPayload {
  const authHeader = req.headers.get('authorization');
  const token      = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Authentication required');
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Invalid or expired token');
  }

  return payload;
}
