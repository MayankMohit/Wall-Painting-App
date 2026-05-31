# Notification System — Testing Guide

Full end-to-end test plan for the notification system built across Stages 1–5.
Run phases in order — each phase builds on the previous one.

---

## Prerequisites

### Services

```powershell
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — notify worker (Phases 3, 5, 6, 7, 8, 10)
npm run worker
```

### Shell setup

Run once at the start of every test session. Replace token placeholders with real values.

```powershell
$BASE          = "http://localhost:3000"
$ADMIN_TOKEN   = "eyJ..."     # replace
$OWNER_TOKEN   = "eyJ..."
$PAINTER_TOKEN = "eyJ..."
$ADMIN   = @{ Authorization = "Bearer $ADMIN_TOKEN" }
$OWNER   = @{ Authorization = "Bearer $OWNER_TOKEN" }
$PAINTER = @{ Authorization = "Bearer $PAINTER_TOKEN" }

# Fill in after Phase 1.2 and DB setup
$NOTIF_ID         = ""   # a notification _id from Phase 1.2
$PENDING_OWNER_ID = ""   # owner with status: inactive
$PAINTER_ID       = ""   # a painter's _id
```

### Login helper

```powershell
function Get-Token($email, $pass) {
  $r = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body "{`"identifier`":`"$email`",`"password`":`"$pass`"}"
  $r.data.token
}
$ADMIN_TOKEN   = Get-Token "admin@example.com" "password123"
$OWNER_TOKEN   = Get-Token "owner@example.com" "password123"
$PAINTER_TOKEN = Get-Token "painter@example.com" "password123"
$ADMIN   = @{ Authorization = "Bearer $ADMIN_TOKEN" }
$OWNER   = @{ Authorization = "Bearer $OWNER_TOKEN" }
$PAINTER = @{ Authorization = "Bearer $PAINTER_TOKEN" }
```

### Test accounts needed

| Variable | Role | Status |
|---|---|---|
| `$ADMIN_TOKEN` | admin | active |
| `$OWNER_TOKEN` | owner | active |
| `$PAINTER_TOKEN` | painter | active |
| `$PENDING_OWNER_ID` | owner | inactive (pending approval) |

### MongoDB quick reference

Open MongoDB Compass or `mongosh`. Queries used throughout:
```js
db.notifications.find({ userId: ObjectId("...") }).sort({ createdAt: -1 })
db.notifications.countDocuments({ userId: ObjectId("..."), readAt: null })
db.notificationpreferences.findOne({ userId: ObjectId("...") })
db.users.findOne({ email: "..." }, { fcmTokens: 1, status: 1 })
db.notifications.getIndexes()
```

---

## Phase 1 — Notification CRUD

No worker needed. Tests `GET /api/notifications`, `PUT /api/notifications/[id]/read`,
`POST /api/notifications/read-all`, `POST /api/notifications/test`.

---

### 1.1 Seed — admin test endpoint

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN
```

**Expected response**
```json
{ "data": { "message": "Test notification emitted" } }
```

**Expected in MongoDB**
```js
db.notifications.findOne({ eventId: "admin.bg_job_failed" })
// readAt: null, title: "Background job failed"
```

Note: Two docs are created (one per admin account in the DB). Both admins are
targeted because the event audience is `kind: "role", role: "admin"`.

---

### 1.2 Fetch list — default (20 notifications, newest first)

```powershell
$r = Invoke-RestMethod -Uri "$BASE/api/notifications" -Headers $ADMIN
$r.data.unreadCount
$r.data.notifications.Count
```

**Expected**
- `notifications` array, newest `createdAt` first
- `unreadCount` ≥ 1
- At most 20 items even if more exist

---

### 1.3 Fetch unread only

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications?unread=true" -Headers $ADMIN
```

**Expected** — all items in `notifications` have `readAt: null`. `unreadCount` matches array length.

---

### 1.4 Limit parameter — custom value

```powershell
1..10 | ForEach-Object {
  Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN | Out-Null
}
Invoke-RestMethod -Uri "$BASE/api/notifications?limit=3" -Headers $ADMIN
```

**Expected** — exactly 3 items in `notifications`. `unreadCount` reflects total unread (not just 3).

---

### 1.5 Limit parameter — cap at 50

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications?limit=999" -Headers $ADMIN
```

**Expected** — at most 50 items. No error — the value is silently clamped.

---

### 1.6 Limit parameter — invalid value

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications?limit=abc" -Headers $ADMIN
```

**Expected** — falls back to default of 20, no error (NaN → 0 → Math.min clamps to 20).

---

### 1.7 Unread + limit combined

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications?unread=true&limit=2" -Headers $ADMIN
```

