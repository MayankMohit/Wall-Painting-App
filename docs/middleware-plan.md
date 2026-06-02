# Middleware Implementation Plan

This is the complete implementation spec for all 12 request-lifecycle steps. **Implement this before writing any remaining routes** — that way every new route starts clean using the composers, and you never have to migrate those routes.

---

## Why middleware first?

Unfinished routes (`return Response.json({ message: 'Not implemented' }, { status: 501 })`) still benefit from steps 01–05 and 12 the moment you wrap them. New routes (submissions, file generation, downloads) get written with the composers from day one — they never touch `requireAuth`, `try/catch`, or `instanceof Response`. Zero migration cost on anything not yet written.

---

## Current state (the problem)

Every route today:
```ts
export async function POST(request: Request) {
  try {
    const payload = await requireAuth(request);
    if (payload.role !== 'owner') return forbidden();
    const parsed = CreateJobSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    const job = await Job.create({ ...parsed.data, ownerId: payload.userId });
    return ok(job, 201);
  } catch (e) {
    if (e instanceof Response) return e;   // ← fragile pattern
    console.error('[POST /api/jobs]', e);
    return err('Failed to create job', 500);
  }
}
```

Problems: flat `{ error: "string" }` responses, no request IDs, no rate limiting, no structured logs, no audit trail, no security headers, boilerplate repeated across 54 routes.

After this plan, the same route becomes:
```ts
export const POST = withRole(['owner'], { schema: CreateJobSchema, audit: 'JOB_CREATE' })(
  async (req, ctx) => {
    const job = await Job.create({ ...ctx.body, ownerId: ctx.user!.userId, status: 'active' });
    return Response.json({ data: job }, { status: 201 });
  }
);
```

All 12 steps run automatically.

---

## The 12-Step Request Lifecycle

```
01  requestId        Generate trace ID → x-request-id header + bound to every log line
02  logger           Pino request log at end: method, path, status, duration, userId, ip
03  cors             Allow same-origin + NEXT_PUBLIC_APP_URL; handle OPTIONS preflight
04  helmet           CSP, X-Frame-Options DENY, HSTS, Referrer-Policy, Cache-Control: no-store
05  rateLimit        Per-IP (anonymous) then per-user (after auth) — Redis sliding window
06  auth             Verify JWT → populate ctx.user  [skipped by withMiddleware]
07  requireRole      Role gate — reject if user's role not in allowed list  [skipped unless roles set]
08  requireAccess    Resource-ownership gate — fetch resource, check ownership, populate ctx.job/ctx.submission  [opt-in]
09  validate         Zod safeParse body/query → ctx.body / ctx.query  [opt-in via schema option]
10  HANDLER          Route logic — the terminal step
11  audit            Write AuditLog after handler succeeds (fire-and-forget)  [opt-in]
12  errorHandler     Wraps the entire chain — catches HttpError → envelope, unknown → 500 INTERNAL
```

Steps 01–05 and 12 run on every request. Steps 06–11 run only when configured.

---

## Complete File Tree

### New files to create

```
src/lib/
  errors.ts                            HttpError class + ErrorCodes enum
  middleware/
    index.ts                           Three composers + Ctx type + runPipeline
    requestId.ts                       Step 01 — generate x-request-id
    logger.ts                          Step 02 — Pino singleton + createRequestLogger
    cors.ts                            Step 03 — CORS headers + OPTIONS handler
    helmet.ts                          Step 04 — security headers applied to Response
    rateLimit.ts                       Step 05 — Redis sliding window
    auth.ts                            Step 06 — JWT verify → TokenPayload
    requireRole.ts                     Step 07 — role gate
    requireJobAccess.ts                Step 08 — painter|owner|admin access to a job
    requireJobOwner.ts                 Step 08 — owner-or-admin only access to a job
    requireSubmissionAccess.ts         Step 08 — painter|owner|admin access to a submission
    requireUserAccess.ts               Step 08 — self|owner-linked|admin access to a user profile
    validate.ts                        Step 09 — Zod adapter
    audit.ts                           Step 11 — write AuditLog
    errorHandler.ts                    Step 12 — HttpError → error envelope
  models/
    AuditLog.ts                        New Mongoose model (TTL-indexed, 90 days)
```

### Files to modify

```
src/lib/api-response.ts                Keep all existing helpers; add fail() wrapper
src/lib/rbac.ts                        requireAuth/requireRole throw HttpError not Response
next.config.ts                         Add headers() for static security headers
package.json                           Add pino + pino-pretty (devDep)
```

---

## Step 1 — Install Dependencies

```bash
npm install pino
npm install --save-dev pino-pretty
```

