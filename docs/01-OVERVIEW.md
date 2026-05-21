# Wall Painter App — System Overview

**Version:** v1.0 — Production Blueprint
**Last Updated:** May 2026
**Stack:** Next.js 16 · React 19 · TypeScript 5 · MongoDB · Redis · BullMQ · Cloudinary · Cloudflare R2 · Firebase FCM · Resend · Oracle Cloud (Ubuntu 22.04 + Nginx + PM2)

---

## What this app does

A field-ops tool for wall-painting contractors. Painters in the field upload multi-angle photos of finished walls with sizes and locations; owners review, curate angles, approve submissions, and export print-ready Excel/PDF deliverables. Three roles share one Next.js codebase; visibility is enforced by middleware, not by separate apps.

| Role | What they do |
|---|---|
| **Painter** | Picks a job, uploads multi-angle photos straight from phone to Cloudinary, fills `photoNo`/`location`/`sizes`, submits. Can edit while `pending` or `rejected`. |
| **Owner** | Reviews each submission, picks one or two angles to keep, approves (which mints a per-job 4-digit `generatedNumber`, watermarks the kept photos, and uploads to R2), rejects with reason, or revokes back to pending. Triggers Excel / Photos-PDF / File-PDF exports. |
| **Admin** | Reads dashboard stats, audit logs, queue health, and storage usage. Retries failed background jobs. Suspends users. |

---

## Architecture at a glance

```
                            ┌───────────────────────────────────────┐
                            │     Next.js 16 App (App Router)       │
                            │   Same codebase, role-aware routes    │
                            └───────────────────────────────────────┘
                                          │
                  ┌───────────────────────┼────────────────────────┐
                  ▼                       ▼                        ▼
            Painter pages           Owner pages             Admin pages
       (auth)/ (painter)/      (owner)/  (jobs, files)    (admin)/ (stats, logs)
                  │                       │                        │
                  └───────────────────────┼────────────────────────┘
                                          │
                              ┌───────────▼────────────┐
                              │   /api/* route handlers│
                              │   withMiddleware()     │
                              │   withAuth()           │
                              │   withRole()           │
                              └───────────┬────────────┘
                                          │
   ┌──────────────────┬───────────────────┼────────────────────┬──────────────────┐
   ▼                  ▼                   ▼                    ▼                  ▼
MongoDB Atlas      Cloudinary       Cloudflare R2          Upstash Redis      Firebase FCM
(users, jobs,      (raw painter     (watermarked photos,    (BullMQ queues,   (push)
 submissions,       uploads, CDN)    Excel/PDF exports)     cache, blacklist,
 photos, files,                                              SSE pubsub)       Resend
 audit, notifs)                                                                (email)
                                          │
                              ┌───────────▼────────────┐
                              │  Workers (PM2 process) │
                              │  watermarkWorker       │
                              │  fileGenWorker         │
                              │  notifyWorker          │
                              │  assetCleanupWorker    │
                              └────────────────────────┘
```

Two PM2 processes run side-by-side on a single Oracle Cloud VM: `wp-api` (the Next.js server) and `wp-worker` (the BullMQ workers). Nginx terminates TLS in front and reverse-proxies to port 3001.

---

## The shape of a request

Every request flows through the same 12-step middleware stack assembled by `withMiddleware` / `withAuth` / `withRole`:

```
01 requestId      → 02 logger     → 03 cors       → 04 helmet
05 rateLimit      → 06 auth       → 07 requireRole → 08 requireAccess
09 validate (Zod) → 10 HANDLER    → 11 audit      → 12 errorHandler
```

---

## The core data flow

```
PAINTER PHONE                    SERVER                          OWNER PHONE
─────────────                    ──────                          ───────────
 1. /uploads/sign  ───────►
    (×N angles)
 2. POST direct to Cloudinary
    (bytes never touch server)
 3. POST /submissions  ─────────►  Submission { status: 'pending' }
                                   FCM push  ────────────────────►  "New submission"
                                   In-app notification row
                                                                    Owner reviews,
                                                                    picks angles.
                                ◄──── POST /submissions/:id/approve
                                      { selectedImageIds: [...] }
                                   Job.$inc nextGeneratedNumber
                                   Photo.generatedNumber = '#0042'
                                   watermarkQueue.add(...)
                                                                    (async)
                                   BullMQ watermarkWorker:
                                     sharp.composite(SVG #0042)
                                     R2.upload(watermarked/...)
                                     Photo.watermarkedUrl = ...
                                   Submission.status = 'approved'
       ◄──── FCM "Approved ✓"
                                                                    Owner exports:
                                                                ◄── POST /files/generate
                                                                    { type: 'excel' }
                                   fileGenQueue.add(...)
                                                                    202 + taskId
                                                                ◄── GET /generation-status
                                   Worker: ExcelJS/PDFKit
                                   R2.upload(exports/...)
                                                                    "ready"
                                                                ◄── GET /files/:id/download
                                   R2 signed URL (24h)
                                                                    [downloads]
```

