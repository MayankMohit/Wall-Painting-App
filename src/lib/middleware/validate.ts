import type { ZodTypeAny } from 'zod';
import { HttpError, ErrorCodes } from '@/lib/errors';

export async function validateBody(
  req   : Request,
  schema: ZodTypeAny,
  ctx   : { body?: unknown }
): Promise<void> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, ErrorCodes.VALIDATION_ERROR, 'Request body must be valid JSON');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, ErrorCodes.VALIDATION_ERROR,
      result.error.issues[0].message,
      { issues: result.error.issues }
    );
  }

  ctx.body = result.data;
}