**Expected** — at most 2 items, all with `readAt: null`. `unreadCount` still reflects total.

---

### 1.8 Notifications are sorted newest first

Look at the `createdAt` fields in the response from 1.2. Each item's `createdAt`
should be equal to or older than the previous item. Verify manually from the response.

---

### 1.9 Mark one notification read

```powershell
$NOTIF_ID = "6a1ca12a94c8244e5c0ff291"  # replace with real _id from 1.2
Invoke-RestMethod -Uri "$BASE/api/notifications/$NOTIF_ID/read" -Method PUT -Headers $ADMIN
```

**Expected** — full notification object returned with `readAt` set to a non-null timestamp.

---

### 1.10 Mark read is idempotent

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/$NOTIF_ID/read" -Method PUT -Headers $ADMIN
```

**Expected** — `200` again. `readAt` is updated to a slightly newer timestamp (idempotent).

---

### 1.11 Unread count drops after mark read

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications?unread=true" -Headers $ADMIN
```

**Expected** — `unreadCount` is one less than before 1.9.

---

### 1.12 New user — empty notifications

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications" -Headers $PAINTER
```

**Expected**
```json
{ "data": { "notifications": [], "unreadCount": 0 } }
```

---

### 1.13 Mark all read

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/read-all" -Method POST -Headers $ADMIN
```

**Expected** — `{ "data": { "updated": N } }` where N equals the number of unread docs
belonging to this user only (not other users).

---

### 1.14 Mark all read — nothing to mark

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/read-all" -Method POST -Headers $ADMIN
```

**Expected** — `{ "data": { "updated": 0 } }`. No error.

---

### 1.15 Notifications are scoped per user

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications" -Headers $PAINTER
```

**Expected** — `notifications: []`, `unreadCount: 0`. Admin's notifications do not appear.

---

### 1.16 Security — cross-user mark read

```powershell
try { Invoke-RestMethod -Uri "$BASE/api/notifications/$NOTIF_ID/read" -Method PUT -Headers $PAINTER } catch { $_.Exception.Response.StatusCode }
```

**Expected** — `404`. Painter cannot see or modify another user's notification.

---

### 1.17 Security — valid ObjectId but non-existent

```powershell
try { Invoke-RestMethod -Uri "$BASE/api/notifications/000000000000000000000000/read" -Method PUT -Headers $ADMIN } catch { $_.Exception.Response.StatusCode }
```

**Expected** — `404`.

---

### 1.18 Security — invalid ObjectId format

```powershell
try { Invoke-RestMethod -Uri "$BASE/api/notifications/not-an-id/read" -Method PUT -Headers $ADMIN } catch { $_.Exception.Response.StatusCode }
```

**Expected** — `404` (ObjectId validation rejects before querying).

---

### 1.19 Security — no auth token

```powershell
try { Invoke-RestMethod -Uri "$BASE/api/notifications" } catch { $_.Exception.Response.StatusCode }
try { Invoke-RestMethod -Uri "$BASE/api/notifications/read-all" -Method POST } catch { $_.Exception.Response.StatusCode }
try { Invoke-RestMethod -Uri "$BASE/api/notifications/$NOTIF_ID/read" -Method PUT } catch { $_.Exception.Response.StatusCode }
```

**Expected** — `Unauthorized` (401) for all three.

---

### 1.20 Security — non-admin calling test endpoint

```powershell
try { Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $PAINTER } catch { $_.Exception.Response.StatusCode }
try { Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $OWNER } catch { $_.Exception.Response.StatusCode }
```

**Expected** — `Forbidden` (403) for both.

---

### 1.21 Security — malformed JWT

```powershell
$BAD = @{ Authorization = "Bearer thisisnotavalidjwt" }
try { Invoke-RestMethod -Uri "$BASE/api/notifications" -Headers $BAD } catch { $_.Exception.Response.StatusCode }
```

**Expected** — `Unauthorized` (401).

---

## Phase 2 — Notification Preferences

Tests `GET /api/users/me/notification-preferences` and
`PUT /api/users/me/notification-preferences`.

---

### 2.1 Default preferences — first-time user

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Headers $PAINTER
```

**Expected**
```json
{
  "data": {
    "push":       { "*": true },
    "email":      { "*": true },
    "quietHours": null,
    "digest":     false
  }
}
```

**Check MongoDB** — `notificationpreferences` collection should have NO doc for this
painter yet. GET returns a hardcoded default without creating anything.

---

### 2.2 First PUT creates a DB doc

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" -Body '{"push":{"*":false}}'
```

