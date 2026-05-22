# Frontend Architecture

The frontend is a single Next.js 16 App Router codebase serving three role-aware shells (painter, owner, admin) from one bundle. State is split: **Zustand** holds auth + transient UI, **Redux Toolkit + RTK Query** holds server state with tag-based cache invalidation, and **React Hook Form + Zod** holds form state. Real-time updates ride **SSE + FCM**.

This document is the contract between the UI and the backend in `04-BACKEND-ARCHITECTURE.md` / `06-API-SPECIFICATION.md`. Every backend domain (auth, jobs, submissions, files, notifications, admin) maps 1:1 to an RTK Query slice with the same name.

---

## Top-level src/ layout

```
src/
├── app/                              # PAGES + API only. No business logic here.
│   ├── (auth)/                       # public pages — login, register, forgot, reset
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/[token]/page.tsx
│   │
│   ├── (painter)/                    # painter shell — uses PainterLayout
│   │   ├── layout.tsx                # requires role=painter, mounts PainterShell
│   │   ├── dashboard/page.tsx        # job list (assigned)
│   │   ├── jobs/[jobId]/
│   │   │   ├── page.tsx              # job detail (my submissions)
│   │   │   ├── new/page.tsx          # new submission form
│   │   │   └── submissions/[id]/page.tsx
│   │   └── profile/page.tsx
│   │
│   ├── (owner)/                      # owner shell
│   │   ├── layout.tsx                # requires role=owner
│   │   ├── dashboard/page.tsx        # jobs grid with stats
│   │   ├── jobs/
│   │   │   ├── page.tsx              # all my jobs
│   │   │   ├── new/page.tsx          # create job (pick painters)
│   │   │   └── [jobId]/
│   │   │       ├── page.tsx          # overview (painters, counts)
│   │   │       ├── painters/page.tsx
│   │   │       ├── painters/[pid]/page.tsx        # painter's submissions
│   │   │       ├── submissions/page.tsx           # all submissions, filter chips
│   │   │       ├── submissions/[id]/page.tsx      # approve/reject UI
│   │   │       ├── files/page.tsx                 # generated files, generate button
                ├── page.tsx  
                └── layout.tsx               
│   │   └── profile/page.tsx
│   │
│   ├── admin/                      # admin shell
│   │   ├── layout.tsx                # requires role=admin
│   │   ├── dashboard/page.tsx        # stats widgets, storage, queue depth
│   │   ├── users/
│   │   │   ├── page.tsx              # list with role filter
│   │   │   └── [userId]/page.tsx     # edit + suspend
│   │   ├── jobs/page.tsx             # all jobs (read-only)
│   │   ├── logs/page.tsx             # audit log search
│   │   ├── background-jobs/page.tsx  # queue inspector + retry
│   │   ├── storage/page.tsx          # Cloudinary + R2 + Mongo usage
│   │   └── profile/page.tsx          
│   │
│   ├── api/                          # ALL backend endpoints live here (see 06-API-SPEC)
│   │   ├── auth/…
│   │   ├── users/…
│   │   ├── jobs/…
│   │   ├── notifications/…
│   │   ├── uploads/sign/route.ts
│   │   ├── admin/…
│   │   ├── health/route.ts
│   │   └── version/route.ts
│   │
│   ├── layout.tsx                    # root: <Providers> wrapping everything
│   ├── page.tsx                      # marketing landing or role-aware redirect
│   ├── error.tsx                     # root error boundary
│   ├── not-found.tsx
│   └── globals.css                   # Tailwind v4 @import + design tokens
│
├── components/
│   ├── ui/                           # shadcn primitives — button, input, dialog, …
│   ├── common/                       # CrossCutting: Toaster, Spinner, ErrorBoundary, EmptyState
│   ├── layout/                       # PainterShell, OwnerShell, AdminShell, TopBar, SideNav, MobileNav
│   ├── forms/                        # composed form blocks (SizeListInput, PhotoUploader, JobForm)
│   ├── dashboards/                   # role-specific dashboard cards (StatCard, RecentSubmissionsList)
│   ├── photos/                       # PhotoGrid, PhotoCarousel, AnglePicker, WatermarkPreview
│   ├── submissions/                  # SubmissionCard, SubmissionStatusBadge, ApproveDialog, RejectDialog
│   ├── notifications/                # BellMenu, NotificationItem, NotificationToast
│   ├── files/                        # FileCard, GenerateButton, GenerateDialog, GenerationProgress
│   └── admin/                        # AuditLogTable, QueueDepthChart, StorageBars
│
├── hooks/
│   ├── useAuth.ts                    # Zustand selector + helpers
│   ├── useAppDispatch.ts             # typed dispatch
│   ├── useAppSelector.ts             # typed selector
│   ├── useJob.ts                     # job + cached painter list + counts
│   ├── useSubmission.ts
│   ├── useFCM.ts                     # request permission, register token, listen for foreground msgs
│   ├── useNotificationStream.ts      # SSE subscription
│   ├── usePollFileGeneration.ts      # polls /generation-status/:taskId
│   ├── useCloudinaryUpload.ts        # signed direct upload + progress
│   ├── useRoleGuard.ts               # client-side redirect for wrong role
│   └── useDebouncedValue.ts
│
├── store/
│   ├── index.ts                      # configureStore + setupListeners
│   ├── authStore.ts                  # Zustand (persisted)
│   ├── uiStore.ts                    # Zustand (transient: sidebar, theme, toasts)
│   ├── api/
│   │   ├── baseApi.ts                # createApi w/ baseQueryWithReauth
│   │   ├── authApi.ts                # 7 endpoints
│   │   ├── usersApi.ts
│   │   ├── jobsApi.ts
│   │   ├── submissionsApi.ts
│   │   ├── filesApi.ts
│   │   ├── uploadsApi.ts             # POST /uploads/sign
│   │   ├── notificationsApi.ts
│   │   └── adminApi.ts
│   └── slices/                       # non-RTK-Query slices (rare)
│       └── uiSlice.ts                # only if Zustand isn't enough
│
├── lib/                              # shared with backend — see 04-BACKEND-ARCHITECTURE.md
│   ├── validators/                   # SAME Zod schemas server uses
│   ├── firebase-client.ts            # client Firebase init + getToken()
│   └── …
│
├── types/
│   ├── auth.ts
│   ├── job.ts
│   ├── submission.ts
│   ├── photo.ts
│   ├── file.ts
│   ├── notification.ts
│   └── api.ts                        # ErrorEnvelope, Paginated<T>, ApiResponse<T>
│
├── middleware.ts                     # Next.js middleware — JWT presence check on protected paths
└── instrumentation.ts                # Sentry + Pino init
```

