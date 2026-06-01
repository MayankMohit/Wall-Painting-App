# Notification System — Test Coverage

Run the automated suite: `.\notify-test.ps1 -AdminEmail ... -OwnerEmail ... -PainterEmail ... -PendingOwnerId ...`

---

## Coverage Chart

| Area | What's covered | What's missing |
|---|---|---|
| **Notification CRUD API** | List (unread filter, limit cap, sort order), mark-one-read (+ idempotency), mark-all-read (+ no-op), user scoping, 401/403/404 error cases, malformed JWT | Cursor pagination (`?cursor=`), `nextCursor` in response shape |
| **Preference API** | Default shape, wildcard push/email updates, partial updates, per-event dotted-key override (`submission.create`), quiet hours (set/update/clear), GET consistency, multi-user isolation, 400/401 validation | Digest mode read-back, email per-event overrides |
| **Worker — job dispatch** | Test endpoint enqueues a push job (200 confirmed); 10 rapid emits all succeed | Dedup confirmed by HTTP status only — not verified in Redis; fanout path (`processFanout`) not directly triggered |
| **Worker — actual delivery** | Not covered | FCM push delivered to device, email sent via Resend, worker retry on failure, job failure logged correctly |
| **Preference enforcement in worker** | Not covered | `submission.create=false` blocks push job, `*=false` blocks all, quiet-hours window skips job, mandatory events (`user.suspended`) bypass prefs |
| **SSE stream** | Not covered | Connect returns `text/event-stream`, `: connected` comment appears, live push arrives after emit, heartbeat ping every 25s, 401 without token, cleanup on disconnect |
| **FCM token endpoints** | Not covered | `POST /api/users/me/fcm-token` stores token, `DELETE` removes it, logout drops token |
| **Real event integration** | Admin test endpoint only | `submission.create/approve/reject/revoke/resubmit/edited_by_owner` fired by actual API actions; `job.created/painter_added/painter_removed/completed`; `file.ready/failed`; `auth.password_reset/changed/new_device`; `user.suspended`; `account.approved/rejected`; `owner.registered` |
| **Audience targeting** | Not covered | `role:admin` — only admins receive `admin.*` events; `resolver:paintersOnJob` — all painters on a job receive `job.created`; `actorId` exclusion (actor doesn't get own notification); `all` fanout |
| **Multi-channel urgent events** | Not covered | `submission.reject` → push + email + in-app all created; `file.failed` → owner gets push+email+in-app AND admins get in-app |
| **Admin user management** | `6.4/6.5` approve/reject (skipped unless `-PendingOwnerId` passed); wrong-role 400; non-existent 404 | Approve fires `account.approved` notification to owner; reject fires `account.rejected` |
| **Code structure** | No `admin.messaging()` or `Notification.create()` in API routes (static scan) | — |
| **Performance** | 10 rapid emits all 200; GET limit=50 < 500ms | Fanout to 100+ users; sustained load; MongoDB index hit confirmed via `explain()` |

**Current score: 47 / 47 automated tests pass.**

---

## Next Steps

### 1. SSE stream (high value, quick to add)

Add tests to `notify-test.ps1` using curl's `--max-time` + `--no-buffer` to open the stream briefly, check the `Content-Type: text/event-stream` header and the `: connected` line:

```powershell
# Open stream for 2 seconds and capture headers + initial bytes
$out = & curl.exe --silent --max-time 2 --no-buffer `
    --dump-header - `
    -H "Authorization: Bearer $painterToken" `
    "$Base/api/notifications/stream" 2>$null
# Assert "text/event-stream" in $out and ": connected" in $out
```

Also test: no token → 401.

### 2. Preference enforcement in worker

This is the most important gap — your preferences don't actually block delivery until this is verified. Steps:

1. Set `push.submission.create = false` for a user.
2. Trigger a `submission.create` event for that user (either via the real submission API or a dedicated admin test endpoint that accepts an `eventId` param).
3. After ~1s, assert **no** push job with that user+event was added to the BullMQ queue (check via the Bull dashboard or a queue-inspection API route).
4. Assert the in-app `Notification` row **was** still created (in-app is always written).

### 3. Real event integration tests

Pick the three highest-traffic events first:

| Test | How to trigger | What to assert |
|---|---|---|
| `submission.create` | `POST /api/jobs/:id/submissions` as painter | Owner gets in-app notification; push job in queue |
| `submission.reject` | `PATCH /api/submissions/:id` (reject) as owner | Painter gets in-app + push + email job in queue |
| `account.approved` | `PATCH /api/admin/users/:id/approve` as admin | Owner gets in-app notification |

### 4. FCM token registration

```powershell
# Register a fake token
$r = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method POST `
    -Headers $PAINTER -Body '{"token":"fake-fcm-token-for-test"}'
# Assert 200

# Delete it
$r = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method DELETE `
    -Headers $PAINTER -Body '{"token":"fake-fcm-token-for-test"}'
# Assert 200

# Confirm logout drops all tokens (POST /api/auth/logout then check DB)
```

### 5. Audience targeting

Add a test that emits `admin.bg_job_failed` and then checks:
- The admin user has a new in-app notification for it.
- The painter/owner do **not** have a notification for it.

This verifies the `role:admin` audience resolver works end-to-end.

### 6. Manual / browser tests (can't automate easily)

- FCM push actually appears as a browser notification (requires a real device token)
- SSE: open the bell UI, emit an event from another tab, badge count updates without refresh
- Quiet hours: set quiet hours to include the current time, trigger a normal-urgency event, confirm push job is skipped
- Heartbeat: keep SSE stream open 26+ seconds, confirm `: ping` arrives
