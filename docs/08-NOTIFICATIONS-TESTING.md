# Notification System — Testing Guide

Full end-to-end test plan for the notification system built across Stages 1–5.
Run phases in order — each phase builds on the previous one.

---

## Prerequisites

### Services

```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — notify worker
npm run worker

# Redis — Upstash URL is in .env, no local process needed
```

### Shell setup

Run once at the start of every test session. Replace the tokens with real values.

**bash / WSL**
```bash
# If running from WSL, find your Windows host IP
export HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
# If running from the same machine as the server, use localhost
export HOST=localhost

export ADMIN_TOKEN="eyJ..."
export OWNER_TOKEN="eyJ..."
export PAINTER_TOKEN="eyJ..."
export BASE="http://$HOST:3000"
```

**PowerShell**
```powershell
$BASE   = "http://localhost:3000"
$ADMIN  = @{ Authorization = "Bearer eyJ..." }
$OWNER  = @{ Authorization = "Bearer eyJ..." }
$PAINTER = @{ Authorization = "Bearer eyJ..." }
$JSON   = @{ Authorization = "Bearer eyJ..."; "Content-Type" = "application/json" }
```

### Login helper

**bash**
```bash
get_token() {
  curl -s -X POST $BASE/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$1\",\"password\":\"$2\"}" | python -m json.tool
}
get_token admin@example.com password123
```

**PowerShell**
```powershell
function Get-Token($email, $pass) {
  $r = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body "{`"identifier`":`"$email`",`"password`":`"$pass`"}"
  $r.data.token
}
$ADMIN_TOKEN = Get-Token "admin@example.com" "password123"
```

### Test accounts needed

| Variable | Role | Status |
|---|---|---|
| `ADMIN_TOKEN` | admin | active |
| `OWNER_TOKEN` | owner | active |
| `PAINTER_TOKEN` | painter | active |
| `PENDING_OWNER_ID` | owner | inactive (pending approval) |

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

**bash**
```bash
curl -s -X POST $BASE/api/notifications/test \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**PowerShell**
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

**bash**
```bash
curl -s "$BASE/api/notifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**PowerShell**
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

**bash**
```bash
curl -s "$BASE/api/notifications?unread=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — all items in `notifications` have `readAt: null`. `unreadCount` matches array length.

---

### 1.4 Limit parameter — custom value

**bash**
```bash
# Seed 10 notifications first, then test limit
for i in {1..10}; do
  curl -s -X POST $BASE/api/notifications/test \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
done

curl -s "$BASE/api/notifications?limit=3" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — exactly 3 items in `notifications`. `unreadCount` reflects total unread (not just 3).

---

### 1.5 Limit parameter — cap at 50

**bash**
```bash
curl -s "$BASE/api/notifications?limit=999" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — at most 50 items. No error — the value is silently clamped.

---

### 1.6 Limit parameter — invalid value

**bash**
```bash
curl -s "$BASE/api/notifications?limit=abc" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — falls back to default of 20, no error (NaN → 0 → Math.min clamps to 20).

---

### 1.7 Unread + limit combined

**bash**
```bash
curl -s "$BASE/api/notifications?unread=true&limit=2" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — at most 2 items, all with `readAt: null`. `unreadCount` still reflects total.

---

### 1.8 Notifications are sorted newest first

Look at the `createdAt` fields in the response from 1.2. Each item's `createdAt`
should be equal to or older than the previous item. Verify manually from the response.

---

### 1.9 Mark one notification read

Copy an `_id` from the response above.

**bash**
```bash
export NOTIF_ID="6a1ca12a94c8244e5c0ff291"  # replace with real id

curl -s -X PUT "$BASE/api/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**PowerShell**
```powershell
$NOTIF_ID = "6a1ca12a94c8244e5c0ff291"
Invoke-RestMethod -Uri "$BASE/api/notifications/$NOTIF_ID/read" -Method PUT -Headers $ADMIN
```

**Expected** — full notification object returned with `readAt` set to a non-null timestamp.

---

### 1.10 Mark read is idempotent

Call the same endpoint twice. The second call should not error.

**bash**
```bash
curl -s -X PUT "$BASE/api/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `200` again. `readAt` is updated to a slightly newer timestamp (idempotent).

---