**Expected response** — `push: { "*": false }`, email and quietHours unchanged.

**Check MongoDB** — a `notificationpreferences` doc now exists for this painter.

---

### 2.3 Second PUT updates — no duplicate doc created

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" -Body '{"email":{"*":false}}'
```

**Check MongoDB** — still exactly ONE doc for this painter. `push: { "*": false }` and
`email: { "*": false }` both set (upsert, not insert).

---

### 2.4 Partial update does not overwrite unrelated fields

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" -Body '{"digest":true}'
```

**Expected** — `digest: true`, but `push: { "*": false }` and `email: { "*": false }`
are still set from 2.2 and 2.3.

---

### 2.5 Per-event override alongside wildcard

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"push":{"*":true,"submission.create":false}}'
```

**Expected** — `push: { "*": true, "submission.create": false }`.
Meaning: all push on except for `submission.create` specifically.

---

### 2.6 Set quiet hours

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"quietHours":{"start":"22:00","end":"08:00","tz":"Asia/Kolkata"}}'
```

**Expected** — `quietHours: { "start": "22:00", "end": "08:00", "tz": "Asia/Kolkata" }`.
Other fields unchanged from previous PUT.

---

### 2.7 Update quiet hours — change end time only

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"quietHours":{"start":"22:00","end":"09:00","tz":"Asia/Kolkata"}}'
```

**Expected** — `end` changed to `09:00`, `start` and `tz` remain.

---

### 2.8 Clear quiet hours

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" -Body '{"quietHours":null}'
```

**Expected** — `quietHours: null`. All other fields unchanged.

---

### 2.9 GET reflects latest state

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Headers $PAINTER
```

**Expected** — matches what was last PUT. GET is never stale.

---

### 2.10 Preferences are per-user — users are independent

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Headers $ADMIN
```

**Expected** — defaults `{ "*": true }` for both push and email. Painter's changes
above do not affect the admin.

---

### 2.11 Validation — invalid quiet hours format (non-HH:MM)

```powershell
try {
  Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -ContentType "application/json" `
    -Body '{"quietHours":{"start":"10pm","end":"8am","tz":"Asia/Kolkata"}}'
} catch { $_.Exception.Response.StatusCode }
```

**Expected** — `400 Bad Request`. Zod regex `^\d{2}:\d{2}$` rejects `10pm`.

---

### 2.12 Validation — quietHours missing tz

```powershell
try {
  Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -ContentType "application/json" `
    -Body '{"quietHours":{"start":"22:00","end":"08:00"}}'
} catch { $_.Exception.Response.StatusCode }
```

**Expected** — `400 Bad Request`. `tz` is required inside quietHours.

---

### 2.13 Validation — empty body

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" -Body '{}'
```

**Expected** — `200`. All fields are optional in the schema — empty body is a no-op
update (returns current state).

---

### 2.14 Validation — non-boolean push value

```powershell
try {
  Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -ContentType "application/json" -Body '{"push":{"*":"yes"}}'
} catch { $_.Exception.Response.StatusCode }
```

**Expected** — `400 Bad Request`. Zod requires boolean values in the push map.

---

### 2.15 Security — no auth token

```powershell
try { Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" } catch { $_.Exception.Response.StatusCode }
try {
  Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
    -ContentType "application/json" -Body '{"digest":true}'
} catch { $_.Exception.Response.StatusCode }
```

**Expected** — `401` for both.

---

### 2.16 Reset painter to defaults before next phases

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"push":{"*":true},"email":{"*":true},"quietHours":null,"digest":false}' | Out-Null
```

---

## Phase 3 — Worker + Queue

Worker must be running. Tests push jobs, email jobs, dedup, retry, dead-token pruning.

---

### 3.1 Worker connected

Worker terminal should show on startup:
```
[notifyWorker] started, listening on notify queue
```

If not — check Redis URL in `.env` and re-run `npm run worker`.

---

### 3.2 Push job — trigger and verify in terminal

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN
```

**Expected in worker terminal**
```
[notifyWorker] push:<sha1hash> completed
```

If admin has no FCM tokens the job still completes (no-op push, no error).

---

### 3.3 Push job — user with no FCM tokens (silent no-op)

Confirm no `fcmTokens` on admin:
```js
db.users.findOne({ email: "admin@example.com" }, { fcmTokens: 1 })
// fcmTokens: [] or undefined
```

Trigger the test endpoint. Worker should log `completed`, not `failed`.
`sendFcmToUser` returns early when `fcmTokens` is empty.

---

### 3.4 Push job — dead token pruning

Insert a fake invalid FCM token for the admin user:
```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $push: { fcmTokens: "invalid-fake-token-12345" } }
)
```

Trigger the test endpoint. Firebase will return `messaging/registration-token-not-registered`.

**Expected in worker terminal** — job logs `completed` (not `failed`).

**Check MongoDB** — the fake token is removed from `fcmTokens`:
```js
db.users.findOne({ email: "admin@example.com" }, { fcmTokens: 1 })
// "invalid-fake-token-12345" should be gone
```

---

### 3.5 Push job — multiple FCM tokens on one user

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { fcmTokens: ["invalid-token-aaa", "invalid-token-bbb"] } }
)
```

