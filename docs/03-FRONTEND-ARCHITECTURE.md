# Frontend Architecture

---

## Project Root Structure (CORRECT)

```
wall-painting-app/                   ← Project root
│
├── src/                              ← Source code folder
│   ├── app/                          ← ONLY pages, layouts, API routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   ├── (painter)/
│   │   ├── (owner)/
│   │   ├── (admin)/
│   │   └── api/
│   │
│   ├── components/                   ← Reusable UI components (OUTSIDE app/)
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── common/
│   │   ├── dashboards/
│   │   └── photos/
│   │
│   ├── hooks/                        ← Custom React hooks (OUTSIDE app/)
│   │   ├── useAuth.ts
│   │   ├── useAppDispatch.ts
│   │   ├── useJob.ts
│   │   └── useFCM.ts
│   │
│   ├── store/                        ← State management (OUTSIDE app/)
│   │   ├── authStore.ts             # Zustand
│   │   ├── index.ts                 # RTK setup
│   │   ├── slices/
│   │   └── api/                     # RTK Query
│   │
│   ├── lib/                          ← Utilities & configs (OUTSIDE app/)
│   │   ├── auth.ts
│   │   ├── firebase-fcm.ts
│   │   ├── cloudinary.ts
│   │   ├── validators.ts
│   │   ├── rbac.ts
│   │   └── utils.ts
│   │
│   ├── types/                        ← TypeScript types (OUTSIDE app/)
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── job.ts
│   │   ├── submission.ts
│   │   ├── file.ts
│   │   ├── company.ts
│   │   ├── image.ts
│   │   └── notification.ts
│   │
│   └── middleware.ts                 ← Auth middleware (ROOT of src/)
│
├── public/                           ← Static assets (ROOT level, OUTSIDE src/)
│   ├── firebase-messaging-sw.js
│   ├── icon.png
│   ├── badge.png
│   └── favicon.ico
│
├── node_modules/                     ← Dependencies
├── .env.local                        ← Environment variables (git ignored)
├── .gitignore                        ← Git ignore rules
├── next.config.ts                    ← Next.js configuration
├── tsconfig.json                     ← TypeScript configuration
├── globals.css                       ← Tailwind CSS v4 (no config file needed)
├── package.json                      ← Dependencies & scripts
├── package-lock.json                 ← Locked versions
└── README.md                         ← Documentation
```

---

## Inside src/app/ - PAGES ONLY
```
├── layout.tsx                          # Root with providers
├── page.tsx                            # Landing page
│
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx
│
├── (painter)/                          # Painter role
│   ├── dashboard/page.tsx
│   ├── submit-form/page.tsx
│   ├── my-submissions/page.tsx
│   ├── my-submissions/[id]/page.tsx
│   └── layout.tsx
│
├── (owner)/                            # Owner/Contractor role
│   ├── dashboard/page.tsx
│   ├── jobs/page.tsx
│   ├── jobs/[id]/page.tsx
│   ├── submissions/page.tsx
│   ├── submissions/[id]/page.tsx
│   ├── generate-files/page.tsx
│   ├── files/page.tsx
│   ├── photos/[jobId]/page.tsx         # View & download photos
│   ├── companies/page.tsx
│   └── layout.tsx
│
├── (admin)/                            # Admin role
│   ├── dashboard/page.tsx
│   ├── users/page.tsx
│   ├── system-jobs/page.tsx
│   └── layout.tsx
│
├── api/
│   ├── auth/
│   │   ├── register/route.ts
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── verify/route.ts
│   │
│   ├── submissions/
│   │   ├── route.ts                   # POST create, GET list
│   │   ├── [id]/route.ts             # GET, PUT edit, DELETE
│   │   └── [id]/images/route.ts      # GET images
│   │
│   ├── jobs/
│   │   ├── route.ts                  # POST create, GET list
│   │   ├── [id]/route.ts             # GET, PUT update
│   │   ├── [id]/submissions/route.ts
│   │   └── [id]/statistics/route.ts
│   │
│   ├── generate/
│   │   ├── excel/route.ts            # POST trigger Excel
│   │   ├── photos-pdf/route.ts       # POST trigger photos PDF
│   │   ├── status/route.ts           # GET job status
│   │   └── [jobId]/files/route.ts    # GET generated files
│   │
│   ├── files/
│   │   ├── route.ts                  # GET list
│   │   ├── [id]/route.ts             # GET details, DELETE
│   │   └── [id]/download/route.ts    # GET signed download URL
│   │
│   ├── photos/
│   │   ├── [jobId]/route.ts          # GET all photos
│   │   ├── [jobId]/download-pdf/route.ts # GET PDF with watermarked photos
│   │   └── sign/route.ts             # Cloudinary signature
│   │
│   ├── companies/
│   │   ├── route.ts                  # POST create, GET list
│   │   └── [id]/route.ts             # GET, PUT update, DELETE
│   │
│   ├── owner/
│   │   ├── submissions/[id]/route.ts # PUT edit, DELETE
│   │   ├── submissions/[id]/approve/route.ts
│   │   └── submissions/[id]/reject/route.ts
│   │
│   ├── notifications/
│   │   ├── fcm-token/route.ts        # POST register FCM token
│   │   └── send-test/route.ts        # POST send test notification
│   │
│   ├── analytics/
│   │   ├── dashboard/route.ts
│   │   ├── jobs/route.ts
│   │   └── painters/route.ts
│   │
│   └── health/route.ts
```

