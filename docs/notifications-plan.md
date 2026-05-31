# Notifications System — Implementation Plan (v2)

> This file supersedes the earlier v1 plan. It merges `docs/07-NOTIFICATIONS.md` (architecture), the v1 plan, and the v1.1 architecture notes into one authoritative executable reference.

---

## Context

The app needs an event-driven notification system across three channels: **in-app** (bell UI), **push** (FCM), and **email** (Resend). Current state:

- `Notification` model, `firebase-admin`, `firebase-client`, `email.ts` (auth emails only), and `fcmTokens[]` on `User` all exist.
- `approve/route.ts` and `reject/route.ts` fire FCM **ad-hoc inline** (raw token loops + `Notification.create`).
- All 4 notification API routes are **501 stubs**.
- `bull` is in `package.json` but **not imported anywhere** — clean migration to BullMQ.
- No central dispatch, no event catalog, no queue/worker, no preferences, no frontend.

---

## Architecture

```
Route handler
  └─ notify.emit(eventId, { recipientId?, data })
       ├─ Resolve audience (explicit / role / resolver / all)
       ├─ Union channels per recipient, dedup users
       ├─ [sync]  Notification.create(...)          ← in-app row, always
       │          + redis.publish('notif:userId')   ← SSE real-time update
       └─ [async] notifyQueue.add('push'|'email'|'fanout', ...)
                  └─ notifyWorker:
                       push   → sendFcmToUser()
                       email  → renderTemplate() + resend.emails.send()
                       fanout → cursor all users, bulk insertMany + enqueue
```

**Redis clients — two separate, never mixed:**
- `src/lib/redis.ts` — node-redis (OTP, rate-limit, cache, pub/sub publish)
- `src/lib/queues.ts` — ioredis (BullMQ only, `maxRetriesPerRequest: null`)

**Queues:**
```
fileGenQueue      attempts:2  backoff:exp 5s   (PDF/Excel, RAM-heavy)
notifyQueue       attempts:5  backoff:exp 1s   (FCM flaky)
assetCleanupQueue attempts:3  backoff:exp 2s   (Cloudinary deletes)
```

`notifyQueue` carries three job types dispatched by `job.name`: `push`, `email`, `fanout`.

---

## Key Decisions

| Topic | Decision |
|---|---|
| Queue structure | Single `notifyQueue` (push + email + fanout jobs by `job.name`) |
| Preference schema | v1.1 — event-level `Map<eventId, bool>` with `'*'` wildcard, quiet hours, digest flag |
| Notification model | v1.1 — add `eventId`, replace `read:Boolean` → `readAt:Date\|null`, add 90-day TTL index |
| Email templates | Modular HTML — per-event files under `src/lib/templates/emails/`, swappable without changing call sites |
| FCM send | Individual `messaging.send()` loop per token; prune dead tokens on error |
| Preferences endpoint | `GET/PUT /api/users/me/notification-preferences` |
| Real-time | SSE at `GET /api/notifications/stream` (Redis pub/sub) + polling fallback |
| Dedup | BullMQ `jobId` = SHA1(`ch:eventId:userId:data`) — natural in-queue dedup |
| Workers entry | `workers/notifyWorker.ts` (PM2 target) |
| account.approved/rejected | `emit()` handles in-app + push; bespoke `sendOwnerApprovedEmail`/`sendOwnerRejectedEmail` kept for custom HTML |
| `read:Boolean` migration | No script needed for dev — new docs use `readAt`; old docs return `null` |

---

## Conventions to reuse

- API responses: `ok`, `created`, `badRequest`, `notFound` from `src/lib/api-response.ts`
- Auth guards: `requireAuth`, `requireRole` from `src/lib/rbac.ts`
- Zod schemas: `src/lib/validators.ts`
- Models barrel: `src/lib/models/index.ts`
- Mongoose model boilerplate: copy dev hot-reload guard from `src/lib/models/Notification.ts`
- Firebase admin singleton: `src/lib/firebase-admin.ts`
- Resend client + `FROM`: `src/lib/email.ts`
- `@/` path alias everywhere; no relative `../` imports

---

## Stage 1 — Foundation (lib + models)

### 1.1 Dependencies

```
Remove:     bull
Add:        bullmq  ioredis
Add devDep: tsx
```

### 1.2 `src/lib/queues.ts` (new)

```ts
import 'server-only';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const fileGenQueue = new Queue('fileGen', {
  connection,
  defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
});
export const notifyQueue = new Queue('notify', {
  connection,
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } },
});
export const assetCleanupQueue = new Queue('assetCleanup', {
  connection,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
});
```