`helmet` v8.1.0 is already installed. `redis`, `mongoose`, `jsonwebtoken` are already installed. No other new packages needed.

---

## Step 2 — `src/lib/errors.ts`

Foundation for everything. Every middleware and handler throws `HttpError`; `errorHandler` catches and serializes it.

```ts
export class HttpError extends Error {
  constructor(
    public readonly status : number,
    public readonly code   : string,
    message                : string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const ErrorCodes = {
  // Auth
  EMAIL_TAKEN            : 'EMAIL_TAKEN',
  INVALID_CREDENTIALS    : 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED       : 'ACCOUNT_DISABLED',
  // Access
  NOT_AUTHORIZED         : 'NOT_AUTHORIZED',
  NOT_ASSIGNED_TO_JOB    : 'NOT_ASSIGNED_TO_JOB',
  NOT_LINKED             : 'NOT_LINKED',
  // Business
  APPROVED_LOCKED        : 'APPROVED_LOCKED',
  ALREADY_PENDING        : 'ALREADY_PENDING',
  NO_APPROVED_SUBMISSIONS: 'NO_APPROVED_SUBMISSIONS',
  INVALID_SELECTION      : 'INVALID_SELECTION',
  // Generic
  NOT_FOUND              : 'NOT_FOUND',
  VALIDATION_ERROR       : 'VALIDATION_ERROR',
  RATE_LIMITED           : 'RATE_LIMITED',
  INTERNAL               : 'INTERNAL',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

---

## Step 3 — `src/lib/models/AuditLog.ts`

```ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  requestId  : string;
  userId?    : string;
  userRole?  : 'painter' | 'owner' | 'admin';
  action     : string;
  resource?  : { type: string; id: string };
  ip         : string;
  userAgent? : string;
  statusCode : number;
  duration   : number;       // ms
  metadata?  : Record<string, unknown>;
  timestamp  : Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  requestId : { type: String, required: true, index: true },
  userId    : { type: String, index: true, sparse: true },
  userRole  : { type: String, enum: ['painter', 'owner', 'admin'] },
  action    : { type: String, required: true },
  resource  : { type: { type: String }, id: String },
  ip        : { type: String, required: true },
  userAgent : String,
  statusCode: { type: Number, required: true },
  duration  : Number,
  metadata  : Schema.Types.Mixed,
  timestamp : { type: Date, default: Date.now },
});

// Auto-delete audit records after 90 days
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
```

Export from `src/lib/models/index.ts`.

---

## Step 4 — `src/lib/middleware/requestId.ts` (Step 01)

```ts
import { randomUUID } from 'crypto';

