# Notification System — Known Bugs

A ranked list of issues found while auditing the notifications code. Severity reflects user impact + likelihood of triggering, not difficulty to fix.

---

## 1. `_seenNotifIds` Set grows unbounded (memory leak)

**File:** `src/components/common/NotificationBell.tsx:18`

```ts
const _seenNotifIds = new Set<string>();
```

Module-level `Set` is appended on every SSE message and never trimmed. In a long-running session (single-page app left open for hours), the set grows without bound and survives logout/login because it lives at module scope.

**Fix sketch:** cap at e.g. 200 entries with FIFO eviction, or use a small LRU. Could also key on a sliding window of `createdAt`.

---

## 2. SSE chunk-splitting drops messages

**File:** `src/components/common/NotificationBell.tsx:144-163`

```ts
const text = decoder.decode(value, { stream: true });
for (const line of text.split('\n')) {
  if (!line.startsWith('data: ')) continue;
  ...
  const payload = JSON.parse(line.slice(6)) as { ... };
```

No line buffer between reads. A `data: {...}\n\n` event split across two TCP chunks → `JSON.parse` throws → swallowed by the empty `catch {}` → toast + sound silently lost. The bell still updates because `invalidateTags(['Notification'])` fires before the JSON parse, but the live alert UX breaks intermittently under load or slow connections.

**Fix sketch:** keep a `buffer` string across iterations; only consume complete lines (`\n\n` event boundary), keep the trailing partial.

---

## 3. SSE reconnects on every mute toggle

**File:** `src/components/common/NotificationBell.tsx:129-169`

```ts
useEffect(() => {
  ...
}, [isAuthenticated, dispatch, muted, addToast]);
```

`muted` and `addToast` are in deps. Toggling the speaker icon tears down the SSE fetch, aborts the reader, and reopens a fresh stream — including a new Redis `SUBSCRIBE` on the server. Wasteful and racy if a notification arrives mid-tear-down.

**Fix sketch:** drop `muted` and `addToast` from deps; read `muted` via `useNotificationUiStore.getState().muted` (or a `useRef` synced in a separate effect) inside the handler so the value is current without re-running the effect.

---

## 4. AudioContext leak in `playNotificationSound`

**File:** `src/lib/notificationSound.ts`

```ts
const ctx = new AudioContext();
notes.forEach(...);
// ctx never closed
```

A new `AudioContext` per chime, never `close()`d. Chrome warns at ~6 simultaneous contexts and stops creating new ones. After enough notifications in one session, the chime silently dies.

**Fix sketch:** use a single module-level lazily-created `AudioContext`, or `close()` it after `osc.stop()` completes (`osc.onended = () => ctx.close()`).

---

## 5. `submission.approve` / `submission.reject` events never fire

**Files:**
- `src/app/api/jobs/[jobId]/submissions/[submissionId]/approve/route.ts`
- `src/app/api/jobs/[jobId]/submissions/[submissionId]/reject/route.ts`

Neither route imports `notify` or calls `notify.emit`. The events are defined in `src/lib/notify/events.ts` and have push/email/in-app templates ready, but they are never triggered by the actual API actions. Painters get no notification when their submission is approved or rejected — defeating the core purpose of the notification system. (`docs/08-notifications-test.md` already flags this gap under "Real event integration".)

**Fix sketch:** after `submission.save()`, emit `submission.approve` (recipient = painter, actor = owner, data = `{ code, count }`) and `submission.reject` (recipient = painter, actor = owner, data = `{ code, reason, painterName, jobUrl }`).

Same gap likely exists for `submission.create`, `submission.resubmit`, `submission.revoke`, `submission.edited_by_owner`, `job.created`, `job.painter_added`, `job.painter_removed`, `job.completed`, `file.ready`, `file.failed`, `auth.password_reset`, `auth.password_changed`, `auth.new_device`, `user.suspended` — needs a sweep.

---

## 6. `NotificationToast` does a full page reload

**File:** `src/components/common/NotificationToast.tsx:27,36`

```ts
onClick={() => { removeToast(id); window.location.href = '/'; }}
```

Clicking the toast hard-navigates via `window.location.href`, discarding the RTK Query cache and re-downloading the JS bundle. On a focused tab the user already sees the bell update — the navigation is unnecessary; if a destination is wanted, it should be via Next's `useRouter().push('/')`.

**Fix sketch:** import `useRouter` from `next/navigation`, call `router.push('/')` (or skip navigation entirely and just close the toast).

---

## 7. `NotificationPreferences` time inputs are uncontrolled

**File:** `src/components/common/NotificationPreferences.tsx:110, 127`

```tsx
<input type="time" defaultValue={qh?.start ?? '22:00'} onChange={...} />
```

`defaultValue` only seeds the initial value. If the server returns updated `quietHours` after another tab edits them, the input doesn't reflect the new state. Also, if RTK Query refetches and `prefs` changes, the user sees a stale field value.