Trigger the test endpoint. Worker logs `completed`. Both dead tokens removed.
After: `fcmTokens` array is empty.

---

### 3.6 Email job — trigger via submission.reject event

The easiest way to test an email job without a full submission flow is to reject a real
submission from the owner dashboard (see Phase 6).

**Expected:**
- Worker logs `[notifyWorker] email:<jobId> completed`
- Painter receives an email in their inbox via Resend
- Email subject: `#SUB-001 needs revision`

---

### 3.7 Dedup — same data produces same SHA1 hash

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN | Out-Null
Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN | Out-Null
```

**Expected:**
- Two `Notification` docs per admin in MongoDB (in-app always written)
- Only ONE push job processed by worker (BullMQ dedup by jobId)
- Worker terminal shows only one `completed` line per admin

**Why:** SHA1 is `push:admin.bg_job_failed:<userId>:{"queue":"test","jobId":"test-0","error":"manual test trigger"}` — identical every time.

---

### 3.8 Dedup — different users get separate jobs

Two admins both get a notification from the same emit call. Their jobIds are different
because `userId` is part of the hash.

Look at the two `completed` lines in the worker terminal from 3.2. They have different
hash values — one per admin.

---

### 3.9 Worker retry — simulate a transient failure

Temporarily disconnect MongoDB (close Compass, or briefly stop Atlas from firing)
then trigger the test endpoint. The push job enters the queue but the worker fails
to connect DB in `sendFcmToUser`.

**Expected** — worker logs a failure and retries with exponential backoff (1s, 2s,
4s, 8s, 16s). After 5 attempts it marks the job `failed`.

Reconnect MongoDB. The `failed` job stays in BullMQ's failed set (inspect via Redis CLI if available):
```
redis-cli LRANGE bull:notify:failed 0 -1
```

---

### 3.10 Worker restart resilience

Kill the worker (Ctrl+C) while jobs are in the queue. Trigger 3 notifications.
Restart `npm run worker`.

**Expected** — the pending jobs are picked up and processed on restart. BullMQ
persists jobs in Redis between worker restarts.

---

## Phase 4 — SSE Live Stream

Tests `GET /api/notifications/stream`. Use `curl.exe` (native Windows curl) for all
SSE tests — `Invoke-RestMethod` buffers the entire response and cannot stream.

---

### 4.1 Open a persistent connection

```powershell
# Run in a dedicated terminal — leave it open
curl.exe -N "$BASE/api/notifications/stream" -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected** — connection stays open and prints:
```
: connected
```

---

### 4.2 New notification arrives on stream in real-time

In a second terminal while 4.1 is open:

```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN | Out-Null
```

**Expected** — the first terminal immediately prints (no refresh, no polling delay):
```
data: {"id":"...","title":"Background job failed","body":"test · test-0 · manual test trigger","eventId":"admin.bg_job_failed","createdAt":"..."}
```

---

### 4.3 Heartbeat keeps connection alive

Leave the stream open for 25 seconds with no activity.

**Expected**
```
: ping
```

Appears every 25 seconds to prevent proxy/load-balancer timeouts.

---

### 4.4 User isolation — events do not bleed across users

```powershell
# Terminal A — admin stream
curl.exe -N "$BASE/api/notifications/stream" -H "Authorization: Bearer $ADMIN_TOKEN"

# Terminal B — painter stream
curl.exe -N "$BASE/api/notifications/stream" -H "Authorization: Bearer $PAINTER_TOKEN"

# Third terminal — trigger admin-only event
Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN | Out-Null
```

**Expected** — Terminal A receives the event. Terminal B stays silent.

---

### 4.5 Multiple concurrent connections for same user both receive events

Open two streams with the same admin token (two separate terminals):

```powershell
curl.exe -N "$BASE/api/notifications/stream" -H "Authorization: Bearer $ADMIN_TOKEN"
```

Trigger a notification. **Expected** — both terminals print the event. Each SSE
connection has its own Redis subscriber on `notif:<userId>`.

---

### 4.6 Clean disconnect — no server errors

