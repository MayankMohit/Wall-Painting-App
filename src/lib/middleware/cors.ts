const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, x-request-id';
const EXPOSED_HEADERS = 'x-request-id, x-ratelimit-limit, x-ratelimit-remaining';

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && origin === appUrl) return origin;
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost')) return origin;
    if (origin.includes('.ngrok-free.app') || origin.includes('.ngrok.io')) return origin;
  }
  return null;
}

export function applyCorsHeaders(headers: Headers, origin: string | null): void {
  const allowed = getAllowedOrigin(origin);
  if (!allowed) return;
  headers.set('Access-Control-Allow-Origin',   allowed);
  headers.set('Access-Control-Allow-Methods',  ALLOWED_METHODS);
  headers.set('Access-Control-Allow-Headers',  ALLOWED_HEADERS);
  headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS);
  headers.set('Vary', 'Origin');
}

// Returns a 204 response for OPTIONS preflight; null for every other method
export function handlePreflight(req: Request, origin: string | null): Response | null {
  if (req.method !== 'OPTIONS') return null;
  const headers = new Headers();
  applyCorsHeaders(headers, origin);
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}
