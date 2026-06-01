# Notification System — Known Bugs

A ranked list of issues found while auditing the notifications code. Severity reflects user impact + likelihood of triggering, not difficulty to fix.

---

## ~~1. `_seenNotifIds` Set grows unbounded (memory leak)~~ ✅ RESOLVED

**Resolution:** Bounded the `Set` to `MAX_SEEN_IDS = 200` with FIFO eviction (JS Sets preserve insertion order, so `_seenNotifIds.values().next().value` is always the oldest). Existing `.has()` / `.add()` semantics unchanged at the call site; eviction is a 4-line block right after `add`. Verified with `tsc --noEmit`.

**File touched:** `src/components/common/NotificationBell.tsx`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/components/common/NotificationBell.tsx:18`

```ts
const _seenNotifIds = new Set<string>();
```

Module-level `Set` is appended on every SSE message and never trimmed. In a long-running session the set grows without bound and survives logout/login because it lives at module scope.

</details>

---

## ~~2. SSE chunk-splitting drops messages~~ ✅ RESOLVED

**Resolution:** Added a `buffer` string that carries any trailing partial line between `reader.read()` iterations. The inner loop now uses `indexOf('\n')` to consume only complete lines, leaving any remainder in the buffer for the next chunk. JSON.parse can no longer split a `data: {...}` event across reads.

**File touched:** `src/components/common/NotificationBell.tsx`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/components/common/NotificationBell.tsx:144-163`

```ts
const text = decoder.decode(value, { stream: true });
for (const line of text.split('\n')) {
  ...
```

No line buffer between reads — a `data: {...}` event split across two TCP chunks → `JSON.parse` throws → swallowed by the empty `catch {}` → toast + sound silently lost.

</details>

---

## ~~3. SSE reconnects on every mute toggle~~ ✅ RESOLVED

**Resolution:** Added `mutedRef` and `addToastRef`, synced via tiny `useEffect`s. The SSE handler now reads `mutedRef.current` / `addToastRef.current` inside the loop, so the latest value is always visible without those values being effect deps. Deps array is now `[isAuthenticated, dispatch]` — both stable — so the SSE connection persists across mute toggles.

**File touched:** `src/components/common/NotificationBell.tsx`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/components/common/NotificationBell.tsx:129-169`

`muted` and `addToast` were in deps → toggling the speaker icon tore down the SSE fetch, aborted the reader, and reopened a fresh stream + new Redis `SUBSCRIBE`.

</details>

---

## ~~4. AudioContext leak in `playNotificationSound`~~ ✅ RESOLVED

**Resolution:** One module-level lazy `AudioContext` (`_ctx`) is created on first chime and reused thereafter. If the browser has auto-suspended it (autoplay policy), we call `.resume()` before scheduling oscillators — a no-op when already running and harmless before any user gesture. Single context = no more 6-context Chrome cap.

**File touched:** `src/lib/notificationSound.ts`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/lib/notificationSound.ts`

```ts
const ctx = new AudioContext();
// ctx never closed
```

A new `AudioContext` per chime, never `close()`d. Chrome warns at ~6 simultaneous contexts and stops creating new ones — after enough notifications in one session the chime silently dies.

</details>

---

## 5. `submission.approve` / `submission.reject` events never fire

**Files:**
- `src/app/api/jobs/[jobId]/submissions/[submissionId]/approve/route.ts`
- `src/app/api/jobs/[jobId]/submissions/[submissionId]/reject/route.ts`

Neither route imports `notify` or calls `notify.emit`. The events are defined in `src/lib/notify/events.ts` and have push/email/in-app templates ready, but they are never triggered by the actual API actions. Painters get no notification when their submission is approved or rejected — defeating the core purpose of the notification system. (`docs/08-notifications-test.md` already flags this gap under "Real event integration".)

**Fix sketch:** after `submission.save()`, emit `submission.approve` (recipient = painter, actor = owner, data = `{ code, count }`) and `submission.reject` (recipient = painter, actor = owner, data = `{ code, reason, painterName, jobUrl }`).

Same gap likely exists for `submission.create`, `submission.resubmit`, `submission.revoke`, `submission.edited_by_owner`, `job.created`, `job.painter_added`, `job.painter_removed`, `job.completed`, `file.ready`, `file.failed`, `auth.password_reset`, `auth.password_changed`, `auth.new_device`, `user.suspended` — needs a sweep.

---

## ~~6. `NotificationToast` does a full page reload~~ ✅ RESOLVED

**Resolution:** Removed the navigation click handler from the toast entirely (it was deemed unnecessary — the bell update + OS popup already inform the user). The colored strip and content `<button>`s were converted to non-interactive `<div>`s; `useRouter`, `openApp`, the click-affordance hover classes, and `aria-label="Open app"` are gone. Only the dismiss (X) button remains clickable. Scope: in-app React toast only — the OS-level Web Push click handler in `firebase-messaging-sw.js` (`notificationclick` → `clients.openWindow`) is untouched.

**File touched:** `src/components/common/NotificationToast.tsx`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/components/common/NotificationToast.tsx:27,36`

```ts
onClick={() => { removeToast(id); window.location.href = '/'; }}
```

Hard-navigates, discarding RTK Query cache and re-downloading the JS bundle.

</details>

---

## ~~7. `NotificationPreferences` time inputs are uncontrolled~~ ✅ RESOLVED

**Resolution:** Added local `qhStart` / `qhEnd` state initialized from `prefs.quietHours`, kept in sync with server values via two small `useEffect`s. Inputs are now `value`-controlled (no more `defaultValue`). The onChange handler updates local state first, then dispatches the mutation. As a side-benefit, the `save` calls for one field now read the other from local state (`qhStart` / `qhEnd`) instead of `qh?.start` / `qh?.end` from the cache — eliminating a latent race where a quick From→Until edit could send a stale `start` to the server before RTK Query had refetched. All hook declarations stay before the early return (Rules of Hooks intact). The Toggle, channel toggles, save button, and "Saving…" indicator are untouched.

**File touched:** `src/components/common/NotificationPreferences.tsx`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/components/common/NotificationPreferences.tsx:110, 127`

```tsx
<input type="time" defaultValue={qh?.start ?? '22:00'} onChange={...} />
```

`defaultValue` only seeds — server-side updates from another tab or RTK refetch don't flow through.

</details>

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

## ~~9. Bell re-runs `registerFCM()` on every click~~ ✅ RESOLVED

**Resolution:** Made `registerFCM()` itself idempotent within a session via a module-level `_fcmRegistered` flag in `firebase-fcm.ts`. Once the full permission/SW/getToken/POST flow completes, subsequent calls return the cached `localStorage.wallpainter_fcm_token` instead of repeating the work. If that cached token is missing (e.g. after logout clears localStorage), the flag self-resets and the next call runs the flow fresh — so re-login as a different user still registers correctly. No changes needed in `NotificationBell.tsx` or `useFCM` — both share the short-circuit. Resets implicitly on full page reload.

**File touched:** `src/lib/firebase-fcm.ts`

---

<details>
<summary>Original entry (for reference)</summary>

**File:** `src/components/common/NotificationBell.tsx:177-189`

Every dropdown open re-fetched a VAPID token from Firebase and POSTed it to `/api/users/me/fcm-token`. Wasteful network + Firebase quota.

</details>

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
