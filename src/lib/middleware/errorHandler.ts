import { HttpError } from '@/lib/errors';
import type { Logger } from 'pino';

export interface ErrorEnvelope {
  error: {
    code      : string;
    message   : string;
    details?  : Record<string, unknown>;
    requestId : string;
  };
}

export function handleError(err: unknown, requestId: string, logger: Logger): Response {
  if (err instanceof HttpError) {
    const body: ErrorEnvelope = {
      error: { code: err.code, message: err.message, details: err.details, requestId },
    };
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (err.status === 429 && err.details?.retryAfter) {
      headers.set('Retry-After',           String(err.details.retryAfter));
      headers.set('X-RateLimit-Limit',     String(err.details.limit ?? ''));
      headers.set('X-RateLimit-Remaining', '0');
    }
    return new Response(JSON.stringify(body), { status: err.status, headers });
  }

  // Unknown — log full stack, return nothing sensitive to the client
  logger.error({ err, requestId }, 'unhandled exception');
  return Response.json(
    { error: { code: 'INTERNAL', message: 'An unexpected error occurred.', requestId } },
    { status: 500 }
  );
}
