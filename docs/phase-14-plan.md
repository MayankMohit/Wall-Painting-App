# Phase 14 — Notifications Wiring

## Context
Phase 14 completes the notification infrastructure for the auth flow. The approve/reject routes already fire FCM and create DB notifications inline (ad-hoc). This phase centralises FCM into a reusable helper, wires admin notifications when a new owner registers, implements the three stub notification API routes, and creates the RTK Query slice that future UI components will use to fetch the notification bell data.

---

## Changes

### 1. `src/lib/fcm.ts` — new file
`sendFcmToUser(userId, { title, body })` helper:
- Fetches user from DB to get `fcmTokens[]`
- Calls `admin.messaging().send()` per token via `Promise.allSettled()`
- Removes stale tokens from DB when Firebase returns `messaging/registration-token-not-registered`
- Returns void — callers fire-and-forget

### 2. `src/app/api/admin/users/[userId]/approve/route.ts` — update
Replace the inline `user.fcmTokens.map(token => admin.messaging().send(...))` block with a single call to `sendFcmToUser(userId, { title, body })`. No logic changes.

### 3. `src/app/api/admin/users/[userId]/reject/route.ts` — update
Same replacement as above for the reject route.

### 4. `src/app/api/auth/register/route.ts` — update
After owner is created, find all admins and create a `Notification` doc for each:
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
The `User.find({ role: 'admin' })` call already exists on the next line (for sending emails) — consolidate into one query.

### 5. `src/app/api/notifications/route.ts` — implement GET
- `requireAuth` guard
- Query params: `?unread=true` (filter), `?limit=N` (default 20, max 50)
- Returns `{ notifications, unreadCount }`

### 6. `src/app/api/notifications/[id]/read/route.ts` — implement PUT
- `requireAuth` guard
- `findOneAndUpdate({ _id: id, userId })` — scoped to owner so users can't mark others' notifications
- Returns updated notification

### 7. `src/app/api/notifications/read-all/route.ts` — implement POST
- `requireAuth` guard
- `updateMany({ userId, read: false }, { read: true })`
- Returns `{ updated: count }`

### 8. `src/store/index.ts` — new file
Redux Toolkit store wiring RTK Query middleware:
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

### 9. `src/store/api/notificationsApi.ts` — new file
RTK Query slice hitting the notification routes:
- `getNotifications({ unread?, limit? })` → `GET /api/notifications`
- `markRead(id)` → `PUT /api/notifications/:id/read` (invalidates `getNotifications`)
- `markAllRead()` → `POST /api/notifications/read-all` (invalidates `getNotifications`)
- Auth header injected via `prepareHeaders` reading `wallpainter_token` from localStorage

---

## Files Modified / Created
| File | Action |
|------|--------|
| `src/lib/fcm.ts` | Create |
| `src/app/api/admin/users/[userId]/approve/route.ts` | Update |
| `src/app/api/admin/users/[userId]/reject/route.ts` | Update |
| `src/app/api/auth/register/route.ts` | Update |
| `src/app/api/notifications/route.ts` | Implement |
| `src/app/api/notifications/[id]/read/route.ts` | Implement |
| `src/app/api/notifications/read-all/route.ts` | Implement |
| `src/store/index.ts` | Create |
| `src/store/api/notificationsApi.ts` | Create |

---

## Verification
1. `npx tsc --noEmit` — no errors
2. Register a new owner → check MongoDB `notifications` collection has one doc per admin
3. Approve an owner via admin dashboard → FCM fires via `sendFcmToUser`, no inline token map in route
4. `GET /api/notifications` with a valid Bearer token returns `{ notifications: [...], unreadCount: N }`
5. `PUT /api/notifications/:id/read` flips `read: true` for the correct doc
6. `POST /api/notifications/read-all` sets all docs for that user to `read: true`