`REDIS_URL`: `rediss://:pass@host:6380` for Upstash dev; `redis://:pass@127.0.0.1:6379` for prod.

### 1.3 Update `src/lib/models/Notification.ts`

- Add `eventId?: string` field
- Replace `read: Boolean` → `readAt: Date | null` (default `null`)
- Remove `updatedAt` (use `timestamps: { createdAt: true, updatedAt: false }`)
- Update indexes: `{ userId, createdAt }` + `{ userId, readAt, createdAt }`
- Add TTL index: `{ createdAt: 1 }` with `expireAfterSeconds: 7_776_000` (90 days)

### 1.4 `src/lib/models/NotificationPreference.ts` (new)

```ts
{
  userId: ObjectId (unique),
  push:   Map<string, boolean>  default: { '*': true },   // '*' = wildcard; per-eventId overrides
  email:  Map<string, boolean>  default: { '*': true },
  quietHours: { start: 'HH:MM', end: 'HH:MM', tz: 'IANA' } | null,
  digest: boolean  default: false,
  updatedAt: Date,
}
```

Export from `src/lib/models/index.ts`.

### 1.5 Email templates — modular structure

```
src/lib/templates/
  notifications.ts          ← routing map: { push?, email?, inApp? } per eventId
  emails/
    _base.ts                ← wrapEmail(body, previewText?) → full HTML string
    submissionReject.ts     ← renderSubmissionRejectEmail(data) → { subject, html }
    submissionRevoke.ts
    jobCreated.ts
    fileFailed.ts
    authPasswordReset.ts
    authPasswordChanged.ts
    authNewDevice.ts
    userSuspended.ts
    adminStorageQuota.ts
    ownerRegistered.ts
```

**Swap rule:** to upgrade to react-email, rewrite only the individual `emails/*.ts` file — same exported function name, same signature, same return type. `notifications.ts` and the worker don't change.

**`templates/notifications.ts` structure:**
```ts
export const templates: Record<string, {
  push?:  (data: Record<string, unknown>) => { title: string; body: string };
  email?: (data: Record<string, unknown>) => { subject: string; html: string };
  inApp?: (data: Record<string, unknown>) => { title: string; body: string };
}> = { ... };
```

- `push`/`inApp` — inline template literals (short strings)
- `email` — delegates to individual renderer: `(data) => renderSubmissionRejectEmail(data)`
- If `inApp` not defined, `emit()` falls back to `push` content
- If neither defined, falls back to `{ title: eventId, body: '' }`

**Events with email channel** (10 renderers needed):
`submission.reject`, `submission.revoke`, `job.created`, `file.failed`,
`auth.password_reset`, `auth.password_changed`, `auth.new_device`,
`user.suspended`, `admin.storage_quota`, `owner.registered`

### 1.6 `src/lib/notify/events.ts` (new)

Types + `NOTIF_EVENTS` catalog (21 events):

```ts
export type Channel = 'inApp' | 'push' | 'email';
export type Role    = 'painter' | 'owner' | 'admin';
export type ResolverName = 'paintersOnJob' | 'jobOwner';

export type Audience =
  | { kind: 'explicit' }
  | { kind: 'role'; role: Role }
  | { kind: 'resolver'; name: ResolverName }
  | { kind: 'all' };

export interface NotifTarget { audience: Audience; channels: Channel[]; }

export interface NotifEvent {
  id: string;
  category: 'submission' | 'job' | 'file' | 'auth' | 'admin' | 'announcement';
  urgency:  'normal' | 'urgent';
  mandatory?: boolean;
  targets: NotifTarget[];
}
```

**Event catalog (21 events):**

