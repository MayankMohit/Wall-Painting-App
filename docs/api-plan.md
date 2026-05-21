# API Implementation Plan

## Overview

**Steps 0, 1, 9 complete. Step 2 is next.**

Route structure fixed — 41 route files match `docs/06-API-SPECIFICATION.md` exactly. Foundation built and type-checking clean (`npx tsc --noEmit` passes):

| File | Status |
|---|---|
| `src/lib/models/` (7 models + barrel) | ✅ Done |
| `src/lib/auth/index.ts` | ✅ Done |
| `src/lib/validators.ts` (14 schemas) | ✅ Done |
| `src/lib/rbac.ts` | ✅ Done |
| `src/lib/api-response.ts` | ✅ Done |
| `src/proxy.ts` (JWT middleware) | ✅ Done |

> **Note:** Next.js 16 uses `src/proxy.ts` (not `src/middleware.ts`). The exported function must be named `proxy`. Public routes: `/api/auth/*`, `/api/health`, `/api/version`. All others require a valid Bearer JWT verified via `jose`.

## Step 1 — Auth APIs *(Easy)* ✅ Complete

**Target routes:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

**Files:**
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`

| Route | Logic |
|---|---|
| `POST /api/auth/register` | Validate `RegisterSchema` → check email not taken → `hashPassword` → create User → `signToken` → return `{ user, token }` |
| `POST /api/auth/login` | Validate `LoginSchema` → find user by email → `comparePassword` → `signToken` → return `{ user, token }` |
| `POST /api/auth/logout` | `requireAuth` → optionally remove FCM token from body → return 200 |
| `GET /api/auth/me` | `requireAuth` → fetch User from DB (exclude password) → return profile |

---

## Step 2 — Users & Profile *(Easy–Medium)*

**Target routes:**
```
GET    /api/users/me
PUT    /api/users/me
PUT    /api/users/me/password
POST   /api/users/me/fcm-token
DELETE /api/users/me/fcm-token
GET    /api/users               ?role=&q=&page=
GET    /api/users/:userId
PUT    /api/users/:userId        (admin)
DELETE /api/users/:userId        (admin)
```

| Route | Allowed Roles | Notes |
|---|---|---|
| `GET /api/users/me` | any | Exclude password field |
| `PUT /api/users/me` | any | Only name + phone; validate `UpdateProfileSchema` |
| `PUT /api/users/me/password` | any | Verify current password first |
| `POST /api/users/me/fcm-token` | any | Push to `fcmTokens[]`; deduplicate |
| `DELETE /api/users/me/fcm-token` | any | Pull from `fcmTokens[]` |
| `GET /api/users` | owner (painters only), admin (all) | Pagination + `?role=&q=` search on name/email |
| `GET /api/users/:userId` | admin, or owner (only their assigned painters) | |
| `PUT /api/users/:userId` | admin | Can change role, status, name |
| `DELETE /api/users/:userId` | admin | Soft-delete: set `status = 'inactive'` |

---

## Step 3 — Jobs *(Medium)*

**Target routes:**
```
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/:jobId
PUT    /api/jobs/:jobId
DELETE /api/jobs/:jobId
GET    /api/jobs/:jobId/painters
POST   /api/jobs/:jobId/painters
DELETE /api/jobs/:jobId/painters/:painterId
GET    /api/jobs/:jobId/painters/:painterId/submissions
```

**Directory structure:**
```
src/app/api/jobs/
  route.ts                                          — GET, POST
  [jobId]/
    route.ts                                        — GET, PUT, DELETE
    painters/
      route.ts                                      — GET, POST
      [painterId]/
        route.ts                                    — DELETE
        submissions/
          route.ts                                  — GET
