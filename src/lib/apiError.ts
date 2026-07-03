// The API error envelope is either { error: 'plain string' } (api-response
// helpers like err()/badRequest()) or { error: { code, message } } (HttpError
// serialized by the middleware errorHandler). Rendering the raw `error` value
// in a toast/alert prints "[object Object]" for the latter — always extract
// the human message through this instead.
export function apiErrorMessage(body: unknown, fallback = 'Something went wrong'): string {
  const err = (body as { error?: unknown } | null)?.error;
  if (typeof err === 'string') return err;
  const msg = (err as { message?: unknown } | null)?.message;
  return typeof msg === 'string' ? msg : fallback;
}