---

## Why This Structure?

| Folder | Location | Purpose | Import |
|--------|----------|---------|--------|
| **app/** | `src/app/` | Pages, layouts, API routes | Not imported, accessed by URL |
| **components/** | `src/components/` | Reusable UI components | `import from '@/components'` |
| **hooks/** | `src/hooks/` | Custom React hooks | `import from '@/hooks'` |
| **lib/** | `src/lib/` | Services, utilities, configs | `import from '@/lib'` |
| **types/** | `src/types/` | TypeScript definitions | `import type from '@/types'` |
| **store/** | `src/store/` | Zustand + RTK state | `import from '@/store'` |
| **public/** | `public/` (root) | Static files | Accessed via `/filename` |

---

## State Management

```typescript
// store/authStore.ts - Zustand (Auth)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,

      login: async (email, password) => { /* ... */ },
      logout: () => { /* ... */ },
      setUser: (user) => set({ user, role: user.role }),
      setToken: (token) => set({ token })
    }),
    { name: 'auth-store' }
  )
);

// store/index.ts - RTK (Application State)
export const store = configureStore({
  reducer: {
    jobs: jobsReducer,
    submissions: submissionsReducer,
    files: filesReducer,
    notifications: notificationsReducer,
    [submissionsApi.reducerPath]: submissionsApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(submissionsApi.middleware)
});
```

---

## Import Guide (Path Aliases)

All imports use `@/` prefix (defined in `tsconfig.json`):

```typescript
// ✅ Import components (from src/components/)
import { Button } from '@/components/ui/button';
import { PainterSubmissionForm } from '@/components/forms/PainterSubmissionForm';

// ✅ Import hooks (from src/hooks/)
import { useAuth } from '@/hooks/useAuth';
import { useJob } from '@/hooks/useJob';

// ✅ Import utilities (from src/lib/)
import { authService } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

// ✅ Import types (from src/types/)
import type { User, Job, Submission } from '@/types';

// ✅ Import state management (from src/store/)
import { useAuthStore } from '@/store/authStore';
import { useAppDispatch } from '@/hooks/useAppDispatch';

// ✅ Import from public folder (no src/ prefix)
import swUrl from '/firebase-messaging-sw.js';
```

**Never do this:**
```typescript
// ❌ Relative imports
import { Button } from '../../../components/ui/button';

// ❌ Absolute imports without @/
import { Button } from 'src/components/ui/button';

// ❌ Direct src/ prefix
import { Button } from '@/src/components/button';
```

---

## Quick Reference: File Organization

### Files that go in `src/app/`
```
✅ page.tsx          - Route page component
✅ layout.tsx        - Route layout wrapper
✅ error.tsx         - Error boundary
✅ loading.tsx       - Loading skeleton
✅ not-found.tsx     - 404 page
✅ route.ts          - API endpoint
```

### Files that go in `src/components/`
```
✅ Button.tsx        - UI button component
✅ Card.tsx          - UI card component
✅ Form.tsx          - Form component
✅ Navbar.tsx        - Navigation bar
✅ Dashboard.tsx     - Dashboard layout
```

### Files that go in `src/lib/`
```
✅ auth.ts           - Authentication logic
✅ validators.ts     - Zod validation schemas
✅ rbac.ts           - Role-based access control
✅ utils.ts          - Utility functions
✅ firebase-fcm.ts   - Firebase setup
✅ cloudinary.ts     - Cloudinary config
```

### Files that go in `src/hooks/`
```
✅ useAuth.ts        - Auth custom hook
✅ useJob.ts         - Job data hook
✅ useFCM.ts         - Firebase notification hook
✅ useAppDispatch.ts - Redux dispatch hook
```

### Files that go in `src/store/`
```
✅ authStore.ts      - Zustand auth store
✅ index.ts          - RTK store configuration
✅ slices/jobsSlice.ts      - Job reducer
✅ api/jobsApi.ts    - RTK Query API
```

### Files that go in `src/types/`
```
✅ index.ts          - Type exports
✅ auth.ts           - Auth types
✅ job.ts            - Job types
✅ submission.ts     - Submission types
```

### Files that go in `public/`
```
✅ firebase-messaging-sw.js  - Service Worker
✅ icon.png          - App icon
✅ favicon.ico       - Browser tab icon
✅ images/           - Static images
```