### 1.11 Unread count drops after mark read

**bash**
```bash
curl -s "$BASE/api/notifications?unread=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `unreadCount` is one less than before 1.9.

---

### 1.12 New user — empty notifications

Log in as the painter (who has never received a notification).

**bash**
```bash
curl -s "$BASE/api/notifications" \
  -H "Authorization: Bearer $PAINTER_TOKEN" | python -m json.tool
```

**Expected**
```json
{ "data": { "notifications": [], "unreadCount": 0 } }
```

---

### 1.13 Mark all read

Ensure there are multiple unread notifications for the admin, then:

**bash**
```bash
curl -s -X POST "$BASE/api/notifications/read-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**PowerShell**
```powershell
Invoke-RestMethod -Uri "$BASE/api/notifications/read-all" -Method POST -Headers $ADMIN
```

**Expected** — `{ "data": { "updated": N } }` where N equals the number of unread docs
belonging to this user only (not other users).

---

### 1.14 Mark all read — nothing to mark

With zero unread notifications:

**bash**
```bash
curl -s -X POST "$BASE/api/notifications/read-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `{ "data": { "updated": 0 } }`. No error.

---

### 1.15 Notifications are scoped per user

Admin's notifications are not visible to the painter and vice versa.
Fetch with painter token — should only return painter's own notifications (currently empty).

**bash**
```bash
curl -s "$BASE/api/notifications" \
  -H "Authorization: Bearer $PAINTER_TOKEN" | python -m json.tool
```

**Expected** — `notifications: []`, `unreadCount: 0`. Admin's notifications do not appear.

---

### 1.16 Security — cross-user mark read

Try to mark the admin's notification as read using the painter token.

**bash**
```bash
curl -s -X PUT "$BASE/api/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $PAINTER_TOKEN" | python -m json.tool
```

**Expected** — `404`. Painter cannot see or modify another user's notification.

---

### 1.17 Security — valid ObjectId but non-existent

Generate a random valid ObjectId that doesn't exist in the DB.

**bash**
```bash
curl -s -X PUT "$BASE/api/notifications/000000000000000000000000/read" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `404`.

---

### 1.18 Security — invalid ObjectId format

**bash**
```bash
curl -s -X PUT "$BASE/api/notifications/not-an-id/read" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `404` (ObjectId validation rejects before querying).

---

### 1.19 Security — no auth token

**bash**
```bash
curl -s "$BASE/api/notifications" | python -m json.tool
curl -s -X POST "$BASE/api/notifications/read-all" | python -m json.tool
curl -s -X PUT "$BASE/api/notifications/$NOTIF_ID/read" | python -m json.tool
```

**Expected** — `401` for all three.

---

### 1.20 Security — non-admin calling test endpoint

**bash**
```bash
curl -s -X POST "$BASE/api/notifications/test" \
  -H "Authorization: Bearer $PAINTER_TOKEN" | python -m json.tool

curl -s -X POST "$BASE/api/notifications/test" \
  -H "Authorization: Bearer $OWNER_TOKEN" | python -m json.tool
```

**Expected** — `403` for both.

---

### 1.21 Security — malformed JWT

**bash**
```bash
curl -s "$BASE/api/notifications" \
  -H "Authorization: Bearer thisisnotavalidjwt" | python -m json.tool
```

**Expected** — `401`.

---

## Phase 2 — Notification Preferences

Tests `GET /api/users/me/notification-preferences` and
`PUT /api/users/me/notification-preferences`.

---

### 2.1 Default preferences — first-time user

Use the painter who has no preferences doc yet.

**bash**
```bash
curl -s "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" | python -m json.tool
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

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push":{"*":false}}' | python -m json.tool
```

**Expected response** — `push: { "*": false }`, email and quietHours unchanged.

**Check MongoDB** — a `notificationpreferences` doc now exists for this painter.

---

### 2.3 Second PUT updates — no duplicate doc created

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":{"*":false}}' | python -m json.tool
```

**Check MongoDB** — still exactly ONE doc for this painter. `push: { "*": false }` and
`email: { "*": false }` both set (upsert, not insert).

---