Close the curl stream with `Ctrl+C`. Check:
- No unhandled error in the Next.js terminal
- Worker terminal unaffected

Redis subscriber for that connection should clean up within seconds.

---

### 4.7 Reconnect — events after reconnect are delivered

Close and reopen the stream. Trigger a notification after reopening.

**Expected** — new notification arrives normally. SSE does not have memory of
previous connection (stateless, backed by Redis pub/sub).

Note: notifications that arrived while disconnected are NOT replayed via SSE
(they're in MongoDB and returned by the REST `GET /api/notifications` endpoint).

---

### 4.8 Unauthenticated request

```powershell
curl.exe -N "$BASE/api/notifications/stream"
```

**Expected** — `401` immediately. Connection does not stay open.

---

### 4.9 Expired / invalid token

```powershell
curl.exe -N "$BASE/api/notifications/stream" -H "Authorization: Bearer thisisinvalid"
```

**Expected** — `401` immediately.

---

## Phase 5 — notify.emit Internals

These tests verify the core dispatch logic: audience resolution, actor exclusion,
channel union, and dedup.

---

### 5.1 Role audience — targets all users of a role

The `admin.bg_job_failed` event targets `kind: "role", role: "admin"`. Trigger it
and count the `Notification` docs created:

```js
db.notifications.countDocuments({
  eventId: "admin.bg_job_failed",
  createdAt: { $gte: new Date(Date.now() - 5000) }
})
```

**Expected** — count equals the number of active admin users in the DB.

---

### 5.2 Explicit audience — targets only the specified user

The `account.approved` event targets `kind: "explicit"`. Approve a pending owner.
Only the owner gets a notification — not all owners, not admins.

```js
db.notifications.find({ eventId: "account.approved" }).sort({ createdAt: -1 }).limit(5)
// Only one doc — for the specific approved owner
```

---

### 5.3 Resolver audience — targets computed set of users

The `job.created` event targets `kind: "resolver", name: "paintersOnJob"`. When a
job is created with painters assigned, only those painters get notified.

Create a job via the API with 2 specific painters. Check:
```js
db.notifications.find({ eventId: "job.created" }).sort({ createdAt: -1 })
// Exactly 2 docs — one per assigned painter. No doc for the owner who created it.
```

---

### 5.4 actorId exclusion — actor does not receive own notification

When an owner creates a job, they should NOT receive the `job.created` notification
because they are the actor. Enforced by `if (actorId) recipients.delete(actorId)` in `emit()`.

---

### 5.5 Channel union — multi-target events

The `file.failed` event has two targets:
- `kind: "explicit"` → `["push", "email", "inApp"]`
- `kind: "role", role: "admin"` → `["inApp"]`

If the file owner is an owner-role user, they get all three channels; admins get only inApp.
Verify by triggering a file failure and counting push jobs queued:
- Owner gets push + email job queued → worker shows two `completed` lines
- Each admin gets no push job (inApp only for admin target)

---

### 5.6 Unknown eventId — error handling

Call `notify.emit` with a non-existent event ID (requires a temporary test route or direct code call).

**Expected** — `throw new Error('Unknown notification event: badEventId')` from `emit()`.
The route should catch this and return a 500 or handle it gracefully.

---

## Phase 6 — Refactored Routes

Confirms Stage 4 changes: no raw `admin.messaging()` calls, no inline
`Notification.create` in route handlers.

---

### 6.1 Source code verification — no inline FCM

```powershell
Get-ChildItem -Recurse src\app\api -Filter "*.ts" | Select-String "admin\.messaging\(\)"
Get-ChildItem -Recurse src\app\api -Filter "*.ts" | Select-String "Notification\.create"
```

**Expected** — both return zero results.

---

### 6.2 Register new owner → all admins get in-app notification

Register a new owner through the full frontend flow (requires valid Firebase phone
token + email OTP). After registration:

```js
db.notifications.find({
  eventId: "owner.registered",
  createdAt: { $gte: new Date(Date.now() - 10000) }
})
```

**Expected:**
- One doc per admin user
- No docs for painter or existing owner users
- `readAt: null` for all

---

### 6.3 Register as painter — no admin notification

Register a painter (not an owner). Check:
```js
db.notifications.find({ eventId: "owner.registered" }).sort({ createdAt: -1 }).limit(1)
```

**Expected** — the most recent `owner.registered` doc is from the previous owner
registration (6.2). No new doc was created for a painter registration.

---

### 6.4 Approve owner → owner gets notification, not admin

```powershell
Invoke-RestMethod -Uri "$BASE/api/admin/users/$PENDING_OWNER_ID/approve" `
  -Method PATCH -Headers $ADMIN
```

**Check:**
```js
// Owner has notification
db.notifications.findOne({ userId: ObjectId("OWNER_ID"), eventId: "account.approved" })
// readAt: null, title: "Account approved"

// No notification for the admin who did the approving
db.notifications.findOne({ userId: ObjectId("ADMIN_ID"), eventId: "account.approved" })
// null
```

**Worker terminal** — `push:<jobId> completed` if owner has FCM tokens.

---

### 6.5 Approve — already active owner returns 400

```powershell
# Run twice — second call should fail
try {
  Invoke-RestMethod -Uri "$BASE/api/admin/users/$PENDING_OWNER_ID/approve" `
    -Method PATCH -Headers $ADMIN
} catch { $_.Exception.Response.StatusCode }
```

**Expected** — `400 Bad Request: "User is not pending approval"`.

---

### 6.6 Approve — non-owner user returns 400

```powershell
try {
  Invoke-RestMethod -Uri "$BASE/api/admin/users/$PAINTER_ID/approve" `
    -Method PATCH -Headers $ADMIN
} catch { $_.Exception.Response.StatusCode }
```

**Expected** — `400 Bad Request: "User is not an owner"`.

---

### 6.7 Approve — non-existent user returns 404

```powershell
try {
  Invoke-RestMethod -Uri "$BASE/api/admin/users/000000000000000000000000/approve" `
    -Method PATCH -Headers $ADMIN
} catch { $_.Exception.Response.StatusCode }
```

**Expected** — `404 Not found`.

---

### 6.8 Reject owner → notification body includes reason

```powershell
Invoke-RestMethod -Uri "$BASE/api/admin/users/$PENDING_OWNER_ID/reject" -Method PATCH `
  -Headers $ADMIN -ContentType "application/json" `
  -Body '{"reason":"Incomplete business details"}'
```

**Check MongoDB:**
```js
db.notifications.findOne({ eventId: "account.rejected" })
// body should contain "Incomplete business details"
```

---

### 6.9 Reject without reason — still works

```powershell
Invoke-RestMethod -Uri "$BASE/api/admin/users/$ANOTHER_PENDING_ID/reject" `
  -Method PATCH -Headers $ADMIN
```

**Expected** — `200`. Notification body: `"Your registration was rejected."` (default message).

---

### 6.10 Logout cleans up FCM token

```powershell
Invoke-RestMethod -Uri "$BASE/api/auth/logout" -Method POST `
  -Headers $OWNER -ContentType "application/json" `
  -Body '{"fcmToken":"<token-from-db>"}'
```

**Expected** — `{ "data": { "message": "Logged out" } }`.

**Check MongoDB:**
```js
db.users.findOne({ email: "owner@example.com" }, { fcmTokens: 1 })
// The specific token should be gone from the array
```

---

### 6.11 Logout without FCM token — still works

```powershell
Invoke-RestMethod -Uri "$BASE/api/auth/logout" -Method POST `
  -Headers $OWNER -ContentType "application/json" -Body '{}'
```

**Expected** — `200`. No error when `fcmToken` is not provided.

---

## Phase 7 — Frontend (Browser)

Requires `<NotificationBell />` mounted in the app header and
`<NotificationPreferences />` on a settings page or modal.

---

### 7.1 Bell renders with correct badge

- Log in as a user with unread notifications
- **Expected** — bell icon shows red badge with unread count

---

### 7.2 Bell shows no badge when zero unread

- Mark all read via API, then reload
- **Expected** — bell renders with no badge

---

### 7.3 Dropdown — opens on click, closes on outside click

- Click bell → dropdown opens
- Click anywhere outside the dropdown → dropdown closes
- Click bell again → reopens

---

### 7.4 Dropdown — notifications listed newest first

- Open dropdown
- **Expected** — newest notification at top, unread items have blue dot

---

### 7.5 Mark individual notification read

- Click an unread notification (has blue dot)
- **Expected** — dot disappears, badge decrements immediately (optimistic or after refetch)

---

### 7.6 Mark all read

- Multiple unread notifications visible
- Click "Mark all read"
- **Expected** — all dots disappear, badge disappears

---

### 7.7 Bell updates via SSE — no page refresh

- Open bell dropdown
- Trigger test endpoint from terminal while dropdown is open
- **Expected** — new notification appears at top within ~1 second, badge increments

---

### 7.8 Bell updates via SSE — dropdown closed

- Close dropdown
- Trigger test endpoint from terminal
- **Expected** — badge increments in real-time without any user interaction

---

### 7.9 Multiple browser tabs — both update

- Open app in two tabs, same logged-in user
- Trigger a notification from terminal
- **Expected** — badge updates in both tabs (each tab has its own SSE connection)

---

### 7.10 Polling fallback

- Open DevTools → Network tab → set to "Offline"
- Wait 60 seconds (polling interval)
- Set back to "Online"
- Manually trigger a notification via terminal
- **Expected** — bell refreshes and shows new notification within 60 seconds via polling

---

### 7.11 FCM permission prompt

- Log in on a fresh browser (clear site data first: DevTools → Application → Clear site data)
- **Expected** — browser notification permission prompt appears
- Click "Allow"
- **Check MongoDB:**
  ```js
  db.users.findOne({ email: "your@email.com" }, { fcmTokens: 1 })
  // fcmTokens: ["<long-fcm-token>"]
  ```

---

### 7.12 FCM permission denied — no error

- Clear site data, log in, click "Block" on the permission prompt
- **Expected** — app continues to work normally. No error in console.
  Notifications still delivered via SSE and in-app. Only push is skipped.

---

### 7.13 Foreground push notification (FCM)

- Open the app with FCM permission granted
- Trigger a `submission.reject` event targeting this user (needs a real submission)
- **Expected** — the FCM `onMessage` handler fires, RTK Query cache is invalidated,
  and the bell refreshes showing the new notification

---

### 7.14 Background push notification

- Close or minimise the browser (but keep it running)
- Trigger a push event for this user
- **Expected** — OS-level notification appears via the service worker's
  `onBackgroundMessage` handler (title + body, icon `/icon-192.png`)

---

### 7.15 FCM token removed on logout

- Log out via the app's logout button
- **Check MongoDB:**
  ```js
  db.users.findOne({ email: "your@email.com" }, { fcmTokens: 1 })
  // The token should be removed
  ```
- **Check DevTools → Application → Local Storage:**
  - `wallpainter_token` — gone
  - `wallpainter_fcm_token` — gone

---

### 7.16 Preferences UI — push toggle

- Open preferences panel
- Toggle "Push notifications" off
- Trigger a push event → confirm no push job in worker terminal
- Toggle back on → confirm push resumes

---

### 7.17 Preferences UI — quiet hours

- Set quiet hours to cover the current local time (e.g. 00:00–23:59 for always)
- Trigger a normal-urgency event (e.g. `submission.create`)
- **Expected** — in-app notification created, but no push or email job queued
- Set quiet hours to a past window → normal events deliver again

---

### 7.18 Preferences UI — digest toggle

- Toggle digest on
- **Expected** — `digest: true` saved in MongoDB
  ```js
  db.notificationpreferences.findOne({ userId: ObjectId("...") })
  // digest: true
  ```

---

## Phase 8 — Channel + Preference Logic

These tests verify the `channelAllowed()` logic and mandatory event bypass.

---

### 8.1 Push disabled — in-app still created

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" -Body '{"push":{"*":false}}'
```

Emit a `submission.create` targeting the painter (requires a real submission).

**Check:**
```js
// In-app notification EXISTS
db.notifications.findOne({ userId: ObjectId("PAINTER_ID"), eventId: "submission.create" })
// Not null — in-app always written

// No push job queued — worker terminal should NOT show a push completed for painter
```

---

### 8.2 Email disabled — push still delivered

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" -Body '{"email":{"*":false}}'
```

Trigger a `submission.reject` (has both push + email channels).

**Expected:**
- `push:<jobId> completed` in worker terminal
- NO `email:<jobId> completed`
- In-app notification created

---

### 8.3 Mandatory event bypasses all preferences

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"push":{"*":false},"email":{"*":false},"quietHours":{"start":"00:00","end":"23:59","tz":"UTC"}}'
```

Trigger `user.suspended` for the painter (mandatory event). This requires setting the
painter status to active first, then using the admin suspend endpoint.

**Expected:**
- `Notification` doc created (in-app)
- Email job queued and completed despite `email: { "*": false }`
- No push job (suspended event only has email + inApp channels per events.ts)

---

### 8.4 Quiet hours — normal event blocked

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"quietHours":{"start":"00:00","end":"23:59","tz":"UTC"}}'
```

Emit a normal-urgency event (`submission.create`) to the painter.

**Expected:**
- In-app `Notification` doc created
- No push job queued
- No email job queued

---

### 8.5 Quiet hours — urgent event bypasses

Same quiet hours config from 8.4. Emit an urgent event (`submission.reject`) to painter.

**Expected:**
- In-app `Notification` doc created
- Push job queued (`submission.reject` urgency: "urgent")
- Email job queued
- Quiet hours ignored for urgent events

---

### 8.6 Quiet hours — overnight range

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"quietHours":{"start":"22:00","end":"08:00","tz":"UTC"}}'
```

If current time is between 22:00–00:00 or 00:00–08:00 UTC, normal events should be
blocked. If current time is 08:01–21:59 UTC, normal events should go through.

---

### 8.7 Per-event override — specific event disabled

```powershell
Invoke-RestMethod -Uri "$BASE/api/users/me/notification-preferences" -Method PUT `
  -Headers $PAINTER -ContentType "application/json" `
  -Body '{"push":{"*":true,"submission.approve":false}}'
