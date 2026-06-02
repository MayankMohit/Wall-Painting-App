// Applied to every API response by the pipeline.
// Static page-level headers (HSTS, X-Frame-Options, etc.) are set in next.config.ts.
export function applyHelmetHeaders(headers: Headers): void {
  headers.set('Cache-Control',           'no-store');
  headers.set('X-Content-Type-Options',  'nosniff');
  headers.set('X-Frame-Options',         'DENY');
  headers.set('Content-Security-Policy', "default-src 'none'");
  headers.set('Referrer-Policy',         'strict-origin-when-cross-origin');
}
