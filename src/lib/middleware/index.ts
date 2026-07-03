import { after }                           from 'next/server';
import { generateRequestId }              from './requestId';
import { createRequestLogger }             from './logger';
import { handlePreflight, applyCorsHeaders } from './cors';
import { applyHelmetHeaders }              from './helmet';
import { checkRateLimit }                  from './rateLimit';
import type { RateLimitTier }              from './rateLimit';
import { extractAndVerifyToken }           from './auth';
import { assertRole }                      from './requireRole';
import type { Role }                       from './requireRole';
import { validateBody }                    from './validate';
import { writeAuditLog }                   from './audit';
import { handleError }                     from './errorHandler';
import { HttpError }                       from '@/lib/errors';
import type { Logger }                     from 'pino';
import type { TokenPayload }               from '@/lib/auth';
import type { HydratedDocument }           from 'mongoose';
import type { IJob }                       from '@/lib/models/Job';
import type { ISubmission }                from '@/lib/models/Submission';
import type { ZodTypeAny }                 from 'zod';

export type { Role };

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
  job?       : HydratedDocument<IJob>;
  submission?: HydratedDocument<ISubmission>;
  // Internal — written by setAudit, read by pipeline after handler
  _audit?    : { action: string; resource?: { type: string; id: string }; metadata?: Record<string, unknown> };
};

export type MiddlewareOpts = {
  rateLimit? : RateLimitTier;
  schema?    : ZodTypeAny;
  audit?     : string;
  access?    : AccessCheck | AccessCheck[];
};

type PipelineConfig = MiddlewareOpts & {
  requireAuth?: boolean;
  roles?      : Role[];
};

type Handler         = (req: Request, ctx: Ctx) => Promise<Response>;
type NextRouteContext = { params?: Promise<Record<string, string>> };

function logRequest(
  logger  : Logger,
  req     : Request,
  status  : number,
  duration: number,
  userId  : string | undefined,
  ip      : string
): void {
  const level = status >= 500 ? 'error'
              : status >= 400 ? 'warn'
              : duration > 1000 ? 'warn'
              : 'info';
  logger[level]({
    method  : req.method,
    path    : new URL(req.url).pathname,
    status,
    duration: `${duration}ms`,
    userId,
    ip,
  });
}