```

Trigger `submission.approve` for painter → no push job.
Trigger `submission.create` for painter → push job queued (wildcard `*: true` applies).

---

## Phase 9 — Database Integrity

---

### 9.1 Verify TTL index on notifications

```js
db.notifications.getIndexes()
// Should include: { key: { createdAt: 1 }, expireAfterSeconds: 7776000, name: "createdAt_1" }
```

`7776000` seconds = 90 days. Docs older than 90 days are automatically deleted by MongoDB.

---

### 9.2 Verify indexes on notifications collection

```js
db.notifications.getIndexes()
// Expected indexes:
// 1. _id (default)
// 2. { userId: 1, createdAt: -1 } — list query
// 3. { userId: 1, readAt: 1, createdAt: -1 } — unread query
// 4. { createdAt: 1 } expireAfterSeconds: 7776000 — TTL
```

---

### 9.3 Verify unique index on notificationpreferences

```js
db.notificationpreferences.getIndexes()
// userId field should have unique: true
```

Attempt to insert a duplicate manually:
```js
db.notificationpreferences.insertOne({ userId: ObjectId("EXISTING_USER_ID"), push: {}, email: {} })
// Expected: WriteError — duplicate key on userId
```

---

### 9.4 Notification data field — arbitrary payload stored correctly

```js
db.notifications.findOne({ eventId: "admin.bg_job_failed" })
// data: { queue: "test", jobId: "test-0", error: "manual test trigger" }
```

---

### 9.5 Notification does not have updatedAt

```js
db.notifications.findOne({})
// Should NOT have an "updatedAt" field
// createdAt exists, updatedAt is disabled in the schema (timestamps: { createdAt: true, updatedAt: false })
```

---

## Phase 10 — Stress & Concurrency

---

### 10.1 Rapid concurrent emits — no duplicate push jobs

```powershell
1..10 | ForEach-Object {
  Invoke-RestMethod -Uri "$BASE/api/notifications/test" -Method POST -Headers $ADMIN | Out-Null
}
```

**Check MongoDB:**
```js
db.notifications.countDocuments({
  eventId: "admin.bg_job_failed",
  createdAt: { $gte: new Date(Date.now() - 5000) }
})
```

**Expected** — 10 docs per admin (each emit creates one in-app row). Push jobs
are deduplicated — worker processes fewer than 10 jobs due to SHA1 dedup.

---

### 10.2 Large notification list performance

```powershell
Measure-Command {
  Invoke-RestMethod -Uri "$BASE/api/notifications?limit=50" -Headers $ADMIN
} | Select-Object -ExpandProperty TotalMilliseconds
```

**Expected** — response in under 200ms with proper indexes in place.

---

### 10.3 Worker handles multiple job types concurrently

Submit a mix of push and email jobs simultaneously and verify the worker processes
all of them (concurrency: 10 in worker config).

Worker terminal should show multiple `completed` lines in rapid succession.

---

## Cleanup After Testing

```js
// Remove test notifications
db.notifications.deleteMany({ eventId: "admin.bg_job_failed" })

// Remove test preferences
db.notificationpreferences.deleteOne({ userId: ObjectId("PAINTER_ID") })

// Remove fake FCM tokens
db.users.updateMany({}, { $set: { fcmTokens: [] } })
```

---

## Services Needed Per Phase

| Phase | Description | Dev server | Worker | Redis | Browser |
|---|---|---|---|---|---|
| 1 | Notification CRUD | ✓ | | | |
| 2 | Preferences | ✓ | | | |
| 3 | Worker + Queue | ✓ | ✓ | ✓ | |
| 4 | SSE stream | ✓ | | ✓ | |
| 5 | emit() internals | ✓ | ✓ | ✓ | |
| 6 | Refactored routes | ✓ | ✓ | ✓ | |
| 7 | Frontend | ✓ | ✓ | ✓ | ✓ |
| 8 | Channel/pref logic | ✓ | ✓ | ✓ | |
| 9 | DB integrity | | | | |
| 10 | Stress | ✓ | ✓ | ✓ | |
