# Wall Painter — API Specification
**Base:** `/api` · **Version:** v1

---

## Authentication
`/api/auth`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Issue JWT for credentials |
| POST | `/api/auth/logout` | Invalidate session + drop FCM token |
| GET | `/api/auth/me` | Verify token + return profile |
| POST | `/api/auth/refresh` | Rotate JWT before expiry |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Set new password from reset token |

---

## Users & Profile
`/api/users`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/me` | Current user profile |
| PUT | `/api/users/me` | Edit own profile (name, phone) |
| PUT | `/api/users/me/password` | Change own password |
| POST | `/api/users/me/fcm-token` | Register device for push notifications |
| DELETE | `/api/users/me/fcm-token` | Unregister a device |
| GET | `/api/users` | List users (owner sees painters, admin sees all); supports `?role=&q=&page=` |
| GET | `/api/users/:userId` | View a user (admin) or assigned painter (owner) |
| PUT | `/api/users/:userId` | Admin edit any user (role, status, name) |
| DELETE | `/api/users/:userId` | Soft-delete a user (admin only) |

---

## Jobs
`/api/jobs`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/jobs` | List jobs — auto-filtered by role |
| POST | `/api/jobs` | Owner creates a new job |
| GET | `/api/jobs/:jobId` | Job detail — verified painter/owner/admin only |
| PUT | `/api/jobs/:jobId` | Owner edits job (name, dates, description) |
| DELETE | `/api/jobs/:jobId` | Owner deletes a job (cascades to submissions/files) |
| GET | `/api/jobs/:jobId/painters` | List painters on this job + per-painter submission stats |
| POST | `/api/jobs/:jobId/painters` | Add painter to job |
| DELETE | `/api/jobs/:jobId/painters/:painterId` | Remove painter from job |
| GET | `/api/jobs/:jobId/painters/:painterId/submissions` | All submissions by one painter on this job |

---

## Submissions
`/api/jobs/:jobId/submissions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/jobs/:jobId/submissions` | List submissions — painter sees own; owner/admin see all |
| POST | `/api/jobs/:jobId/submissions` | Painter creates a submission — types their own photo no., lists sizes, uploads angles |
| GET | `/api/jobs/:jobId/submissions/:submissionId` | One submission with all photos |
| PUT | `/api/jobs/:jobId/submissions/:submissionId` | Edit submission — painter: when pending/rejected; owner: anytime (rejected→pending) |
| DELETE | `/api/jobs/:jobId/submissions/:submissionId` | Delete submission — painter: when pending/rejected; owner: anytime |
| POST | `/api/jobs/:jobId/submissions/:submissionId/approve` | Owner approves — picks images to keep, queues watermark, locks editing |
| POST | `/api/jobs/:jobId/submissions/:submissionId/reject` | Owner rejects with reason — painter can edit & resubmit anytime |
| POST | `/api/jobs/:jobId/submissions/:submissionId/revoke` | Owner reverts an approved/rejected submission back to pending |
| DELETE | `/api/jobs/:jobId/submissions/:submissionId/photos/:photoId` | Remove a single angle from a submission |

---

## Uploads
`/api/uploads`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/uploads/sign` | Get a signed Cloudinary direct-upload payload (avoids hitting server with bytes) |

---

## File Generation & Downloads
`/api/jobs/:jobId/files`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/jobs/:jobId/files` | List generated files for a job |
| POST | `/api/jobs/:jobId/files/generate` | Trigger generation; `type=excel \| pdf-report \| pdf-photos` |
| GET | `/api/jobs/:jobId/files/generation-status/:taskId` | Poll generation progress |
| GET | `/api/jobs/:jobId/files/:fileId` | File metadata |
| GET | `/api/jobs/:jobId/files/:fileId/download` | Issue R2 signed download URL (24 h) |
| DELETE | `/api/jobs/:jobId/files/:fileId` | Delete a generated file from R2 + DB |

---

## Notifications
`/api/notifications`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notifications` | List own notifications; `?unread=true&limit=20` |
| PUT | `/api/notifications/:id/read` | Mark notification as read |
| POST | `/api/notifications/read-all` | Mark all own notifications as read |
| POST | `/api/notifications/test` | Send a test push to self (admin) |

---

## Admin
`/api/admin`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Dashboard stats — users, jobs, storage, queue depth |
| GET | `/api/admin/logs` | Audit logs with filters |
| GET | `/api/admin/background-jobs` | Inspect queue jobs (watermarking, file gen, email) |
| POST | `/api/admin/background-jobs/:id/retry` | Manually retry a failed background job |
| GET | `/api/admin/storage` | Storage usage across Cloudinary + R2 |
| POST | `/api/admin/users/:userId/suspend` | Suspend a user account |

---

## System
`/api`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Liveness + dependency check |
| GET | `/api/version` | API version + build info |