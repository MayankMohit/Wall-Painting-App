# Backend Architecture

The backend is a thin App Router API layer over MongoDB + Redis, with slow work pushed to a separate BullMQ worker process. Every route handler is built by composing one of three helpers — `withMiddleware`, `withAuth`, `withRole` — which wire the 12-step request lifecycle. Service logic lives in `src/lib/*`; workers live in `workers/*` and run as a separate PM2 process in production.

This file covers: the request lifecycle, the middleware composers, the service layer organisation, the worker process, the error envelope, the audit log, and how the pieces fit together.

For the full endpoint catalogue see `06-API-SPECIFICATION.md`. For data models see `05-DATABASE-SCHEMA.md`.

---

## The request lifecycle (12 steps)

Every API request flows through the same ordered stack. Composers (`withMiddleware`, `withAuth`, `withRole`) wire in only the steps that route needs — auth-public endpoints skip 06–08, etc.

```
01 requestId      Assign trace ID, attach to request + response headers + log context
02 logger         Pino structured request log (method, path, status, duration, requestId)
03 cors           Allow same-origin + NEXT_PUBLIC_APP_URL only
04 helmet         CSP, X-Frame-Options DENY, HSTS, Referrer-Policy
05 rateLimit      Per-IP + per-user windows (Redis-backed sliding window)
06 auth           Verify JWT, check blacklist + force-logout flag, hydrate ctx.user
07 requireRole    RBAC role gate (only specified roles allowed past)
08 requireAccess  Resource-ownership gate (requireJobAccess, requireSubmissionAccess, etc.)
09 validate       Zod parse of body / query / params → typed ctx.body / ctx.query
10 HANDLER        Your route logic — the terminal step
11 audit          Persist successful state-changing action to AuditLog
12 errorHandler   Catch anything thrown → JSON envelope { error: { code, message, … } }
```

Each step either passes control forward (sets `ctx.*` fields) or short-circuits with `ctx.fail(status, code, details?)`. `errorHandler` is the only step that runs unconditionally — it wraps the whole chain in `try/catch` so a thrown error anywhere becomes a clean envelope response.

---

## Middleware composers

There are three composers, all exported from `src/lib/middleware/index.ts`. Pick the smallest that fits the route.

### `withMiddleware(opts, handler)`

The base composer. Use for public endpoints or endpoints that opt into custom middleware.

```ts
// app/api/auth/register/route.ts
import { withMiddleware } from '@/lib/middleware';
import { registerSchema } from '@/lib/validators';

export const POST = withMiddleware(
  {
    rateLimit: { max: 5, windowMs: 15 * 60_000 },
    schema   : registerSchema,
  },
  async (req, ctx) => {
    const { email, password, name, phone, role } = ctx.body;
    // ... handler logic
  }
);
```

Opts:

| Option | Type | Default |
|---|---|---|
| `rateLimit` | `{ max, windowMs, keyBy?: 'ip' \| 'user' }` | none |
| `schema` | Zod schema | none |
| `audit` | `string` event name | derived from path if omitted |
| `cache` | `{ ttlMs: number, key?: (ctx) => string }` | none |

### `withAuth(handler)` and `withAuth(...accessChecks, opts, handler)`

Adds step 06 (auth). Anything else (role check, access check, validation) is bolted on by passing it as a positional argument.

```ts
// app/api/jobs/[jobId]/route.ts
import { withAuth } from '@/lib/middleware';
import { requireJobAccess } from '@/lib/middleware/requireJobAccess';

export const GET = withAuth(requireJobAccess, async (_, ctx) => {
  // ctx.job is populated by requireJobAccess
  return NextResponse.json({ job: ctx.job });
});
```

### `withRole(roles, handler)` and variants

Shortcut for `withAuth + requireRole`.

```ts
// app/api/jobs/route.ts (POST)
import { withRole } from '@/lib/middleware';
import { jobSchema } from '@/lib/validators';

export const POST = withRole(['owner'], { schema: jobSchema }, async (_, ctx) => {
  const job = await Job.create({ ...ctx.body, ownerId: ctx.user.id, status: 'active' });
  // …
});
```

Argument shape (in order; only `roles` is required):

```ts
withRole(
  roles: Role[],
  ...accessChecks: AccessCheck[],  // requireJobOwner, requireSubmissionAccess, …
  opts: { schema?, rateLimit?, audit?, cache? },
  handler: (req, ctx) => Promise<Response>
)
```

---

## The `ctx` object

Every handler receives `(req, ctx)`. `ctx` is the per-request context built up by middleware. Its shape:

```ts
type Ctx = {
  // Always present
  requestId: string;
  ip       : string;
  logger   : Pino.Logger;                          // child logger with requestId bound
  fail     : (status: number, code: string, details?: object) => Response;

  // Set by validate()
  body?    : unknown;                              // typed once you've declared schema
  query?   : unknown;
  params   : Record<string, string>;               // from Next.js dynamic segments

  // Set by auth()
  user?    : { id: string; role: 'painter' | 'owner' | 'admin'; email: string };
  token?   : { jti: string; exp: number };

  // Set by access checks (only when used)
  job?         : Job;
  submission?  : Submission;
};
```

`ctx.fail` is the canonical way handlers signal errors. It throws a `HttpError` that `errorHandler` catches and serialises into the envelope.

---

## Service layer (`src/lib/`)

Handlers stay thin. Anything reusable lives in `src/lib`:

```
src/lib/
├── middleware/
│   ├── index.ts                # withMiddleware, withAuth, withRole
│   ├── requestId.ts
│   ├── logger.ts               # pino
│   ├── cors.ts
│   ├── helmet.ts
│   ├── rateLimit.ts            # Redis sliding window
│   ├── auth.ts                 # JWT verify + blacklist + force-logout check
│   ├── requireRole.ts
│   ├── requireJobAccess.ts     # painter on job, owner of job, or admin
│   ├── requireJobOwner.ts      # ONLY the job's owner, or admin
│   ├── requireSubmissionAccess.ts
│   ├── requireUserAccess.ts    # owner sees painters they share a job with
│   ├── validate.ts             # Zod adapter
│   ├── audit.ts                # writes AuditLog
│   ├── errorHandler.ts
│   └── idempotency.ts          # for /files/generate dedup
│
├── auth/
│   ├── jwt.ts                  # sign, verify, jti generation
│   └── password.ts             # bcrypt helpers
│
├── validators/                 # Zod schemas — same source for client + server
│   ├── auth.ts                 # registerSchema, loginSchema, …
│   ├── job.ts                  # jobSchema, jobUpdateSchema
│   ├── submission.ts           # submissionSchema, submissionUpdateSchema, approveSchema, rejectSchema
│   ├── user.ts                 # profileSchema, fcmSchema, pwdChangeSchema
│   └── index.ts                # barrel
│
├── notify/
│   ├── emit.ts                 # notify.emit(eventId, { recipientId, data })
│   ├── templates.ts            # push body + email HTML + in-app body, per event
│   └── events.ts               # NOTIF_EVENTS catalog
│
├── audit.ts                    # audit(action, userId, meta) → AuditLog.create
├── cloudinary.ts               # sign helper, delete helper
├── r2.ts                       # upload, signedUrl(ttl), delete, usage
├── firebase-fcm.ts             # init admin SDK, sendToUser, prune-on-failure
├── resend.ts                   # email() with template rendering
├── redis.ts                    # ioredis singleton
├── queues.ts                   # BullMQ queue definitions
├── mongoose.ts                 # connection + lifecycle
├── models/                     # Mongoose models (see 05-DATABASE-SCHEMA.md)
└── utils/
    ├── parseQuery.ts
    ├── sanitize.ts             # User.toSafeJSON
    ├── pagination.ts
    └── http-error.ts           # HttpError class
```


## Error envelope

Every error from every endpoint returns this shape:

```json
{
  "error": {
    "code"     : "APPROVED_LOCKED",
    "message"  : "This submission is approved and cannot be edited",
    "details"  : { "submissionId": "65f0…", "status": "approved" },
    "requestId": "req_01HXY8…"
  }
}
```

`errorHandler` catches:

- `HttpError` thrown by `ctx.fail(...)` → serialises directly.
- `ZodError` → 400 with `code: 'VALIDATION_FAILED'`, `details: { issues }`.
- Anything else → 500 with `code: 'INTERNAL'`, the full stack logged server-side via Pino, and `requestId` returned so the user can quote it to support.

See `09-SECURITY.md` for the full known-error-code inventory.

---

## Caching

Three places where caching matters:

1. **Read-heavy GET endpoints** — `GET /api/jobs`, `GET /api/jobs/:jobId`, `GET /api/admin/stats`. Each handler is wrapped with `cache({ ttlMs })` middleware that stores the response body in Redis keyed by `({ path, query, userId })`. TTLs are short (15–60s). Writes always invalidate by tag.
2. **MongoDB query layer** — `.lean()` everywhere we don't need Mongoose hydration. `populate` is targeted (field-selected) to keep payloads small.
3. **RTK Query** on the frontend — automatic per-endpoint cache with tag-based invalidation. See `03-FRONTEND-ARCHITECTURE.md`.

Caching is NEVER used for mutations or for endpoints that read recently-mutated state from the same user. Don't cache `GET /api/auth/me` — it's used to bounce-check after admin actions.

---

## Health & version

Public, unauthenticated:

- `GET /api/health` — pings Mongo, Redis, BullMQ. Returns `{ status: 'ok' | 'degraded', services, uptime }`.
- `GET /api/version` — returns `{ version, commit, env }`.

UptimeRobot pings `/api/health` every 5 minutes; failures email the admin.

---

## What lives where (cheat sheet)

| Concern | File / folder |
|---|---|
| Route handlers | `src/app/api/**/route.ts` |
| Middleware composers | `src/lib/middleware/index.ts` |
| Access checks | `src/lib/middleware/require*.ts` |
| Zod schemas | `src/lib/validators/*.ts` |
| Mongoose models | `src/lib/models/*.ts` |
| Auth (JWT, password) | `src/lib/auth/*.ts` |
| Cloudinary signing | `src/lib/cloudinary.ts` |
| R2 (upload, signedUrl) | `src/lib/r2.ts` |
| FCM admin | `src/lib/firebase-fcm.ts` |
| Email (Resend + react-email) | `src/lib/resend.ts`, `emails/*.tsx` |
| Notification emit | `src/lib/notify/emit.ts` |
| Queues | `src/lib/queues.ts` |
| Redis singleton | `src/lib/redis.ts` |
| Audit | `src/lib/audit.ts` |
| Workers | `workers/*.ts` |
| PM2 process config | `ecosystem.config.js` |