// req_ prefix makes it grep-friendly in logs and support tickets
export function generateRequestId(): string {
  return `req_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}
```

---

## Step 5 — `src/lib/middleware/logger.ts` (Step 02)

```ts
import pino, { type Logger } from 'pino';

export const rootLogger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target : 'pino-pretty',
      options: { colorize: true, ignore: 'pid,hostname' },
    },
  }),
});

export function createRequestLogger(requestId: string): Logger {
  return rootLogger.child({ requestId });
}
```

What gets logged at the end of every request (info level):
```json
{ "requestId": "req_abc123", "method": "POST", "path": "/api/jobs", "status": 201, "duration": "38ms", "userId": "663f...", "ip": "1.2.3.4" }
```

What gets logged on unhandled error (error level):
```json
{ "requestId": "req_abc123", "err": { "message": "...", "stack": "..." }, "method": "POST", "path": "/api/jobs" }
```

---

## Step 6 — `src/lib/middleware/cors.ts` (Step 03)

```ts
const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, x-request-id';
const EXPOSED_HEADERS = 'x-request-id, x-ratelimit-limit, x-ratelimit-remaining';

export function getCorsOrigin(origin: string | null): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) return null;
  if (appUrl && origin === appUrl) return origin;
  if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) return origin;
  return null;  // blocked — errorHandler will still run, response will have no CORS headers
}

export function applyCorsHeaders(headers: Headers, origin: string | null): void {
  const allowed = getCorsOrigin(origin);
  if (!allowed) return;
  headers.set('Access-Control-Allow-Origin',   allowed);
  headers.set('Access-Control-Allow-Methods',  ALLOWED_METHODS);
  headers.set('Access-Control-Allow-Headers',  ALLOWED_HEADERS);
  headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS);
  headers.set('Vary', 'Origin');
}

// Call this at the top of runPipeline before anything else
// If OPTIONS (preflight), short-circuit immediately
export function handlePreflight(req: Request, origin: string | null): Response | null {
  if (req.method !== 'OPTIONS') return null;
  const headers = new Headers();
  applyCorsHeaders(headers, origin);
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}
```

---

## Step 7 — `src/lib/middleware/helmet.ts` (Step 04)

**Part A — static headers via `next.config.ts`** (applied by Next.js to every response):

```ts
// next.config.ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options',          value: 'DENY' },
      { key: 'X-Content-Type-Options',   value: 'nosniff' },
      { key: 'X-DNS-Prefetch-Control',   value: 'off' },
      { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security',value: 'max-age=63072000; includeSubDomains; preload' },
    ],
  }];
}
```

**Part B — `src/lib/middleware/helmet.ts`** (applied by the composer to every API response):

```ts
export function applyHelmetHeaders(headers: Headers): void {
  headers.set('Cache-Control',           'no-store');
  headers.set('X-Content-Type-Options',  'nosniff');
  headers.set('X-Frame-Options',         'DENY');
  // API returns JSON only — restrictive CSP is safe here
  headers.set('Content-Security-Policy', "default-src 'none'");
}
```

Note: `helmet` (v8.1.0) is installed but its Express adapter is incompatible with Next.js. We set the headers directly — same outcome, no adapter needed.

---

## Step 8 — `src/lib/middleware/rateLimit.ts` (Step 05)

Uses existing `getRedis()` from `src/lib/redis.ts`. No new packages.

### Tiers

| Tier | Max | Window | Use |
|------|-----|--------|-----|
| `strict` | 5 req | 15 min | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` |
| `standard` | 100 req | 1 min | Mutations (POST/PUT/PATCH/DELETE) |
| `relaxed` | 300 req | 1 min | Reads (GET) |

### Keys

- Before auth: `rl:ip:{ip}:{tier}` (per-IP)
- After auth: `rl:user:{userId}:{tier}` (per-user, replaces IP window)
- Both windows are checked. Auth endpoints check only IP (no userId yet).

### Implementation

```ts
import { getRedis } from '@/lib/redis';
import { HttpError, ErrorCodes } from '@/lib/errors';

type RateLimitTier = 'strict' | 'standard' | 'relaxed';

const TIERS: Record<RateLimitTier, { max: number; windowMs: number }> = {
  strict  : { max: 5,   windowMs: 15 * 60_000 },
  standard: { max: 100, windowMs:      60_000  },
  relaxed : { max: 300, windowMs:      60_000  },
};

export async function checkRateLimit(
  tier    : RateLimitTier,
  keyValue: string,           // ip address or userId
  keyType : 'ip' | 'user' = 'ip'
): Promise<void> {
  const redis = await getRedis();
  const { max, windowMs } = TIERS[tier];
  const key = `rl:${keyType}:${keyValue}:${tier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipe = redis.multi();
  pipe.zRemRangeByScore(key, 0, windowStart);             // evict expired entries
  pipe.zAdd(key, { score: now, value: String(now) });     // record this request
  pipe.zCount(key, windowStart, '+inf');                  // count in window
  pipe.expire(key, Math.ceil(windowMs / 1000));           // key TTL
  const results = await pipe.exec() as unknown[];
  const count = results[2] as number;

  if (count > max) {
    const retryAfter = Math.ceil(windowMs / 1000);
    throw new HttpError(429, ErrorCodes.RATE_LIMITED,
      `Too many requests. Try again in ${retryAfter}s.`,
      { retryAfter, limit: max, windowMs }
    );
  }
}
```

Rate limit response headers (set by errorHandler when code is RATE_LIMITED):
```
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
```

---

## Step 9 — `src/lib/middleware/auth.ts` (Step 06)

```ts
import { verifyToken, type TokenPayload } from '@/lib/auth';
import { HttpError, ErrorCodes } from '@/lib/errors';

export function extractAndVerifyToken(req: Request): TokenPayload {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Authentication required');
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Invalid or expired token');
  }

  return payload;
}
```

Note: The architecture doc mentions "check blacklist + force-logout flag". This is a future enhancement — implement it here when ready by doing a Redis lookup for a `token-blacklist:{userId}` key before returning the payload.

---

## Step 10 — `src/lib/middleware/requireRole.ts` (Step 07)

```ts
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { TokenPayload } from '@/lib/auth';

export type Role = 'painter' | 'owner' | 'admin';

export function assertRole(user: TokenPayload, roles: Role[]): void {
  if (!roles.includes(user.role as Role)) {
    throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'Insufficient permissions');
  }
}
```

---

## Step 11 — Access Check Files (Step 08)

All access checks share the same signature:

```ts
// src/lib/middleware/index.ts (in the type exports)
export type AccessCheck = (req: Request, ctx: Ctx) => Promise<void>;
```

Access checks read `ctx.params` for IDs, fetch from DB, verify ownership, populate `ctx.job` / `ctx.submission`, and throw `HttpError` if access is denied.

---

### `src/lib/middleware/requireJobAccess.ts`

Grants access if: admin, OR owner of the job, OR painter in `job.painters`.
Populates `ctx.job`.

```ts
import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

export const requireJobAccess: AccessCheck = async (req, ctx) => {
  const { jobId } = ctx.params;
  const { userId, role } = ctx.user!;   // auth step always runs before access checks

  await connectDB();
  const job = await Job.findById(jobId).lean();
  if (!job) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'Job not found');

  const hasAccess =
    role === 'admin' ||
    (role === 'owner'   && job.ownerId.toString() === userId) ||
    (role === 'painter' && job.painters.some((p) => p.toString() === userId));

  if (!hasAccess) throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'You do not have access to this job');

  ctx.job = job;
};
```

---

### `src/lib/middleware/requireJobOwner.ts`

Grants access if: admin, OR the job's owner (painters are rejected).
Populates `ctx.job`.

```ts
import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

export const requireJobOwner: AccessCheck = async (req, ctx) => {
  const { jobId } = ctx.params;
  const { userId, role } = ctx.user!;

  await connectDB();
  const job = await Job.findById(jobId).lean();
  if (!job) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'Job not found');

  const hasAccess =
    role === 'admin' ||
    (role === 'owner' && job.ownerId.toString() === userId);

  if (!hasAccess) throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'Only the job owner can perform this action');

  ctx.job = job;
};
```

---

### `src/lib/middleware/requireSubmissionAccess.ts`

Grants access if: admin, OR the submission's painter, OR the owner of the job.
Populates `ctx.submission` (and `ctx.job` if not already set).

```ts
import { connectDB } from '@/lib/db';
import { Job, Submission } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

export const requireSubmissionAccess: AccessCheck = async (req, ctx) => {
  const { submissionId, jobId } = ctx.params;
  const { userId, role } = ctx.user!;

  await connectDB();

  const submission = await Submission.findOne({ _id: submissionId, jobId }).lean();
  if (!submission) throw new HttpError(404, ErrorCodes.NOT_FOUND, 'Submission not found');

  if (role === 'admin') { ctx.submission = submission; return; }
  if (role === 'painter' && submission.painterId.toString() === userId) { ctx.submission = submission; return; }

  if (role === 'owner') {
    // Reuse ctx.job if requireJobAccess already ran, otherwise fetch
    const job = ctx.job ?? await Job.findById(jobId).lean();
    if (job && job.ownerId.toString() === userId) {
      ctx.job = ctx.job ?? job;
      ctx.submission = submission;
      return;
    }
  }

  throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'You do not have access to this submission');
};
```

---

### `src/lib/middleware/requireUserAccess.ts`

Grants access if: admin, OR the user themselves, OR an owner who shares a job with the target painter.
Does NOT populate a ctx field (user is fetched by the handler as needed).

```ts
import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { AccessCheck } from './index';

export const requireUserAccess: AccessCheck = async (req, ctx) => {
  const { userId: targetId } = ctx.params;
  const { userId, role } = ctx.user!;

  if (role === 'admin') return;
  if (userId === targetId) return;   // user viewing/editing themselves

  if (role === 'owner') {
    await connectDB();
    const sharedJob = await Job.findOne({ ownerId: userId, painters: targetId }).lean();
    if (sharedJob) return;
    throw new HttpError(403, ErrorCodes.NOT_LINKED, 'This painter is not in any of your jobs');
  }

  throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'You do not have access to this user');
};
```

---

## Step 12 — `src/lib/middleware/validate.ts` (Step 09)

```ts
import { type ZodTypeAny, ZodError } from 'zod';
import { HttpError, ErrorCodes } from '@/lib/errors';
import type { Ctx } from './index';

export async function validateBody(req: Request, schema: ZodTypeAny, ctx: Ctx): Promise<void> {
  let raw: unknown;
  try { raw = await req.json(); }
  catch { throw new HttpError(400, ErrorCodes.VALIDATION_ERROR, 'Request body must be valid JSON'); }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, ErrorCodes.VALIDATION_ERROR,
      result.error.issues[0].message,
      { issues: result.error.issues }
    );
  }
  ctx.body = result.data;
}
```

---

## Step 13 — `src/lib/middleware/audit.ts` (Step 11)

```ts
import { AuditLog } from '@/lib/models/AuditLog';
import { connectDB } from '@/lib/db';
import type { Logger } from 'pino';

interface AuditOptions {
  action    : string;
  requestId : string;
  userId?   : string;
  userRole? : string;
  ip        : string;
  userAgent?: string;
  statusCode: number;
  duration  : number;
  resource? : { type: string; id: string };
  metadata? : Record<string, unknown>;
}

// Fire-and-forget — never awaited, never blocks the response
export function writeAuditLog(opts: AuditOptions, logger: Logger): void {
  connectDB()
    .then(() => AuditLog.create({ ...opts, timestamp: new Date() }))
    .catch((err) => logger.error({ err }, 'audit write failed'));
}
```

---

## Step 14 — `src/lib/middleware/errorHandler.ts` (Step 12)

```ts
import { HttpError, ErrorCodes } from '@/lib/errors';
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
      headers.set('Retry-After',             String(err.details.retryAfter));
      headers.set('X-RateLimit-Limit',       String(err.details.limit ?? ''));
      headers.set('X-RateLimit-Remaining',   '0');
    }
    return new Response(JSON.stringify(body), { status: err.status, headers });
  }

  // Unknown — log full stack, return nothing sensitive to client
  logger.error({ err, requestId }, 'unhandled exception');
  return Response.json(
    { error: { code: ErrorCodes.INTERNAL, message: 'An unexpected error occurred.', requestId } },
    { status: 500 }
  );
}
```

---

## Step 15 — `src/lib/middleware/index.ts` — The Composers

This is the core file. One internal `runPipeline` function; three public composers delegate to it.

### Ctx type

```ts
import type { Logger } from 'pino';
import type { TokenPayload } from '@/lib/auth';
import type { IJob } from '@/lib/models/Job';
import type { ISubmission } from '@/lib/models/Submission';
import type { ZodTypeAny } from 'zod';
import { HttpError } from '@/lib/errors';

export type Role = 'painter' | 'owner' | 'admin';

export type AccessCheck = (req: Request, ctx: Ctx) => Promise<void>;

export type Ctx = {
  // Always present
  requestId  : string;
  ip         : string;
  logger     : Logger;
  params     : Record<string, string>;
  fail       : (status: number, code: string, message: string, details?: Record<string, unknown>) => never;
  setAudit   : (action: string, resource?: { type: string; id: string }, metadata?: Record<string, unknown>) => void;
  // Set by validate (step 09)
  body?      : unknown;
  query?     : unknown;
  // Set by auth (step 06)
  user?      : TokenPayload;
  // Set by access checks (step 08)
  job?       : IJob;
  submission?: ISubmission;
  // Internal — written by setAudit, read by the pipeline after handler
  _audit?    : { action: string; resource?: { type: string; id: string }; metadata?: Record<string, unknown> };
};
```

### MiddlewareOpts type

```ts
export type MiddlewareOpts = {
  rateLimit? : 'strict' | 'standard' | 'relaxed';
  schema?    : ZodTypeAny;
  audit?     : string;
  access?    : AccessCheck | AccessCheck[];
};

type PipelineConfig = MiddlewareOpts & {
  requireAuth? : boolean;
  roles?       : Role[];
};

type Handler = (req: Request, ctx: Ctx) => Promise<Response>;
type NextRouteContext = { params?: Promise<Record<string, string>> };
```

### Internal `runPipeline`

```ts
import { generateRequestId }   from './requestId';
import { createRequestLogger } from './logger';
import { handlePreflight, applyCorsHeaders, getCorsOrigin } from './cors';
import { applyHelmetHeaders }  from './helmet';
import { checkRateLimit }      from './rateLimit';
import { extractAndVerifyToken } from './auth';
import { assertRole }          from './requireRole';
import { validateBody }        from './validate';
import { writeAuditLog }       from './audit';
import { handleError }         from './errorHandler';

async function runPipeline(
  req        : Request,
  routeCtx   : NextRouteContext | undefined,
  config     : PipelineConfig,
  handler    : Handler
): Promise<Response> {
  // ── Step 01: Request ID ──────────────────────────────────────────────────────
  const startedAt  = Date.now();
  const requestId  = generateRequestId();
  const ip         = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const origin     = req.headers.get('origin');
  const logger     = createRequestLogger(requestId);

  // ── Step 03: CORS preflight ──────────────────────────────────────────────────
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  // Build Ctx
  const ctx: Ctx = {
    requestId,
    ip,
    logger,
    params  : routeCtx?.params ? await routeCtx.params : {},
    fail    : (status, code, message, details) => { throw new HttpError(status, code, message, details); },
    setAudit: (action, resource, metadata) => { ctx._audit = { action, resource, metadata }; },
  };

  try {
    // ── Step 05a: Rate limit (IP, before auth) ─────────────────────────────────
    if (config.rateLimit) {
      await checkRateLimit(config.rateLimit, ip, 'ip');
    }

    // ── Step 06: Auth ──────────────────────────────────────────────────────────
    if (config.requireAuth) {
      ctx.user = extractAndVerifyToken(req);
      // Step 05b: Re-run rate limit now we know the userId (user window)
      if (config.rateLimit) {
        await checkRateLimit(config.rateLimit, ctx.user.userId, 'user');
      }
    }

    // ── Step 07: Role gate ─────────────────────────────────────────────────────
    if (config.roles && ctx.user) {
      assertRole(ctx.user, config.roles);
    }

    // ── Step 08: Access checks ─────────────────────────────────────────────────
    const checks = config.access
      ? (Array.isArray(config.access) ? config.access : [config.access])
      : [];
    for (const check of checks) {
      await check(req, ctx);
    }

    // ── Step 09: Validate body ─────────────────────────────────────────────────
    if (config.schema) {
      await validateBody(req, config.schema, ctx);
    }

    // ── Step 10: Handler ───────────────────────────────────────────────────────
    const response = await handler(req, ctx);

    // ── Step 11: Audit (after successful handler) ──────────────────────────────
    const auditAction = ctx._audit?.action ?? config.audit;
    if (auditAction && req.method !== 'GET') {
      writeAuditLog({
        action    : auditAction,
        requestId,
        userId    : ctx.user?.userId,
        userRole  : ctx.user?.role,
        ip,
        userAgent : req.headers.get('user-agent') ?? undefined,
        statusCode: response.status,
        duration  : Date.now() - startedAt,
        resource  : ctx._audit?.resource,
        metadata  : ctx._audit?.metadata,
      }, logger);
    }

    // ── Step 02: Log request ───────────────────────────────────────────────────
    logger.info({
      method  : req.method,
      path    : new URL(req.url).pathname,
      status  : response.status,
      duration: `${Date.now() - startedAt}ms`,
      userId  : ctx.user?.userId,
      ip,
    });

    // ── Step 04: Helmet + CORS headers on success response ─────────────────────
    applyHelmetHeaders(response.headers);
    applyCorsHeaders(response.headers, origin);
    response.headers.set('x-request-id', requestId);
    return response;

  } catch (err) {
    // ── Step 12: errorHandler ──────────────────────────────────────────────────
    const response = handleError(err, requestId, logger);
    applyHelmetHeaders(response.headers);
    applyCorsHeaders(response.headers, origin);
    response.headers.set('x-request-id', requestId);

    logger.info({
      method  : req.method,
      path    : new URL(req.url).pathname,
      status  : response.status,
      duration: `${Date.now() - startedAt}ms`,
      userId  : ctx.user?.userId,
      ip,
    });

    return response;
  }
}
```

### Three public composers

```ts
// ── withMiddleware — public, no auth ──────────────────────────────────────────
export function withMiddleware(opts: MiddlewareOpts = {}) {
  return (handler: Handler) =>
    (req: Request, routeCtx?: NextRouteContext) =>
      runPipeline(req, routeCtx, { requireAuth: false, ...opts }, handler);
}

// ── withAuth — any authenticated user ─────────────────────────────────────────
export function withAuth(opts: MiddlewareOpts = {}) {
  return (handler: Handler) =>
    (req: Request, routeCtx?: NextRouteContext) =>
      runPipeline(req, routeCtx, { requireAuth: true, ...opts }, handler);
}

// ── withRole — authenticated + role gate ──────────────────────────────────────
export function withRole(roles: Role[], opts: MiddlewareOpts = {}) {
  return (handler: Handler) =>
    (req: Request, routeCtx?: NextRouteContext) =>
      runPipeline(req, routeCtx, { requireAuth: true, roles, ...opts }, handler);
}
```

---

## Step 16 — Update `src/lib/rbac.ts`

The old `requireAuth`/`requireRole` are still needed by existing routes during the incremental migration. Update them to throw `HttpError` instead of `Response` so the new `errorHandler` can catch them if any old code bubbles up.

```ts
// Replace the throw statements:
// BEFORE: throw unauthorized();   (throws Response)
// AFTER:  throw new HttpError(401, ErrorCodes.NOT_AUTHORIZED, 'Authentication required');

// BEFORE: throw forbidden();      (throws Response)
// AFTER:  throw new HttpError(403, ErrorCodes.NOT_AUTHORIZED, 'Insufficient permissions');
```

Also remove the `import { unauthorized, forbidden } from '@/lib/api-response'` line and add `import { HttpError, ErrorCodes } from '@/lib/errors'`.

Existing routes that have `if (e instanceof Response) return e` will no longer trigger — but that's fine, they'll now hit the generic `500` catch which is also fine until those routes are migrated.

---

## Step 17 — Update `src/lib/api-response.ts`

Keep all existing helpers intact. Add one new export at the bottom:

```ts
import { HttpError } from '@/lib/errors';

export function fail(
  status  : number,
  code    : string,
  message : string,
  details?: Record<string, unknown>
): never {
  throw new HttpError(status, code, message, details);
}
```

---

## Step 18 — Update `next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io'],
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',          value: 'DENY' },
        { key: 'X-Content-Type-Options',   value: 'nosniff' },
        { key: 'X-DNS-Prefetch-Control',   value: 'off' },
        { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security',value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    }];
  },
};

export default nextConfig;
```

---

## Step 19 — Update RTK Query Error Handling

Each slice in `src/store/api/` should handle the new error envelope shape. Create a shared base query with error transformation:

```ts
// src/store/api/baseQuery.ts (new shared file)
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('wallpainter_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Reuse in every createApi: baseQuery: baseQuery
```

On the client side, after migration:
```ts
// Never parse strings — check the error code
if (err.data?.code === 'APPROVED_LOCKED') { /* handle specifically */ }
toast.error(err.data?.message ?? 'Something went wrong');
console.log(`Request ID for support: ${err.data?.requestId}`);
```

---

## Usage Examples for New Routes

These are the patterns to use when writing any new route (submissions, file generation, etc.):

```ts
// 1. Public endpoint with rate limiting
export const POST = withMiddleware({ rateLimit: 'strict', schema: LoginSchema })(
  async (req, ctx) => {
    const { identifier, password } = ctx.body as LoginInput;
    // ...
    return Response.json({ data: { token, user } });
  }
);

// 2. Any authenticated user
export const GET = withAuth()(
  async (req, ctx) => {
    // ctx.user is available
    return Response.json({ data: {} });
  }
);

// 3. Role gate only
export const POST = withRole(['owner'], { schema: CreateJobSchema, audit: 'JOB_CREATE', rateLimit: 'standard' })(
  async (req, ctx) => {
    const job = await Job.create({ ...ctx.body, ownerId: ctx.user!.userId, status: 'active' });
    return Response.json({ data: job }, { status: 201 });
  }
);

// 4. Role gate + job access (ctx.job populated)
export const GET = withRole(['owner', 'painter'], { access: requireJobAccess })(
  async (req, ctx) => {
    return Response.json({ data: ctx.job });
  }
);

// 5. Owner-only job route
export const DELETE = withRole(['owner'], { access: requireJobOwner, audit: 'JOB_DELETE' })(
  async (req, ctx) => {
    await Job.findByIdAndDelete(ctx.job!._id);
    return Response.json({ data: { message: 'Job deleted' } });
  }
);

// 6. Submission with dynamic audit name
export const PUT = withRole(['owner'], { access: [requireJobOwner, requireSubmissionAccess], schema: ApproveSchema })(
  async (req, ctx) => {
    const { submissionId } = ctx.params;
    // ... approve logic ...
    ctx.setAudit('SUBMISSION_APPROVE', { type: 'Submission', id: submissionId });
    return Response.json({ data: { message: 'Approved' } });
  }
);

// 7. Painter submitting to a job they're assigned to
export const POST = withRole(['painter'], { access: requireJobAccess, schema: CreateSubmissionSchema, audit: 'SUBMISSION_CREATE' })(
  async (req, ctx) => {
    const submission = await Submission.create({ ...ctx.body, painterId: ctx.user!.userId, jobId: ctx.params.jobId });
    return Response.json({ data: submission }, { status: 201 });
  }
);

// 8. ctx.fail for business logic errors
export const PUT = withRole(['painter'], { access: [requireJobAccess, requireSubmissionAccess], schema: UpdateSubmissionSchema })(
  async (req, ctx) => {
    if (ctx.submission!.status === 'approved') {
      ctx.fail(409, 'APPROVED_LOCKED', 'This submission is approved and cannot be edited', {
        submissionId: ctx.params.submissionId,
        status: ctx.submission!.status,
      });
    }
    // ...
  }
);
```

---

## Error Envelope Reference

Every error from every endpoint:
```json
{
  "error": {
    "code":      "APPROVED_LOCKED",
    "message":   "This submission is approved and cannot be edited",
    "details":   { "submissionId": "65f0...", "status": "approved" },
    "requestId": "req_01HXY8..."
  }
}
```

### Known Error Codes

| Code | Status | Trigger |
|------|--------|---------|
| `EMAIL_TAKEN` | 409 | `POST /auth/register` — email already exists |
| `INVALID_CREDENTIALS` | 401 | `POST /auth/login` — wrong password |
| `ACCOUNT_DISABLED` | 403 | Login — suspended or inactive account |
| `NOT_AUTHORIZED` | 401/403 | Missing token / expired token / wrong role / not resource owner |
| `NOT_ASSIGNED_TO_JOB` | 403 | Painter accessing a job they're not part of |
| `APPROVED_LOCKED` | 409 | Editing an already-approved submission |
| `ALREADY_PENDING` | 409 | Owner revoking something already pending |
| `NO_APPROVED_SUBMISSIONS` | 422 | File generation with zero approvals |
| `INVALID_SELECTION` | 400 | Approve with image IDs not on the submission |
| `NOT_LINKED` | 403 | Owner viewing a painter outside their jobs |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Zod parse failure |
| `RATE_LIMITED` | 429 | Sliding window exceeded |
| `INTERNAL` | 500 | Unhandled exception |

---

## Migration Strategy for Existing Routes

**No rush.** Existing routes keep working. Migrate when you touch them.

Priority order:
1. **Auth routes** — get rate limiting on login/register immediately
2. **Job/submission mutation routes** — get audit trail
3. **Read-only routes** — lowest urgency

Migration diff (single route):
```ts
// BEFORE — 18 lines of boilerplate
export async function POST(request: Request) {
  try {
    const payload = await requireAuth(request);
    if (payload.role !== 'owner') return forbidden();
    const parsed = CreateJobSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);
    await connectDB();
    const job = await Job.create({ ...parsed.data, ownerId: payload.userId, status: 'active' });
    return ok(job, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[POST /api/jobs]', e);
    return err('Failed to create job', 500);
  }
}

// AFTER — 4 lines of handler logic
export const POST = withRole(['owner'], { schema: CreateJobSchema, audit: 'JOB_CREATE', rateLimit: 'standard' })(
  async (req, ctx) => {
    const job = await Job.create({ ...ctx.body, ownerId: ctx.user!.userId, status: 'active' });
    return Response.json({ data: job }, { status: 201 });
  }
);
```

---

## Implementation Order

1. `npm install pino && npm install -D pino-pretty`
2. `src/lib/errors.ts`
3. `src/lib/models/AuditLog.ts` + update models/index.ts
4. `src/lib/middleware/requestId.ts`
5. `src/lib/middleware/logger.ts`
6. `src/lib/middleware/cors.ts`
7. `src/lib/middleware/helmet.ts`
8. `src/lib/middleware/rateLimit.ts`
9. `src/lib/middleware/auth.ts`
10. `src/lib/middleware/requireRole.ts`
11. `src/lib/middleware/requireJobAccess.ts`
12. `src/lib/middleware/requireJobOwner.ts`
13. `src/lib/middleware/requireSubmissionAccess.ts`
14. `src/lib/middleware/requireUserAccess.ts`
15. `src/lib/middleware/validate.ts`
16. `src/lib/middleware/audit.ts`
17. `src/lib/middleware/errorHandler.ts`
18. `src/lib/middleware/index.ts` ← ties everything together
19. Update `src/lib/rbac.ts`
20. Update `src/lib/api-response.ts`
21. Update `next.config.ts`
22. Migrate 2–3 auth routes as smoke test

---

## Verification Checklist

- [ ] `npm install` succeeds, `npx tsc --noEmit` passes with zero errors
- [ ] `POST /api/auth/login` (wrong password) → `{ error: { code: "INVALID_CREDENTIALS", requestId: "req_..." } }`
- [ ] `POST /api/auth/login` × 6 in 15 min from same IP → HTTP 429, `Retry-After` header, `code: "RATE_LIMITED"`
- [ ] Every response has `x-request-id` header matching the `requestId` in any error body
- [ ] Every API response has `X-Frame-Options: DENY` and `Cache-Control: no-store`
- [ ] Server logs show structured JSON: `requestId`, `method`, `path`, `status`, `duration`, `userId`
- [ ] `POST /api/jobs` (success as owner) → `AuditLog` collection has entry with matching `requestId`, `action: "JOB_CREATE"`, correct `userId`
- [ ] `throw new Error('boom')` inside a handler → HTTP 500, `code: "INTERNAL"`, NO stack in response, full stack in server logs
- [ ] `OPTIONS /api/jobs` → HTTP 204 with CORS headers, no handler invoked
- [ ] Unauthenticated request to `/api/jobs` → HTTP 401, `code: "NOT_AUTHORIZED"`
- [ ] Painter requesting owner-only route → HTTP 403, `code: "NOT_AUTHORIZED"`
- [ ] Painter requesting submission they don't own → HTTP 403, `code: "NOT_AUTHORIZED"`
- [ ] `GET /api/health` still returns 200 (no regression on public routes)