---

## Two numbers that are easy to confuse

- **`Submission.photoNo`** — painter-entered integer (the number they wrote on the wall or in their notebook). NOT unique within a job; two painters can both use `5`. Shown in the Excel "PHOTO NO." column.
- **`Photo.generatedNumber`** — system-assigned, 4-digit zero-padded code like `#0042`. Unique per job (atomic `$inc`). One per IMAGE, assigned at approval time only. Stamped onto the photo as a watermark and printed inside the File PDF's paste box.

Pending and rejected submissions never consume `generatedNumber` slots, so a rejected painting doesn't burn `#0042`.

---

## Tech stack summary

| Layer | Technology | Why | Free tier |
|---|---|---|---|
| Runtime | Next.js 16 (App Router) | One framework for pages + API | — |
| UI | React 19, Tailwind CSS v4, shadcn/ui | Compiler enabled, no manual memos | — |
| Forms | React Hook Form + Zod | Same schemas reused server-side | — |
| Client state | Zustand (auth, UI) | Tiny, persistent for auth | — |
| Server state | Redux Toolkit + RTK Query | Cached, normalised, optimistic updates | — |
| DB | MongoDB Atlas | Document model fits jobs/submissions cleanly | 5 GB |
| Image CDN | Cloudinary | Direct-upload from phones | 25 GB storage + 25 GB delivery/mo |
| File storage | Cloudflare R2 | Zero egress for big PDF downloads | 10 GB |
| Queues + cache + pubsub | Upstash Redis | One service does three jobs | 10k commands/day |
| Background workers | BullMQ | Durable retries on Redis | (Upstash) |
| Push | Firebase Cloud Messaging | Web push to PWA | Unlimited |
| Email | Resend + react-email | Templated transactional email | 100/day, 3k/mo |
| Observability | Pino structured logs + Sentry | Tied to `requestId` | Free tier |
| Hosting | Oracle Cloud Always Free (VM.Standard.A1.Flex) | Single VM, Nginx + PM2 + Certbot | Always free |

See `02-TECH-STACK.md` for versions and install order.

---

## Key architectural decisions

1. **One canonical route per resource.** No `/api/owners/:ownerId/jobs` parallel tree — `/api/jobs` filters by the user's role and ID derived from the JWT. Painter sees only jobs they're on; owner sees only jobs they created; admin sees everything.
2. **Direct-to-Cloudinary uploads.** Painter phones POST bytes straight to Cloudinary after a server-signed payload. The Next.js server never sees raw image bytes — saves bandwidth, sidesteps function timeouts on slow LTE.
3. **Per-job atomic counter for `generatedNumber`.** A single `Job.nextGeneratedNumber` field incremented by `$inc` under MongoDB's storage-engine lock. No race conditions across concurrent owner approvals.
4. **Approval is when watermarking happens, not submission.** Painters can upload as many failed attempts as they want; counter slots aren't burned until the owner curates and approves.
5. **Two image storage tiers.** Cloudinary holds raw painter uploads (cheap, CDN-fronted). R2 holds watermarked copies + generated PDFs/Excels (zero egress — owner downloads cost nothing).
6. **BullMQ for anything slow.** Watermarking, file generation, FCM dispatch, asset cleanup. Workers run in a separate PM2 process so a slow PDF never blocks the API.
7. **One notification function, three channels.** Handlers call `notify.emit(eventId, data)` once. Push (FCM), email (Resend), and in-app bell (Mongo + SSE) fan out behind that single call.
8. **Single error envelope.** Every error from every endpoint returns `{ error: { code, message, details, requestId } }`. Clients never branch on HTTP status alone — `code` is the contract.
9. **Audit log is mandatory, not optional.** Every state-changing handler ends with `await audit('action.name', userId, meta)`. Admin queries this via `/api/admin/logs`.
10. **No NextAuth.** Hand-rolled JWT + Redis blacklist + bcrypt. Four short handlers + three middleware = the whole auth system. Swap in only if OAuth providers become a requirement.

---

## Where to go next

- **Building backend?** → `04-BACKEND-ARCHITECTURE.md` + `05-DATABASE-SCHEMA.md`
- **Building frontend?** → `03-FRONTEND-ARCHITECTURE.md`
- **Wiring an API endpoint?** → `06-API-SPECIFICATION.md`
- **Notifications?** → `07-NOTIFICATIONS.md`