### 2.4 Partial update does not overwrite unrelated fields

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"digest":true}' | python -m json.tool
```

**Expected** — `digest: true`, but `push: { "*": false }` and `email: { "*": false }`
are still set from 2.2 and 2.3.

---

### 2.5 Per-event override alongside wildcard

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push":{"*":true,"submission.create":false}}' | python -m json.tool
```

**Expected** — `push: { "*": true, "submission.create": false }`.
Meaning: all push on except for `submission.create` specifically.

---

### 2.6 Set quiet hours

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quietHours":{"start":"22:00","end":"08:00","tz":"Asia/Kolkata"}}' | python -m json.tool
```

**Expected** — `quietHours: { "start": "22:00", "end": "08:00", "tz": "Asia/Kolkata" }`.
Other fields unchanged from previous PUT.

---

### 2.7 Update quiet hours — change end time only

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quietHours":{"start":"22:00","end":"09:00","tz":"Asia/Kolkata"}}' | python -m json.tool
```

**Expected** — `end` changed to `09:00`, `start` and `tz` remain.

---

### 2.8 Clear quiet hours

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quietHours":null}' | python -m json.tool
```

**Expected** — `quietHours: null`. All other fields unchanged.

---

### 2.9 GET reflects latest state

After all the PUTs above, GET should return the current saved state.

**bash**
```bash
curl -s "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" | python -m json.tool
```

**Expected** — matches what was last PUT. GET is never stale.

---

### 2.10 Preferences are per-user — users are independent

Fetch with admin token. The admin should have default prefs (no doc in DB).

**bash**
```bash
curl -s "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — defaults `{ "*": true }` for both push and email. Painter's changes
above do not affect the admin.

---

### 2.11 Validation — invalid quiet hours format (non-HH:MM)

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quietHours":{"start":"10pm","end":"8am","tz":"Asia/Kolkata"}}' | python -m json.tool
```

**Expected** — `400 Bad Request`. Zod regex `^\d{2}:\d{2}$` rejects `10pm`.

---

### 2.12 Validation — quietHours missing tz

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quietHours":{"start":"22:00","end":"08:00"}}' | python -m json.tool
```

**Expected** — `400 Bad Request`. `tz` is required inside quietHours.

---

### 2.13 Validation — empty body

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python -m json.tool
```

**Expected** — `200`. All fields are optional in the schema — empty body is a no-op
update (returns current state).

---

### 2.14 Validation — non-boolean push value

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push":{"*":"yes"}}' | python -m json.tool
```

**Expected** — `400 Bad Request`. Zod requires boolean values in the push map.

---

### 2.15 Security — no auth token

**bash**
```bash
curl -s "$BASE/api/users/me/notification-preferences" | python -m json.tool
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Content-Type: application/json" -d '{"digest":true}' | python -m json.tool
```

**Expected** — `401` for both.

---

### 2.16 Reset painter to defaults before next phases

**bash**
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push":{"*":true},"email":{"*":true},"quietHours":null,"digest":false}' > /dev/null
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

**bash**
```bash
curl -s -X POST "$BASE/api/notifications/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
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

Insert two fake tokens (one invalid, one valid if you have a real device):
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

The easiest way to test an email job without a full submission flow is to call
`notify.emit` directly from `mongosh`:

```js
// In mongosh — paste the painter's userId
const painterId = "6a1987c5163b0ee6f6bb706e"
const data = {
  painterName: "Test Painter",
  reason: "Images are too dark",
  code: "SUB-001",
  jobUrl: "http://localhost:3000/jobs/test"
}

// This requires running a small script; use the test route approach below instead
```

**Easier approach** — temporarily add a test route or call via the file generation
route in your app. Or trigger a real submission rejection from the owner dashboard
in Phase 6.

**Expected:**
- Worker logs `[notifyWorker] email:<jobId> completed`
- Painter receives an email in their inbox via Resend
- Email subject: `#SUB-001 needs revision`

---

### 3.7 Dedup — same data produces same SHA1 hash

Call the test endpoint twice rapidly:

**bash**
```bash
curl -s -X POST "$BASE/api/notifications/test" -H "Authorization: Bearer $ADMIN_TOKEN" &
curl -s -X POST "$BASE/api/notifications/test" -H "Authorization: Bearer $ADMIN_TOKEN" &
wait
```

**Expected:**
- Two `Notification` docs in MongoDB (in-app always written)
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

