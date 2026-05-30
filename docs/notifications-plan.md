# Notifications System — Implementation Plan

> Supersedes and absorbs the earlier `phase-14-plan.md` (notifications wiring). All still-relevant detail from that file is merged below. `docs/07-NOTIFICATIONS.md` remains the architectural source of truth; this file is the executable plan.

## Context

The app needs an event-driven notification system across three channels: **in-app** (bell UI), **push** (FCM), and **email** (Resend). Today this is half-built and inconsistent:

- `Notification` model, `firebase-admin`, `firebase-client`, `email.ts` (auth emails only), and the `fcmTokens[]` field on `User` all exist.
- Push + in-app notifications fire **ad-hoc inline** inside `approve/route.ts` and `reject/route.ts` (raw `user.fcmTokens.map(admin.messaging().send(...))` blocks).
- The 4 notification API routes are **501 stubs**.
- There is no central dispatch, no event catalog, no queue/worker, no per-user preferences, and no frontend (Redux store, FCM registration, bell UI all missing).

**Decisions made:**
- Build the **full `docs/07-NOTIFICATIONS.md` engine** (it supersedes the old phase-14 inline approach).
- **Include** per-user `NotificationPreference`.
- Deploy app + worker + Redis on a **single Oracle Cloud VM** — **Always-Free `VM.Standard.A1.Flex` (4 OCPU / 24 GB RAM)**.
- Queue uses **BullMQ** (replacing the currently-installed `bull` — native TS, actively maintained, clean `Queue`/`Worker` split) backed by **local Redis on the VM** (free, no command cap, lowest latency; Upstash free tier rejected because the queue's blocking-poll connection would exhaust its command quota). Dependency change: add `bullmq` + `ioredis`, remove `bull`.
- **Role-aware, multi-audience targeting is first-class.** A single event can target different roles with different channels (e.g. `job.created` → painters-on-that-job via push+in-app; `owner.registered` → admins only; `file.failed` → the owner on all channels *and* admins in-app; `app.update` → everyone). Audience resolution lives **declaratively in the event catalog**, not ad-hoc at call sites. Per-user **preferences** are always honored except for events flagged `mandatory`.
- **Staged, backend-first** delivery — each stage independently testable.

**Outcome:** every notification flows through one `notify.emit(eventId, …)` call; the catalog decides *who* receives it (by role / context / broadcast) and *how* (per-audience channels); route handlers never touch FCM/Resend directly; in-app rows are written synchronously for small audiences while push/email — and large broadcasts — are dispatched async via BullMQ + a worker process.

---

## Conventions to reuse (do not reinvent)

- API responses: `ok`, `created`, `badRequest`, `notFound` from `src/lib/api-response.ts`.
- Auth guards: `requireAuth`, `requireRole` from `src/lib/rbac.ts` (throw a `Response`; wrap in the existing `try/catch (e) { if (e instanceof Response) return e; throw e; }` pattern seen in every route).
- Zod schemas live in `src/lib/validators.ts` (e.g. existing `FCMTokenSchema`).
- Models barrel: `src/lib/models/index.ts` (export new model + interface here).
- Mongoose model boilerplate: copy the `dev` hot-reload guard pattern from `src/lib/models/Notification.ts`.
- Firebase admin singleton: `src/lib/firebase-admin.ts` (`admin`).
- Resend client + `FROM`: `src/lib/email.ts`.
- `@/` path alias everywhere; no relative `../` imports.

---

## Stage 1 — Foundation (lib + model)

**`src/lib/models/NotificationPreference.ts`** (new) — standalone collection keyed by `userId` (unique). Categories mirror the event catalog so a user mutes by *category × channel*. Defaults are role-agnostic (a painter simply never receives admin-category events, so those toggles are inert for them):
```ts
{
  userId: ObjectId (unique, ref User),
  channels: { push: Boolean=true, email: Boolean=true },   // global per-channel kill switch
  categories: {                                            // per-category channel mutes
    submission:   { push:true, email:true },
    job:          { push:true, email:true },
    file:         { push:true, email:true },
    auth:         { push:true, email:true },
    admin:        { push:true, email:true },
    announcement: { push:true, email:true, inApp:true },  // broadcasts can be silenced in the bell too
  },
}
```
- **In-app is always on** for targeted (non-broadcast) events — the bell is the catch-all (doc-07 rule). The only in-app mute is the `announcement` category, so app-wide broadcasts don't spam the bell.
- **`mandatory` events bypass all preferences** (suspensions, security alerts, forced app updates) — see the catalog flag below.
Export from `src/lib/models/index.ts`. Add helpers in `src/lib/notify/preferences.ts`: `getPreference(userId)` (get-or-return-default) and `channelAllowed(pref, event, channel)` (returns true if `mandatory`, else checks global + category toggles).

**`src/lib/notify/events.ts`** (new) — the **audience-aware** event catalog (extends `docs/07-NOTIFICATIONS.md`):
```ts
export type Channel = 'inApp' | 'push' | 'email';
export type Role    = 'painter' | 'owner' | 'admin';

// WHO an event targets, and how to find them:
export type Audience =
  | { kind: 'explicit' }                      // caller passes recipientId / recipientIds (e.g. "that job's owner")
  | { kind: 'role'; role: Role }              // every user with this role (e.g. all admins)
  | { kind: 'resolver'; name: ResolverName }  // contextual fan-out (e.g. "all painters on data.jobId")
  | { kind: 'all' };                          // every user — broadcast / app-wide announcement

export interface NotifTarget {
  audience: Audience;
  channels: Channel[];          // channels for THIS audience — per-role differences live here
  title?: string; body?: string; // optional per-audience template override (else event default)
}

export interface NotifEvent {
  category: 'submission'|'job'|'file'|'auth'|'admin'|'announcement';
  urgency:  'normal'|'urgent';
  mandatory?: boolean;          // true => bypasses user preferences (security/critical/forced)
  title: string; body: string;  // default templates with {vars}
  targets: NotifTarget[];       // ONE OR MORE audiences, each with its own channels
}

export const NOTIF_EVENTS: Record<string, NotifEvent> = { /* … */ };
export function render(tpl: string, data): string;   // interpolate {var} tokens
```
Examples covering every flexibility you described:
```ts
'submission.create': {            // painter → THE owner of that job (caller passes id)
  category:'submission', urgency:'normal',
  title:'{painter} submitted #{code}', body:'{painter} submitted #{code} · {location}',
  targets:[{ audience:{kind:'explicit'}, channels:['push','inApp'] }],
},
'job.created': {                   // → all painters assigned to the job
  category:'job', urgency:'normal',
  title:'Added to "{company}"', body:'You were added to "{company}"',
  targets:[{ audience:{kind:'resolver', name:'paintersOnJob'}, channels:['push','inApp'] }],
},
'owner.registered': {             // → admins ONLY
  category:'admin', urgency:'normal',
  title:'New owner registration', body:'{name} ({email}) is awaiting approval',
  targets:[{ audience:{kind:'role', role:'admin'}, channels:['inApp','email'] }],
},
'file.failed': {                  // → the owner (all channels) AND admins (in-app)
  category:'file', urgency:'urgent',
  title:'Export failed', body:'{type} export errored — admin notified',
  targets:[
    { audience:{kind:'explicit'},              channels:['push','inApp','email'] },
    { audience:{kind:'role', role:'admin'},    channels:['inApp'] },
  ],
},
'app.update': {                   // → EVERYONE (broadcast); silenceable, not mandatory
  category:'announcement', urgency:'normal',
  title:'App updated', body:'{notes}',
  targets:[{ audience:{kind:'all'}, channels:['inApp','push'] }],
},
'user.suspended': {              // → the user; MANDATORY (ignores prefs)
  category:'auth', urgency:'urgent', mandatory:true,
  title:'Account suspended', body:'{reason}',
  targets:[{ audience:{kind:'explicit'}, channels:['email','inApp'] }],
},
```
Port the 18 documented events into this shape, plus the lifecycle events from the Stage 4 refactor (`account.approved`, `account.rejected`, `owner.registered`).

**`src/lib/notify/audiences.ts`** (new) — recipient resolution kept out of `emit()` and out of call sites:
```ts
// Contextual resolvers receive the emit `data` and return userIds (strings).
export const RESOLVERS = {
  paintersOnJob: async (data) => /* painter ids assigned to data.jobId */,
  jobOwner:      async (data) => /* [owner id of data.jobId] */,
};
export type ResolverName = keyof typeof RESOLVERS;

export async function usersByRole(role: Role): Promise<string[]>;       // User.find({role,status:'active'}).distinct('_id')
export async function eachUserBatch(fn, size=500): Promise<void>;       // cursor over all active users, for broadcasts
```

**`src/lib/fcm.ts`** (new) — `sendFcmToUser(userId, { title, body, data? })` (from phase-14 spec):
- Loads `user.fcmTokens`; sends via `admin.messaging().sendEachForMulticast(...)` (firebase-admin v13 API — `sendMulticast`/per-token `send` via `Promise.allSettled` are the older patterns; prefer `sendEachForMulticast`).
- Prunes tokens whose response error is `messaging/registration-token-not-registered` (`$pull` from `User.fcmTokens`).
- Returns void (fire-and-forget). Replaces the inline token-map blocks.

**`src/lib/queues.ts`** (new) — two BullMQ queues with per-channel retry policy (the doc's "queue per delivery attempt"):
```ts
import 'server-only';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
export const pushQueue   = new Queue('push',   { connection, defaultJobOptions: { attempts: 5, backoff: { type:'exponential', delay: 2000 } } });
export const emailQueue  = new Queue('email',  { connection, defaultJobOptions: { attempts: 2, backoff: { type:'exponential', delay: 5000 } } });
export const fanoutQueue = new Queue('fanout', { connection, defaultJobOptions: { attempts: 3, backoff: { type:'exponential', delay: 3000 } } });
```
`fanoutQueue` handles broadcast / large-role audiences so `emit()` never loops over thousands of users inside a request.
BullMQ uses its own ioredis connection from `REDIS_URL` (`maxRetriesPerRequest: null` is required by BullMQ); the existing node-redis singleton in `src/lib/redis.ts` is untouched. Routes importing this stay on the default Node.js runtime (never edge).

**`src/lib/notify/emit.ts`** (new) — single entry point; resolves audiences, dedupes users, unions channels:
```ts
export async function emit(eventId, { data, actorId?, recipientId?, recipientIds? }) {
  const ev = NOTIF_EVENTS[eventId];

  // 1. Resolve every target's audience → a map of userId -> Set<Channel> (union across targets, dedup).
  const recipients = new Map<string, Set<Channel>>();
  for (const t of ev.targets) {
    let ids: string[];
    switch (t.audience.kind) {
      case 'explicit': ids = recipientIds ?? (recipientId ? [recipientId] : []); break;
      case 'role':     ids = await usersByRole(t.audience.role); break;
      case 'resolver': ids = await RESOLVERS[t.audience.name](data); break;
      case 'all':      await fanoutQueue.add('fanout', { eventId, data, actorId }); continue; // batched in worker
    }
    for (const id of ids) recipients.set(id, new Set([...(recipients.get(id) ?? []), ...t.channels]));
  }

  // 2. Deliver to each resolved user, honoring preferences (unless ev.mandatory).
  for (const [userId, channels] of recipients) await deliver(userId, ev, channels, data);
}

// Shared by emit() and the fanout worker:
export async function deliver(userId, ev, channels: Set<Channel>, data) {
  const { title, body } = renderEvent(ev, data);
  if (channels.has('inApp') && allowInApp(ev))                       // always-on except muted announcements
    await Notification.create({ userId, title, body, data: { eventId: ev.id, ...data } });
  const pref = await getPreference(userId);
  if (channels.has('push')  && channelAllowed(pref, ev, 'push'))  await pushQueue.add('push',  { recipientId:userId, title, body, data });
  if (channels.has('email') && channelAllowed(pref, ev, 'email')) await emailQueue.add('email', { recipientId:userId, eventId:ev.id, data });
}
export const notify = { emit };
```
- **Targeting is declarative** (catalog), so call sites just pass context (`data`, and the explicit `recipientId(s)` for `explicit` audiences). A route can't accidentally send an admin-only event to a painter.
- **Dedup + channel union** means a user matching two targets (e.g. owner who is also admin) gets one in-app row and the union of channels.
- **`mandatory`** events skip all preference checks via `channelAllowed`.
- **`all` / huge audiences** are handed to `fanoutQueue` and expanded in the worker — never inline.

**Verify:** `npx tsc --noEmit`.

---

## Stage 2 — Worker + process management (sized for 1 GB)

**`workers/notifyWorker.ts`** (new) — standalone BullMQ consumer:
```ts
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null }); // worker's own connection
new Worker('push',  async (job) => sendFcmToUser(job.data.recipientId, job.data), { connection });
new Worker('email', async (job) => { /* load User.email, render email html, resend.emails.send(...) */ }, { connection });
new Worker('fanout', async (job) => {           // broadcast / large-role expansion, batched
  const ev = NOTIF_EVENTS[job.data.eventId];
  await eachUserBatch(async (users) => {        // cursor pages of ~500 active users
    // bulk insert in-app rows (insertMany) + enqueue push/email per user via deliver()/prefs
  });
}, { connection });
```
- Add a generic `sendNotificationEmail(to, subject, html)` to `src/lib/email.ts` (reuse existing `resend` + `FROM`).
- Ensure the worker process establishes its own Mongo connection (`connectDB`) on startup — it does not share the Next.js process.

**Worker run strategy:**
- **Dev:** `tsx workers/notifyWorker.ts` (alias + TS resolution, no build step).
- **Prod:** `tsx workers/notifyWorker.ts` (same — 24 GB RAM means no need to precompile).

**`package.json`** scripts + devDep (add `tsx`):
```jsonc
"worker": "tsx workers/notifyWorker.ts"
```

**`ecosystem.config.js`** (new, repo root) — PM2, two apps:
- `web` → `next start`
- `notify-worker` → `tsx workers/notifyWorker.ts` (or compiled `node` variant)

**Verify:** start local Redis → `npm run worker` → emit a test event → confirm a Mongo `notifications` row appears immediately and the worker logs a push/email send.

---

## Stage 3 — API routes (replace the 501 stubs)

All under `src/app/api/notifications/` using `requireAuth` + `ok()`:

- **`route.ts` — GET**: `?unread=true` filter, `?limit=N` (default 20, max 50). Returns `{ notifications, unreadCount }` (uses the existing `{ userId, read, createdAt }` index).
- **`[id]/read/route.ts` — PUT**: `findOneAndUpdate({ _id, userId }, { read:true })` (scoped to owner so users can't touch others' rows). Returns the updated notification.
- **`read-all/route.ts` — POST**: `updateMany({ userId, read:false }, { read:true })` → `{ updated }`.
- **`test/route.ts` — POST**: `requireRole('admin')` → `notify.emit('admin.test', { recipientId: self })` (test push to self).
- **Preferences (new) — `preferences/route.ts`**: `GET` (get-or-create default via `getPreference`) and `PUT` (Zod-validated). Add `NotificationPreferenceSchema` to `src/lib/validators.ts`.

**Verify:** `npx tsc --noEmit`; curl each route with a Bearer token.

---

## Stage 4 — Refactor inline callers onto `emit()`

- **`src/app/api/admin/users/[userId]/approve/route.ts`** & **`reject/route.ts`**: delete the inline `Notification.create` + `user.fcmTokens.map(admin.messaging().send(...))` blocks; replace with `notify.emit('account.approved'|'account.rejected', { recipientId: user._id, data })`. Keep the existing bespoke `sendOwnerApprovedEmail`/`sendOwnerRejectedEmail` calls as-is (custom content) — emit handles only in-app + push for these.
- **`src/app/api/auth/register/route.ts`**: after creating an owner, notify every admin (in-app bell). The `User.find({ role: 'admin' })` call already exists on the next line (for sending emails) — **consolidate into one query**, then either `emit('owner.registered', { recipientId: a._id })` per admin, or the direct form from the original phase-14 plan:
  ```ts
  const admins = await User.find({ role: 'admin' }, '_id').lean();
  await Promise.allSettled(
    admins.map(a =>
      Notification.create({
        userId: a._id,
        title: 'New owner registration pending',
        body: `${name} (${email}) registered and is awaiting approval.`,
      })
    )
  );
  ```
  Prefer routing through `emit('owner.registered', …)` so the catalog/preferences apply consistently.

**Verify:** register owner → each admin gets an in-app row; approve owner → recipient gets in-app + push via emit; confirm no `admin.messaging()` / inline `Notification.create` remains in these three routes (grep).

---

## Stage 5 — Frontend

- **Redux store** — `src/store/index.ts` (configureStore + RTK Query middleware):
  ```ts
  import { configureStore } from '@reduxjs/toolkit';
  import { notificationsApi } from './api/notificationsApi';

  export const store = configureStore({
    reducer: { [notificationsApi.reducerPath]: notificationsApi.reducer },
    middleware: (getDefault) => getDefault().concat(notificationsApi.middleware),
  });
  export type RootState = ReturnType<typeof store.getState>;
  export type AppDispatch = typeof store.dispatch;
  ```
- **RTK Query slice** — `src/store/api/notificationsApi.ts`:
  - `getNotifications({ unread?, limit? })` → `GET /api/notifications`
  - `markRead(id)` → `PUT /api/notifications/:id/read` (invalidates `getNotifications`)
  - `markAllRead()` → `POST /api/notifications/read-all` (invalidates `getNotifications`)
  - `getPreferences()` / `updatePreferences(body)` → `/api/notifications/preferences`
  - Auth header injected via `prepareHeaders` reading `wallpainter_token` from localStorage (same key as `src/store/authStore.ts`).
  - Add a `<Provider>` wrapper and mount it in the root layout.
- **FCM client**: `src/lib/firebase-fcm.ts` (`registerFCM()` → `getToken` with VAPID key, POST to existing `/api/users/me/fcm-token`, `onMessage` → push into store); `src/hooks/useFCM.ts`; `public/firebase-messaging-sw.js` (background handler).
- **UI**: bell component with unread badge + dropdown (mark-read / mark-all-read) in `src/components/common/`; a notification-preferences section in owner/painter settings.
- **Env vars** to ensure present: `REDIS_URL`, `ADMIN_CONTACT_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FIREBASE_*` (admin), and `NEXT_PUBLIC_FIREBASE_*` incl. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` + `MESSAGING_SENDER_ID` + `APP_ID` (firebase-client currently only sets apiKey/authDomain/projectId).

**Verify (end-to-end):** start Redis + worker + `next dev`; log in, grant notification permission (token POSTed), trigger a submission/approval event → bell updates in-app, browser push arrives, and an urgent event also lands an email.

---

## Files at a glance

| Action | Path |
|---|---|
| Create | `src/lib/models/NotificationPreference.ts`, `src/lib/notify/{events,emit,preferences,audiences}.ts`, `src/lib/fcm.ts`, `src/lib/queues.ts` |
| Create | `workers/notifyWorker.ts`, `ecosystem.config.js`, `public/firebase-messaging-sw.js` |
| Create | `src/store/index.ts`, `src/store/api/notificationsApi.ts`, `src/lib/firebase-fcm.ts`, `src/hooks/useFCM.ts`, bell + prefs UI components |
| Implement | `src/app/api/notifications/{route,[id]/read/route,read-all/route,test/route}.ts`, `src/app/api/notifications/preferences/route.ts` |
| Edit | `src/lib/models/index.ts`, `src/lib/validators.ts`, `src/lib/email.ts`, `package.json`, root layout |
| Refactor | `src/app/api/admin/users/[userId]/{approve,reject}/route.ts`, `src/app/api/auth/register/route.ts` |

---

## Consolidated verification checklist
(merged from the original phase-14 plan)

1. `npx tsc --noEmit` — no errors (run after each stage).
2. Start local Redis → `npm run worker` → emit a test event → a Mongo `notifications` doc appears immediately; worker logs the push/email send.
3. Register a new owner → MongoDB `notifications` collection has one doc per admin.
4. Approve an owner via admin dashboard → FCM fires via `sendFcmToUser`; no inline token map remains in the route.
5. `GET /api/notifications` with a valid Bearer token returns `{ notifications: [...], unreadCount: N }`.
6. `PUT /api/notifications/:id/read` flips `read: true` for the correct doc only (scoped to the caller).
7. `POST /api/notifications/read-all` sets all of that user's docs to `read: true` and returns `{ updated }`.
8. End-to-end: grant browser notification permission → token POSTed → triggering events updates the bell, delivers a push, and (for urgent events) sends an email.
9. **Role targeting:** `owner.registered` reaches only admins (no painter/owner rows); `job.created` reaches exactly the painters assigned to that job; `file.failed` produces an owner row (all channels) *and* admin in-app rows.
10. **Dedup:** a user who is both owner and admin for one event gets a single in-app row with the union of channels.
11. **Broadcast:** `app.update` enqueues one `fanout` job that expands to an in-app row for every active user in batches; a user who muted the `announcement` category gets nothing.
12. **Mandatory:** `user.suspended` delivers even when the target has muted the `auth` category / disabled channels.

---

## Notes / risks
- Dependencies: add `bullmq` + `ioredis`, remove `bull` from `package.json`. Update `CLAUDE.md` / `docs/02-TECH-STACK.md` which currently say "Bull".
- BullMQ queue modules must stay server-only and on the Node.js runtime (never edge).
- The worker imports `@/lib/*` (mongoose, firebase-admin, resend) — `tsx` handles alias + TS resolution; verify the Mongo connection is established inside the worker process too.
- firebase-admin v13: use `sendEachForMulticast` (not the deprecated `sendMulticast`).
- **Broadcast scale:** `all`/large-role audiences must go through `fanoutQueue` + `eachUserBatch` (cursor + `insertMany`), never an in-request loop, to avoid slow responses.
- **Targeting integrity:** audience resolution is centralized in the catalog + `audiences.ts`; call sites never decide roles, which prevents an event leaking to the wrong role. Resolvers query only `status:'active'` users.

---

## Deployment on the VM (operational, not code)

Setup steps for the box (Oracle Cloud A1 Flex — 4 OCPU / 24 GB RAM), captured so the code above stays consistent with them:
- **No swap needed.** 24 GB RAM is more than sufficient for steady-state (app + worker + Redis ≈ 500–700 MB) and on-box `next build` spikes. Build directly on the VM.
- **Local Redis config:** install via the distro package (runs as a `systemd` service → auto-starts on boot). Set `maxmemory 512mb`, `maxmemory-policy noeviction` (queue jobs must never be evicted), bind to `127.0.0.1`, set `requirepass`, enable AOF (`appendonly yes`, `appendfsync everysec`) so a Redis/VM restart restores queued jobs from disk. `REDIS_URL=redis://:<pass>@127.0.0.1:6379`. Note: restarting only the app/worker never loses jobs (Redis keeps running); persistence only matters on a Redis or VM restart, and even then the in-app row is already in Mongo so worst case is a missed push/email copy.
- **PM2** runs `web` + `notify-worker`; `pm2 startup` + `pm2 save` for reboot survival.
- The heavier **watermarking + PDF/Excel** worker spikes are absorbed comfortably in real RAM — no tuning required.