```

**Role-filtered listing:**
- Painter → only jobs where `painters[]` contains their userId
- Owner → only jobs where `ownerId` matches
- Admin → all jobs

| Route | Notes |
|---|---|
| `DELETE /api/jobs/:jobId` | Cascade: delete all Submissions, Photos, GeneratedFiles for this job |
| `GET /api/jobs/:jobId/painters` | Return painter profiles + submission count per painter for this job |
| `POST /api/jobs/:jobId/painters` | Add painterId to `painters[]`; idempotent (no duplicate) |

---

## Step 4 — Uploads: Cloudinary Signed URL *(Medium)*

**Target route:**
```
POST /api/uploads/sign
```

**File:** `src/app/api/uploads/sign/route.ts`

- `requireAuth` → generate Cloudinary signed upload params using `cloudinary.v2.utils.api_sign_request` with `CLOUDINARY_API_SECRET`
- Return `{ signature, timestamp, cloudName, apiKey, uploadPreset }`
- Client uploads directly to Cloudinary; the resulting `cloudinaryId` + `cloudinaryUrl` are passed back to the server when creating a submission

---

## Step 5 — Submissions *(Medium–Hard)*

**Target routes:**
```
GET    /api/jobs/:jobId/submissions
POST   /api/jobs/:jobId/submissions
GET    /api/jobs/:jobId/submissions/:submissionId
PUT    /api/jobs/:jobId/submissions/:submissionId
DELETE /api/jobs/:jobId/submissions/:submissionId
POST   /api/jobs/:jobId/submissions/:submissionId/approve
POST   /api/jobs/:jobId/submissions/:submissionId/reject
POST   /api/jobs/:jobId/submissions/:submissionId/revoke
DELETE /api/jobs/:jobId/submissions/:submissionId/photos/:photoId
```

**State machine:**
```
pending ──approve──▶ approved
pending ──reject──▶  rejected
rejected ──revoke──▶ pending   (owner can reset so painter can re-edit)
approved ──revoke──▶ pending
rejected → (painter edits) → back to pending on save
```

**Editing rules:**
- Painter can edit/delete only when `status = 'pending' | 'rejected'`
- Owner can edit/delete anytime
- Approval locks the submission (painter cannot edit an `approved` submission)

| Route | Logic |
|---|---|
| `POST /api/jobs/:jobId/submissions` | Painter must be in `job.painters[]`; create Photo docs from Cloudinary IDs; create Submission; push to `job.submissions[]` |
| `POST .../approve` | Validate `selectedImageIds`; set `status=approved`, `approvedAt`; create BackgroundJob for watermarking; queue Bull job |
| `POST .../reject` | Set `status=rejected`, `rejectedAt`, `rejectionReason` |
| `POST .../revoke` | Set `status=pending`, `revokedAt`, `revokeNote` |
| `DELETE .../photos/:photoId` | Delete Photo doc; `$pull` from `submission.images[]` |

---

## Step 6 — Notifications *(Medium)*

**Target routes:**
```
GET    /api/notifications          ?unread=true&limit=20
PUT    /api/notifications/:id/read
POST   /api/notifications/read-all
POST   /api/notifications/test     (admin only)
```

**Files:**
```
src/app/api/notifications/
  route.ts                        — GET
  [id]/
    read/
      route.ts                    — PUT
  read-all/
    route.ts                      — POST
  test/
    route.ts                      — POST