Reconnect MongoDB. The `failed` job stays in BullMQ's failed set (inspect via
Redis CLI if available):
```bash
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

Tests `GET /api/notifications/stream`.

---

### 4.1 Open a persistent connection

**bash**
```bash
curl -N "$BASE/api/notifications/stream" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

`-N` disables buffering. Leave this running in its own terminal.

**Expected** — connection stays open and prints:
```
: connected
```

---

### 4.2 New notification arrives on stream in real-time

In a second terminal while 4.1 is open:

**bash**
```bash
curl -s -X POST "$BASE/api/notifications/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
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

Open two streams simultaneously, one per user:

**Terminal A (admin)**
```bash
curl -N "$BASE/api/notifications/stream" -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Terminal B (painter)**
```bash
curl -N "$BASE/api/notifications/stream" -H "Authorization: Bearer $PAINTER_TOKEN"
```

Trigger admin test endpoint (targets only admins):
```bash
curl -s -X POST "$BASE/api/notifications/test" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
```

**Expected** — Terminal A receives the event. Terminal B stays silent.

---

### 4.5 Multiple concurrent connections for same user both receive events

Open two streams with the same admin token:

**Terminal A and B** — both running:
```bash
curl -N "$BASE/api/notifications/stream" -H "Authorization: Bearer $ADMIN_TOKEN"
```

Trigger a notification. **Expected** — both terminals print the event. Each SSE
connection has its own Redis subscriber on `notif:<userId>`.

---

### 4.6 Clean disconnect — no server errors

Close the curl stream with `Ctrl+C`. Check:
- No unhandled error in the Next.js terminal
- Worker terminal unaffected

Redis subscriber for that connection should clean up within seconds.
If you have Redis CLI: `CLIENT LIST` should not show dangling idle subscribers
after ~5 seconds.

---

### 4.7 Reconnect — events after reconnect are delivered

Close and reopen the stream. Trigger a notification after reopening.

**Expected** — new notification arrives normally. SSE does not have memory of
previous connection (stateless, backed by Redis pub/sub).