**Fix sketch:** swap `defaultValue` → `value` and ensure local state is derived from `prefs.quietHours` (or use `key={qh?.start}` as a quick remount workaround).

---

## ~~8. Service-worker `onBackgroundMessage` reads from the wrong field~~ ✅ RESOLVED

**Resolution:** Applied Option A — SW handler now reads `payload.notification.title` / `.body`. Verified end-to-end on laptop + mobile: worker logs `FCM accepted send`, SW logs `onBackgroundMessage fired` with the real title/body, OS displays the popup when browser is minimized or fully closed.

While diagnosing this, also fixed a related blocker: `registerFCM()` was calling `getApp()` but `firebase-client.ts` (which calls `initializeApp`) was only imported by the login/register pages — so on any other route, FCM init threw silently and no token ever reached the server. Now `firebase-client.ts` exports `firebaseApp`, and `firebase-fcm.ts` imports it directly, guaranteeing initialization.

**Files touched:**
- `src/app/firebase-messaging-sw.js/route.ts` — read from `payload.notification`
- `src/lib/firebase-client.ts` — export `firebaseApp`
- `src/lib/firebase-fcm.ts` — import `firebaseApp` instead of calling `getApp()`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/app/firebase-messaging-sw.js/route.ts:22-33`

```js
messaging.onBackgroundMessage(function(payload) {
  var title = (payload.data && payload.data.title) || 'Wallo';
  var body  = (payload.data && payload.data.body)  || '';
  ...
});
```

The server (`src/lib/fcm.ts`) sends FCM messages with the `notification: { title, body }` field, not `data`. The Firebase Web SDK does NOT auto-display when `onBackgroundMessage` is registered — the handler must call `showNotification` itself, and it was reading from the wrong field.

</details>

---

## 9. Bell re-runs `registerFCM()` on every click

**File:** `src/components/common/NotificationBell.tsx:177-189`

```ts
onClick={async () => {
  setOpen((v) => !v);
  ...
  } else if (Notification.permission === 'granted') {
    registerFCM().catch(() => {});  // every click
  }
}}
```

Every dropdown open re-fetches a VAPID token from Firebase and POSTs it to `/api/users/me/fcm-token`. Wasteful network + Firebase quota. Should run at most once per session (or once per token expiry).

**Fix sketch:** gate behind a module-level boolean or a ref; `useFCM` already registers once on auth — only call from the bell when the token was previously cleared / when permission transitions from `default` → `granted`.

---

## 10. SSE has no auto-reconnect

**File:** `src/components/common/NotificationBell.tsx:136-167`

The fetch+reader loop exits on any error (network blip, server restart, sleep/wake) and the empty `catch {}` swallows it. The user is silently offline for live updates until they refresh the page.

**Fix sketch:** wrap the loop in a retry with exponential backoff; or switch to the browser's native `EventSource` (with header workaround via cookie-based auth), which reconnects automatically.

---

## 11. Bell polls every 60s while SSE is live

**File:** `src/components/common/NotificationBell.tsx:107-110`

```ts
useGetNotificationsQuery(undefined, {
  skip:            !isAuthenticated,
  pollingInterval: 60_000,
});
```

SSE already calls `invalidateTags(['Notification'])` on each push, which causes RTK Query to refetch. The 60s poll is redundant — costs one extra HTTP request per minute per tab for nothing.

**Fix sketch:** drop `pollingInterval`, keep SSE as the live mechanism, and accept the slight risk that an SSE outage leaves the bell stale until next user action. Or set polling to a much larger interval (e.g. 10 min) as a fallback.

---

## 12. Foreground push double/triple-notifies

When the tab is focused and FCM delivers a push:
- `useFCM`'s `setupFCMForeground` fires → invalidates RTK cache (bell updates)
- The SSE stream also pushes the same notification → invalidates cache *again* + shows toast + plays sound
- FCM may *also* display the OS-level Web Push popup because of `webpush.notification` config

Net result: bell flashes, in-app toast appears, chime plays, *and* the OS notification slides in — all for the same event.

**Fix sketch:** decide on a single foreground channel. Easiest: skip enqueueing a FCM push job when the user has an active SSE connection (track via Redis `SET notif:online:${userId}` with TTL refreshed by the stream heartbeat); or simply suppress the OS notification when the page has focus by sending data-only FCM messages and having the SW check `clients.matchAll({ visible: true })` before calling `showNotification`.

---

## Quick-win priority

If we want to ship a fix pass with the highest ROI:

1. **#5** (events not wired) — highest functional impact, painters don't get notifications today.
2. **#4** (AudioContext leak) — silent chime degradation is a poor UX.
3. **#1, #2, #3** (SSE robustness trio) — small code, high reliability gain.
4. **#7** (controlled inputs) — easy, fixes a visible UI bug.
5. **#6** (toast nav) — one-liner.

The rest (#8–#12) are quality-of-life and can wait.