| Event | Audience | Channels | Urgency |
|---|---|---|---|
| `submission.create` | explicit (owner) | push, inApp | normal |
| `submission.resubmit` | explicit (owner) | push, inApp | normal |
| `submission.approve` | explicit (painter) | push, inApp | normal |
| `submission.reject` | explicit (painter) | push, email, inApp | **urgent** |
| `submission.revoke` | explicit (painter) | push, email, inApp | **urgent** |
| `submission.edited_by_owner` | explicit (painter) | inApp | normal |
| `job.created` | resolver: paintersOnJob | push, email, inApp | normal |
| `job.painter_added` | explicit (painter) | push, inApp | normal |
| `job.painter_removed` | explicit (painter) | inApp | normal |
| `job.completed` | resolver: paintersOnJob | inApp | normal |
| `file.ready` | explicit (owner) | push, inApp | normal |
| `file.failed` | explicit (owner) → push+email+inApp; role:admin → inApp | push, email, inApp | **urgent** |
| `auth.password_reset` | explicit (self) | email | normal |
| `auth.password_changed` | explicit (self) | email, inApp | normal |
| `auth.new_device` | explicit (self) | email, inApp | **urgent** |
| `user.suspended` | explicit (user) | email, inApp | **urgent**, mandatory |
| `admin.bg_job_failed` | role: admin | push, inApp | normal |
| `admin.storage_quota` | role: admin | email, inApp | normal |
| `account.approved` | explicit (owner) | push, inApp | normal |
| `account.rejected` | explicit (owner) | push, inApp | **urgent** |
| `owner.registered` | role: admin | inApp, email | normal |

### 1.7 `src/lib/notify/audiences.ts` (new)

```ts
export const RESOLVERS: Record<ResolverName, (data) => Promise<string[]>> = {
  paintersOnJob: async (data) => Job.findById(data.jobId, 'painters').lean() → painters as strings,
  jobOwner:      async (data) => Job.findById(data.jobId, 'ownerId').lean() → [ownerId as string],
};

export async function usersByRole(role: Role): Promise<string[]>
// User.find({ role, status: 'active' }, '_id').lean() → ids

export async function eachUserBatch(fn, size = 500): Promise<void>
// cursor over all active users in pages of `size`, for broadcasts
```

### 1.8 `src/lib/notify/preferences.ts` (new)

```ts
export async function getPreference(userId: string): Promise<PrefLike>
// findOne({ userId }) || default ({ push: {'*':true}, email: {'*':true}, quietHours: null, digest: false })

export function channelAllowed(pref, event, channel: 'push'|'email', now: Date): boolean
// 1. event.mandatory → true
// 2. pref[channel].get(event.id) ?? pref[channel].get('*') ?? true → if false, return false
// 3. normal urgency + quietHours active → false
// 4. return true
```

`isInQuietHours` uses `Intl.DateTimeFormat` with user's IANA timezone. Handles overnight ranges.

### 1.9 `src/lib/fcm.ts` (new)

```ts
export async function sendFcmToUser(userId, { title, body, data? }): Promise<void>
```

- Load `user.fcmTokens`; loop, `admin.messaging().send({ token, notification, webpush })` per token
- Prune tokens with `messaging/registration-token-not-registered` or `messaging/invalid-registration-token`
- Re-throw other errors (BullMQ retries)

### 1.10 `src/lib/notify/emit.ts` (new)

**`deliver(userId, ev, channels, data)`** — called per resolved recipient:
1. Compute push content: `templates[ev.id]?.push?.(data) ?? { title: ev.id, body: '' }`
2. Compute inApp content: `templates[ev.id]?.inApp?.(data) ?? pushContent`
3. `await Notification.create({ userId, eventId: ev.id, title, body, data })` — always sync
4. `redis.publish('notif:' + userId, ...)` — fire-and-forget SSE update
5. For each channel in `channels` (skip `inApp`): check `channelAllowed`, compute SHA1 jobId, `notifyQueue.add(channel, jobData, { jobId })`