Note: notifications that arrived while disconnected are NOT replayed via SSE
(they're in MongoDB and returned by the REST `GET /api/notifications` endpoint).

---

### 4.8 Unauthenticated request

**bash**
```bash
curl -N "$BASE/api/notifications/stream"
```

**Expected** — `401` immediately. Connection does not stay open.

---

### 4.9 Expired / invalid token

**bash**
```bash
curl -N "$BASE/api/notifications/stream" \
  -H "Authorization: Bearer thisisinvalid"
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

When an owner creates a job and is also somehow a painter on it (edge case), they
should NOT receive the `job.created` notification because they are the actor.

In practice: verify the owner who performs an action doesn't get notified via the
`actorId` exclusion in `emit()`. This is enforced at the emit level:
```ts
if (actorId) recipients.delete(actorId);
```

---

### 5.5 Channel union — multi-target events

The `file.failed` event has two targets:
- `kind: "explicit"` → `["push", "email", "inApp"]`
- `kind: "role", role: "admin"` → `["inApp"]`

If the file owner is an admin, they should receive all three channels (union of
`["push", "email", "inApp"]` and `["inApp"]` = `["push", "email", "inApp"]`).
If the file owner is an owner-role user, they get all three; admins get only inApp.

Verify by triggering a file failure and counting push jobs queued:
- Owner gets push + email job queued → worker shows two `completed` lines
- Each admin gets one push job queued (inApp only, but push is in the explicit target)

Wait — re-read the event definition. `file.failed` explicit target has `push`, so
the file owner gets push. Admin role target only has `inApp`. Verify in `events.ts`.

---

### 5.6 Unknown eventId — error handling

Call `notify.emit` with a non-existent event ID. This can only be triggered from
code — add a temporary test or use the worker test harness.

**Expected** — `throw new Error('Unknown notification event: badEventId')` from `emit()`.
The route should catch this and return a 500 or handle it gracefully.

---

## Phase 6 — Refactored Routes

Confirms Stage 4 changes: no raw `admin.messaging()` calls, no inline
`Notification.create` in route handlers.

---

### 6.1 Source code verification — no inline FCM

**bash**
```bash
grep -r "admin\.messaging()" src/app/api/
grep -r "Notification\.create" src/app/api/
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

```bash
curl -s -X PATCH "$BASE/api/admin/users/$PENDING_OWNER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**PowerShell**
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

**bash**
```bash
curl -s -X PATCH "$BASE/api/admin/users/$PENDING_OWNER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

Run this a second time (owner is now `active`).

**Expected** — `400 Bad Request: "User is not pending approval"`.

---

### 6.6 Approve — non-owner user returns 400

Try to approve a painter account.

**bash**
```bash
curl -s -X PATCH "$BASE/api/admin/users/$PAINTER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `400 Bad Request: "User is not an owner"`.

---

### 6.7 Approve — non-existent user returns 404

**bash**
```bash
curl -s -X PATCH "$BASE/api/admin/users/000000000000000000000000/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `404 Not found`.

---

### 6.8 Reject owner → notification body includes reason

```bash
curl -s -X PATCH "$BASE/api/admin/users/$PENDING_OWNER_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Incomplete business details"}' | python -m json.tool
```

**Check MongoDB:**
```js
db.notifications.findOne({ eventId: "account.rejected" })
// body should contain "Incomplete business details"
```

---

### 6.9 Reject without reason — still works

```bash
curl -s -X PATCH "$BASE/api/admin/users/$ANOTHER_PENDING_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python -m json.tool
```

**Expected** — `200`. Notification body: `"Your registration was rejected."` (default message).

---

### 6.10 Logout cleans up FCM token

Log in via browser, allow FCM permission (token stored in DB). Then:

**bash**
```bash
curl -s -X POST "$BASE/api/auth/logout" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken":"<token-from-db>"}' | python -m json.tool
```

**Expected** — `{ "data": { "message": "Logged out" } }`.

**Check MongoDB:**
```js
db.users.findOne({ email: "owner@example.com" }, { fcmTokens: 1 })
// The specific token should be gone from the array
```

---

### 6.11 Logout without FCM token — still works

**bash**
```bash
curl -s -X POST "$BASE/api/auth/logout" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python -m json.tool
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

Set painter's push to off:
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push":{"*":false}}'
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

Set email to off, push still on:
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":{"*":false}}'
```

Trigger a `submission.reject` (has both push + email channels).

**Expected:**
- `push:<jobId> completed` in worker terminal
- NO `email:<jobId> completed`
- In-app notification created

---

### 8.3 Mandatory event bypasses all preferences

Set painter to have everything off:
```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push":{"*":false},"email":{"*":false},"quietHours":{"start":"00:00","end":"23:59","tz":"UTC"}}'
```

Trigger `user.suspended` for the painter (mandatory event). This requires setting the
painter status to active first, then using the admin suspend endpoint.

**Expected:**
- `Notification` doc created (in-app)
- Email job queued and completed despite `email: { "*": false }`
- No push job (suspended event only has email + inApp channels per events.ts)

---

### 8.4 Quiet hours — normal event blocked

Set quiet hours covering the current time:

```bash
# Get current UTC time in HH:MM and set a window around it
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quietHours":{"start":"00:00","end":"23:59","tz":"UTC"}}'
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

Set quiet hours 22:00–08:00 (crosses midnight). Test at 23:30 UTC:

```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quietHours":{"start":"22:00","end":"08:00","tz":"UTC"}}'
```

If current time is between 22:00–00:00 or 00:00–08:00 UTC, normal events should be
blocked. If current time is 08:01–21:59 UTC, normal events should go through.

---

### 8.7 Per-event override — specific event disabled

```bash
curl -s -X PUT "$BASE/api/users/me/notification-preferences" \
  -H "Authorization: Bearer $PAINTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push":{"*":true,"submission.approve":false}}'
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

Trigger a notification with complex nested data. Check that the `data` field is
persisted as-is in MongoDB and returned in the API response.

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

### 10.1 Rapid concurrent emits — no duplicate notifications

Fire 10 test endpoint calls simultaneously:

**bash**
```bash
for i in {1..10}; do
  curl -s -X POST "$BASE/api/notifications/test" \
    -H "Authorization: Bearer $ADMIN_TOKEN" &
done
wait
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

Seed 50+ notifications for one user and measure response time:

```bash
time curl -s "$BASE/api/notifications?limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
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