```

- All routes scoped to `req.user.userId` (own notifications only)
- `POST /notifications/test`: admin only; sends FCM push via Firebase Admin SDK to own `fcmTokens[]`

---

## Step 7 — File Generation & Downloads *(Hard)*

**Target routes:**
```
GET    /api/jobs/:jobId/files
POST   /api/jobs/:jobId/files/generate
GET    /api/jobs/:jobId/files/generation-status/:taskId
GET    /api/jobs/:jobId/files/:fileId
GET    /api/jobs/:jobId/files/:fileId/download
DELETE /api/jobs/:jobId/files/:fileId
```

**New utility files needed:**
- `src/lib/r2.ts` — R2 client (AWS S3 SDK with R2 endpoint): `uploadFile()`, `deleteFile()`, `getPresignedUrl(key, expiresIn=86400)`
- `src/lib/queue.ts` — Bull queue setup + worker registration
- `src/lib/generators/excel.ts` — ExcelJS workbook builder from approved submissions
- `src/lib/generators/pdf-report.ts` — PDFKit report from approved submissions
- `src/lib/generators/pdf-photos.ts` — PDFKit photo compilation (fetch watermarked images → embed in PDF)

**Flow:**
1. Owner calls `POST /api/jobs/:jobId/files/generate` with `{ type }`
2. Route creates a `BackgroundJob` doc + enqueues Bull job → returns `{ taskId }`
3. Bull worker runs generator, uploads result to R2, creates `GeneratedFile` doc, sets `BackgroundJob.status = 'completed'`
4. Owner polls `GET .../generation-status/:taskId` until `status = 'completed'`
5. Owner calls `GET .../files/:fileId/download` → get 24h presigned R2 URL

| Route | Notes |
|---|---|
| `GET .../files` | List GeneratedFile docs for this job; owner/admin only |
| `GET .../files/:fileId/download` | Generate presigned URL; increment `downloadCount` |
| `DELETE .../files/:fileId` | Delete from R2 first, then DB |

---

## Step 8 — Admin *(Medium–Hard)*

**Target routes:**
```
GET    /api/admin/stats
GET    /api/admin/logs
GET    /api/admin/background-jobs
POST   /api/admin/background-jobs/:id/retry
GET    /api/admin/storage
POST   /api/admin/users/:userId/suspend
```

**Directory:**
```
src/app/api/admin/
  stats/route.ts
  logs/route.ts
  background-jobs/
    route.ts
    [id]/
      retry/route.ts
  storage/route.ts
  users/
    [userId]/
      suspend/route.ts
```

| Route | Logic |
|---|---|
| `GET /api/admin/stats` | Aggregate: user counts by role, job counts by status, Bull queue depth, total R2 storage |
| `GET /api/admin/logs` | BackgroundJob collection with filters + pagination |
| `POST .../retry` | Re-enqueue failed BackgroundJob via Bull |
| `GET /api/admin/storage` | Cloudinary usage API + sum of `GeneratedFile.fileSize` from DB |
| `POST .../suspend` | Set `user.status = 'suspended'` |

---

## Step 9 — Auth Extras *(Medium)* ✅ Complete

**Target routes:**
```
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

| Route | Logic |
|---|---|
| `POST /api/auth/refresh` | Verify current JWT (even near-expiry), issue fresh 7d token |
| `POST /api/auth/forgot-password` | Find user by email → generate reset token (store hash in DB or Redis with 1h TTL) → send email via Resend |
| `POST /api/auth/reset-password` | Validate reset token → update password hash → invalidate token |

---

## Summary: Implementation Order

| Step | Area | Difficulty | Routes | Status |
|---|---|---|---|---|
| 0 | Foundation (models, auth, validators, rbac, response helpers, proxy) | — | — | ✅ Done |
| 1 | Auth: register / login / logout / me | Easy | 4 | ✅ Done |
| 2 | Users & Profile | Easy–Medium | 9 | ← Next |
| 3 | Jobs | Medium | 9 | |
| 4 | Uploads (Cloudinary sign) | Medium | 1 | |
| 5 | Submissions | Medium–Hard | 9 | |
| 6 | Notifications | Medium | 4 | |
| 7 | File Generation & Downloads | Hard | 6 | |
| 8 | Admin | Medium–Hard | 6 | |
| 9 | Auth Extras (refresh, forgot/reset password) | Medium | 3 | ✅ Done |

**Total: 51 routes**

---

## Verification Checklist (Per Step)

1. `npx tsc --noEmit` — zero type errors
2. `npm run dev` — server starts without errors
3. Hit endpoints with curl / Thunder Client / Postman
4. Golden path: Register → Login → get token → use token on every protected route
5. Business flow: Create job → assign painter → painter submits → owner approves → generate file → download
6. Check MongoDB Atlas for correct document shapes
7. Check Cloudinary dashboard for uploaded images
8. Check R2 for generated files after Step 7