**`emit(eventId, { data, actorId?, recipientId?, recipientIds? })`**:
1. Look up `NOTIF_EVENTS[eventId]`
2. For each target: resolve audience → ids; union channels into `Map<userId, Set<Channel>>`; `all` audience → `notifyQueue.add('fanout', ...)` and skip
3. Remove `actorId` from recipients (actor doesn't notify themselves)
4. `Promise.allSettled([...recipients].map(([userId, channels]) => deliver(...)))`

**Dedup:** SHA1 jobId = `sha1('push|email' + ':' + eventId + ':' + userId + ':' + JSON.stringify(data))`. BullMQ skips add if same jobId already in waiting/active state.

**`export const notify = { emit };`**

### 1.11 Update `src/lib/validators.ts`

Add:
```ts
export const NotificationPreferenceSchema = z.object({
  push:  z.record(z.string(), z.boolean()).optional(),
  email: z.record(z.string(), z.boolean()).optional(),
  quietHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end:   z.string().regex(/^\d{2}:\d{2}$/),
    tz:    z.string().min(1),
  }).nullable().optional(),
  digest: z.boolean().optional(),
});
```

### 1.12 Update `src/lib/models/index.ts`

Add exports: `NotificationPreference`, `INotificationPreference`.

### Stage 1 Verification

```powershell
npx tsc --noEmit   # zero errors
```

---

## Stage 2 — Worker + Process Management

### Files

**`workers/notifyWorker.ts`** (new):
```ts
// Own ioredis connection (maxRetriesPerRequest: null)
// Own connectDB() on startup
new Worker('notify', async (job) => {
  switch (job.name) {
    case 'push':   await sendFcmToUser(job.data.recipientId, job.data); break;
    case 'email':  /* load user.email; call templates[eventId].email(data); resend.send(...) */ break;
    case 'fanout': /* eachUserBatch cursor → insertMany + enqueue push/email per user */ break;
  }
}, { connection });
```

Add `sendNotificationEmail(to, subject, html)` helper to `src/lib/email.ts`.

**`package.json`** — add script: `"worker": "tsx workers/notifyWorker.ts"`

**`ecosystem.config.js`** (new, repo root):
```js
module.exports = {
  apps: [
    { name: 'web',           script: 'node_modules/.bin/next', args: 'start' },
    { name: 'notify-worker', script: 'node_modules/.bin/tsx',  args: 'workers/notifyWorker.ts' },
  ],
};
```

### Stage 2 Verification

Start Redis → `npm run worker` → emit test event → `Notification` doc appears in Mongo; worker logs push/email attempt.

---

## Stage 3 — API Routes (replace 501 stubs)

| Route | Method | Notes |
|---|---|---|
| `src/app/api/notifications/route.ts` | GET | `?unread=true`, `?limit=N` (default 20, max 50) → `{ notifications, unreadCount }` |
| `src/app/api/notifications/[id]/read/route.ts` | PUT | `findOneAndUpdate({ _id, userId }, { readAt: new Date() })` — scoped to owner |
| `src/app/api/notifications/read-all/route.ts` | POST | `updateMany({ userId, readAt: null }, { readAt: new Date() })` → `{ updated }` |
| `src/app/api/notifications/test/route.ts` | POST | `requireRole('admin')` → emit `admin.bg_job_failed` to self |
| `src/app/api/notifications/stream/route.ts` | GET | SSE: auth via Bearer, subscribe to Redis `notif:userId`, pipe to `text/event-stream`. Cleanup on abort. |
| `src/app/api/users/me/notification-preferences/route.ts` | GET | `getPreference(userId)` |
| `src/app/api/users/me/notification-preferences/route.ts` | PUT | Zod-validate → `findOneAndUpdate` upsert |

### Stage 3 Verification

```powershell
npx tsc --noEmit
# Test each route
$ADMIN = @{ Authorization = "Bearer <token>" }
Invoke-RestMethod -Uri "http://localhost:3000/api/notifications" -Headers $ADMIN
Invoke-RestMethod -Uri "http://localhost:3000/api/notifications/test" -Method POST -Headers $ADMIN
Invoke-RestMethod -Uri "http://localhost:3000/api/users/me/notification-preferences" -Headers $ADMIN
```

---

## Stage 4 — Refactor Inline Callers

**`src/app/api/admin/users/[userId]/approve/route.ts`**
- Delete inline `Notification.create` + `fcmTokens.map(admin.messaging().send(...))` block
- Delete `import { admin }`
- Add: `await notify.emit('account.approved', { recipientId: String(user._id), data: { name: user.name } })`
- Keep: `sendOwnerApprovedEmail(...)` (custom HTML, kept as-is)

**`src/app/api/admin/users/[userId]/reject/route.ts`**
- Same pattern
- Add: `await notify.emit('account.rejected', { recipientId: String(user._id), data: { reason: notifBody } })`
- Keep: `sendOwnerRejectedEmail(...)`

**`src/app/api/auth/register/route.ts`**
- After owner created: `await notify.emit('owner.registered', { data: { name, email } })` (targets all admins via role audience)
- Keep: existing `admins.map(sendAdminNewOwnerNotification)` for email

**`src/app/api/auth/logout/route.ts`** — add optional `fcmToken` body param → `$pull` on logout.

### Stage 4 Verification

```powershell
npx tsc --noEmit
Get-ChildItem -Recurse src\app\api -Filter "*.ts" | Select-String "admin\.messaging\(\)"    # zero results
Get-ChildItem -Recurse src\app\api -Filter "*.ts" | Select-String "Notification\.create"   # zero results
```

- Register owner → admin in-app doc in MongoDB
- Approve owner → `Notification` doc + push job in queue

---

## Stage 5 — Frontend

| File | What |
|---|---|
| `src/store/index.ts` | `configureStore` with RTK Query middleware + `notificationsApi` |
| `src/store/api/notificationsApi.ts` | `getNotifications`, `markRead`, `markAllRead`, `getPreferences`, `updatePreferences`. `prepareHeaders` reads `wallpainter_token` from localStorage. |
| `src/lib/firebase-fcm.ts` | `registerFCM()`: `getToken` + VAPID key → POST `/api/users/me/fcm-token`. `onMessage` → store dispatch. |
| `src/hooks/useFCM.ts` | `useEffect` on auth — calls `registerFCM()`. Handles denied permission gracefully. |
| `public/firebase-messaging-sw.js` | Service worker background push handler |
| `src/components/common/NotificationBell.tsx` | Bell icon + unread badge + dropdown. Marks read on click. SSE hook for live updates. |
| `src/components/common/NotificationPreferences.tsx` | Per-event per-channel toggles, quiet hours picker, digest toggle |
| Root layout | `<Provider store={store}>` wrapper + `useFCM()` mount |

**Env vars to add to `.env.local`:**
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Stage 5 Verification

End-to-end: log in → grant push permission → token POSTed → trigger event → bell increments via SSE → click marks read → `submission.reject` sends push + email → quiet hours set → normal event not queued; urgent still queued.

---

## Files at a Glance

| Action | Path |
|---|---|
| Create | `src/lib/queues.ts` |
| Create | `src/lib/models/NotificationPreference.ts` |
| Create | `src/lib/templates/notifications.ts`, `src/lib/templates/emails/_base.ts`, `src/lib/templates/emails/*.ts` (10 files) |
| Create | `src/lib/notify/events.ts`, `audiences.ts`, `preferences.ts`, `emit.ts` |
| Create | `src/lib/fcm.ts` |
| Create | `workers/notifyWorker.ts`, `ecosystem.config.js`, `public/firebase-messaging-sw.js` |
| Create | `src/store/index.ts`, `src/store/api/notificationsApi.ts`, `src/lib/firebase-fcm.ts`, `src/hooks/useFCM.ts` |
| Create | `src/components/common/NotificationBell.tsx`, `NotificationPreferences.tsx` |
| Implement | `src/app/api/notifications/{route,[id]/read/route,read-all/route,test/route,stream/route}.ts` |
| Implement | `src/app/api/users/me/notification-preferences/route.ts` |
| Edit | `src/lib/models/Notification.ts`, `src/lib/models/index.ts`, `src/lib/validators.ts`, `src/lib/email.ts`, `package.json`, root layout |
| Refactor | `src/app/api/admin/users/[userId]/{approve,reject}/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/logout/route.ts` |

---

## Full Verification Checklist

1. `npx tsc --noEmit` — zero errors (after each stage)
2. `npm run worker` starts; worker logs queue connections
3. Emit test event → `Notification` doc in Mongo; worker logs push/email
4. `owner.registered` → only admin docs in collection (no painter/owner rows)
5. `job.created` → only assigned painters get docs
6. `file.failed` → owner doc (all channels) + admin in-app docs
7. Dedup: same emit twice in 60s → one doc + one queued job
8. Mandatory (`user.suspended`) → delivers even with channels muted
9. Quiet hours active → normal event not queued; urgent still queued
10. Broadcast (`app.update`) → one `fanout` job, not an inline loop
11. `GET /api/notifications` → `{ notifications, unreadCount }`
12. `PUT /api/notifications/:id/read` → flips `readAt` for caller's doc only
13. `POST /api/notifications/read-all` → all `readAt: null` docs updated
14. Approve owner → no raw `admin.messaging()` / `Notification.create` in route files
15. Bell updates live via SSE without page refresh

---

## Notes 

- BullMQ queue files must stay server-only (`import 'server-only'`), never on edge runtime.
- The worker imports `@/lib/*` — `tsx` resolves aliases via `tsconfig.json` paths.
- Worker needs its own `connectDB()` on startup — does not share the Next.js process connection.
- Upstash (dev): use ioredis pointing to the `rediss://` URL. Free tier (10K cmds/day) is sufficient for dev volume.
- Dedup hash is per-channel so push and email for the same event get separate jobIds.
- `actorId` should NOT be passed for self-service events (`auth.*`) — the actor IS the intended recipient.
- Email bounce tracking (`User.emailStatus`) and digest queue draining are post-v1 features.
