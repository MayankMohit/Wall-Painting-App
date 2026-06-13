/**
 * Namespace segment for all externally-stored assets (Cloudflare R2 keys and
 * Cloudinary folders), so dev and prod never share an object path even when they
 * point at the same bucket / cloud account.
 *
 * Prefer an explicit `STORAGE_ENV` (set `STORAGE_ENV=prod` in `.env.production`);
 * fall back to NODE_ENV so a missing var still keeps prod and dev apart.
 * Result is always a safe path segment ('prod' | 'dev' | a sanitised custom value).
 */
const raw = process.env.STORAGE_ENV ?? (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

export const STORAGE_ENV = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
