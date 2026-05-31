# API Implementation Plan

## Overview

> **Note:** Next.js 16 uses `src/proxy.ts` (not `src/middleware.ts`). The exported function must be named `proxy`. Public routes: `/api/auth/*`, `/api/health`, `/api/version`. All others require a valid Bearer JWT verified via `jose`.

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


## Summary: Implementation Order

| Step | Area | Difficulty | Routes | Status |
|---|---|---|---|---|
| 1 | Auth | Medium | 6 | ✅ |
| 2 | Users  | Easy–Medium | 9 | ✅ |
| 3 | Jobs | Medium | 9 | ✅ |
| 4 | Uploads  | Medium | 1 | ✅ |
| 5 | Submissions | Medium–Hard | 9 | 🔴 |
| 6 | Notifications | Medium | 4 | 🔴 |
| 7 | File Generation & Downloads | Hard | 6 | 🔴 |
| 8 | Admin | Medium–Hard | 6 | 🔴 |

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