async function runPipeline(
  req      : Request,
  routeCtx : NextRouteContext | undefined,
  config   : PipelineConfig,
  handler  : Handler
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = generateRequestId();
  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const origin    = req.headers.get('origin');
  const logger    = createRequestLogger(requestId);

  // Step 03: handle OPTIONS preflight before anything else
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const ctx: Ctx = {
    requestId,
    ip,
    logger,
    params  : routeCtx?.params ? await routeCtx.params : {},
    fail    : (status, code, message, details) => { throw new HttpError(status, code, message, details); },
    setAudit: (action, resource, metadata)     => { ctx._audit = { action, resource, metadata }; },
  };

  try {
    // Step 05a: rate limit by IP (before auth)
    if (config.rateLimit) {
      await checkRateLimit(config.rateLimit, ip, 'ip');
    }

    // Step 06: verify JWT → populate ctx.user
    if (config.requireAuth) {
      ctx.user = extractAndVerifyToken(req);

      // Step 05b: tighten rate limit to per-user window now we know who this is
      if (config.rateLimit) {
        await checkRateLimit(config.rateLimit, ctx.user.userId, 'user');
      }
    }

    // Step 07: role gate
    if (config.roles?.length && ctx.user) {
      assertRole(ctx.user, config.roles);
    }

    // Step 07b: read-only (demo/panel) accounts can view everything but change
    // nothing — every non-GET is blocked here so new write routes are covered
    // automatically. Session upkeep and per-user cosmetic writes stay allowed
    // so the account remains usable while browsing.
    if (ctx.user?.readOnly && req.method !== 'GET') {
      const pathname = new URL(req.url).pathname;
      const allowed = /^\/api\/(auth\/(refresh|logout)|notifications\/(read-all|[^/]+\/read)|users\/me\/fcm-token)$/.test(pathname);
      if (!allowed) {
        throw new HttpError(403, 'READ_ONLY_ACCOUNT', 'This demo account is read-only — write actions are disabled.');
      }
    }

    // Step 08: resource access checks — run in order, each populates ctx.job / ctx.submission
    const checks = config.access
      ? (Array.isArray(config.access) ? config.access : [config.access])
      : [];
    for (const check of checks) {
      await check(req, ctx);
    }

    // Step 09: parse + validate request body into ctx.body
    if (config.schema) {
      await validateBody(req, config.schema, ctx);
    }

    // Step 10: route handler
    const response = await handler(req, ctx);
    const duration = Date.now() - startedAt;

    // Step 11: audit — runs after response is sent via after() so Next.js won't drop it
    const auditAction = ctx._audit?.action ?? config.audit;
    if (auditAction && req.method !== 'GET') {
      const auditOpts = {
        action    : auditAction,
        requestId,
        userId    : ctx.user?.userId ?? (ctx._audit?.metadata?.userId as string | undefined),
        userName  : ctx.user?.name,
        userRole  : (ctx.user?.role ?? ctx._audit?.metadata?.role) as 'painter' | 'owner' | 'admin' | undefined,
        ip,
        userAgent : req.headers.get('user-agent') ?? undefined,
        statusCode: response.status,
        duration,
        resource  : ctx._audit?.resource,
        metadata  : ctx._audit?.metadata,
      };
      after(() => writeAuditLog(auditOpts, logger));
    }

    // Step 04: apply security + CORS headers
    applyHelmetHeaders(response.headers);
    applyCorsHeaders(response.headers, origin);
    response.headers.set('x-request-id', requestId);

    // Step 02: structured request log — level by outcome
    logRequest(logger, req, response.status, duration, ctx.user?.userId, ip);

    return response;

  } catch (err) {
    // Step 12: catch everything thrown above → serialize to error envelope
    const response = handleError(err, requestId, logger);
    const duration = Date.now() - startedAt;

    // Also audit failed state-changing requests (failed logins, 403s, etc.)
    const auditAction = ctx._audit?.action ?? config.audit;
    if (auditAction && req.method !== 'GET') {
      const auditOpts = {
        action    : auditAction,
        requestId,
        userId    : ctx.user?.userId ?? (ctx._audit?.metadata?.userId as string | undefined),
        userName  : ctx.user?.name,
        userRole  : (ctx.user?.role ?? ctx._audit?.metadata?.role) as 'painter' | 'owner' | 'admin' | undefined,
        ip,
        userAgent : req.headers.get('user-agent') ?? undefined,
        statusCode: response.status,
        duration,
        resource  : ctx._audit?.resource,
        metadata  : ctx._audit?.metadata,
      };
      after(() => writeAuditLog(auditOpts, logger));
    }

    applyHelmetHeaders(response.headers);
    applyCorsHeaders(response.headers, origin);
    response.headers.set('x-request-id', requestId);

    logRequest(logger, req, response.status, duration, ctx.user?.userId, ip);

    return response;
  }
}

// ── Public composers ──────────────────────────────────────────────────────────

// Public endpoints — no auth required
export function withMiddleware(opts: MiddlewareOpts = {}) {
  return (handler: Handler) =>
    (req: Request, routeCtx?: NextRouteContext) =>
      runPipeline(req, routeCtx, opts, handler);
}

// Any authenticated user
export function withAuth(opts: MiddlewareOpts = {}) {
  return (handler: Handler) =>
    (req: Request, routeCtx?: NextRouteContext) =>
      runPipeline(req, routeCtx, { ...opts, requireAuth: true }, handler);
}

// Authenticated + specific role(s) required
export function withRole(roles: Role[], opts: MiddlewareOpts = {}) {
  return (handler: Handler) =>
    (req: Request, routeCtx?: NextRouteContext) =>
      runPipeline(req, routeCtx, { ...opts, requireAuth: true, roles }, handler);
}
