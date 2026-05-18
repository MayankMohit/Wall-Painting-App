# Wall Painting Contractor App - System Architecture V3

**Version:** 3.1 (Updated)  
**Last Updated:** May 2026  
**Status:** Production Ready ✅  
**Tech Stack:** Next.js 14+, TypeScript, MongoDB, Zustand, RTK, Cloudinary, Cloudflare R2, Resend, Firebase Cloud Messaging, Vercel

**Latest Technology Versions (May 2026):**
- Next.js 14.x+ (with App Router & Turbopack)
- React 18.x+ (Concurrent features)
- TypeScript 5.x+ (Strict mode)
- Tailwind CSS v4+ (No config file needed)
- MongoDB Atlas (Latest)
- Firebase v11+ (Modular SDK)
- Node.js 18+ LTS recommended

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Decision](#architecture-decision)
3. [Tech Stack Summary](#tech-stack-summary)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [Complete API Specification](#complete-api-specification)
9. [File Generation Pipeline](#file-generation-pipeline)
10. [Notifications System](#notifications-system)
11. [File Storage Strategy](#file-storage-strategy)
12. [Scalability Design](#scalability-design)
13. [Caching Strategies](#caching-strategies)
14. [Deployment Architecture](#deployment-architecture)
15. [Security Best Practices](#security-best-practices)
16. [Implementation Roadmap](#implementation-roadmap)

---

## System Overview

### Single Application Architecture

A unified Next.js application with role-based routing and dynamic dashboards. All users (painters, owners, admins) login to the same app but see different interfaces based on their role.

```
User Login
    ↓
Zustand Auth Store
    ↓
Check Role (painter/owner/admin)
    ↓
Route to role-based dashboard
```

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   USER INTERFACE LAYER                        │
│            Single Next.js App with Role-Based Routes          │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐        ┌──────────┐
    │ Zustand │         │ RTK     │        │RTK Query │
    │ Auth    │         │ Store   │        │(Caching) │
    └─────────┘         └─────────┘        └──────────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
        ┌───────────────────▼───────────────────┐
        │   Next.js API Routes + Services       │
        │   - Job Management                    │
        │   - Submission Handling               │
        │   - File Generation (Excel, PDF)      │
        │   - Watermarking                      │
        │   - Notifications (FCM + Email)       │
        └───────────────────┬───────────────────┘
                            │
        ┌───────────────────┼───────────────────┬────────────────┐
        ▼                   ▼                   ▼                ▼
    ┌─────────┐         ┌─────────┐      ┌──────────┐     ┌─────────┐
    │MongoDB  │         │Cloudinary│     │Cloudflare│     │Upstash  │
    │Atlas    │         │(Images)  │     │R2 (Files)│     │Redis    │
    │Database │         │Watermark │     │PDFs/Excel│     │Cache    │
    └─────────┘         └─────────┘      └──────────┘     └─────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
            ┌──────────┐            ┌────────┐
            │ Resend   │            │Firebase│
            │Email     │            │FCM     │
            │Service   │            │Push    │
            └──────────┘            └────────┘
```

---

## Architecture Decision

### Why Single App vs Multiple Apps?

| Aspect | Single App | Multiple Apps |
|--------|-----------|---------------|
| **Codebase** | One repo | Multiple repos |
| **Maintenance** | Easier | Complex |
| **Shared Components** | Built-in | Need sync |
| **Authentication** | Centralized | Duplicated |
| **Deployment** | 1 server | Multiple servers |
| **User Experience** | Seamless | Context switching |
| **Recommended** | ✅ | ❌ |

**Decision: Single Next.js App** with role-based routing groups

---

## Tech Stack Summary

| Layer | Technology | Purpose | Cost |
|-------|-----------|---------|------|
| **Frontend** | Next.js 14+ | Full-stack framework | Free |
| **Language** | TypeScript | Type safety | Free |
| **Styling** | Tailwind CSS | Utility CSS | Free |
| **UI Components** | Shadcn/ui | Pre-built components | Free |
| **Auth State** | Zustand | Auth context | Free |
| **Global State** | Redux Toolkit | App state | Free |
| **API Caching** | RTK Query | Auto caching | Free |
| **Forms** | React Hook Form + Zod | Form handling | Free |
| **Database** | MongoDB Atlas | NoSQL DB | Free (5GB) |
| **Images** | Cloudinary | CDN + watermark | Free (25GB/mo) |
| **File Storage** | Cloudflare R2 | Object storage | Free (5GB) forever |
| **Queue** | Bull + Redis | Background jobs | Free (Upstash) |
| **Caching** | Redis (Upstash) | Query cache | Free (10K/day) |
| **Email** | Resend | Transactional email | Free (100/day) |
| **Push Notifications** | Firebase Cloud Messaging | Web push | Free (unlimited) |
| **Hosting** | Vercel | Next.js deployment | Free (100GB/mo) |

---

## Quick Setup Guide

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Cloudflare R2 account (free tier)
- Firebase project (free tier)
- Resend account (free tier)

### Project Initialization (Already Done ✅)

```bash
# Create Next.js project with src/app structure
npx create-next-app@latest wall-painting-app \
  --typescript \
  --tailwind \
  --src-dir \
  --app \
  --no-eslint \
  --no-git

cd wall-painting-app

# Install core dependencies
npm install zustand
npm install @reduxjs/toolkit react-redux
npm install @reduxjs/toolkit/query
npm install react-hook-form zod
npm install axios
npm install bcryptjs jsonwebtoken

# Install image/file libraries
npm install jimp exceljs pdfkit
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Install notification libraries
npm install firebase-admin firebase
npm install resend

# Install database
npm install mongoose

# Install queue
npm install bull redis

# Install utilities
npm install next-cors helmet
npm install dotenv

# Install for development
npm install -D @types/node @types/bcryptjs @types/jsonwebtoken
npm install -D @types/pdfkit @types/jimp
```

### Tailwind CSS v4+ Setup

No config file needed! Tailwind v4 uses sensible defaults. Just update your CSS imports:

```css
/* src/globals.css */
@import "tailwindcss";
```

Customize via CSS when needed:
```css
@import "tailwindcss";

@theme {
  --color-primary: #0050b3;
  --color-secondary: #ff7a45;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

### Environment Setup

Create `.env.local` file in project root:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/wall-painting-db

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Cloudflare R2
CLOUDFLARE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY=your-access-key
CLOUDFLARE_R2_SECRET_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET=wall-painting-files

# Redis (Upstash)
UPSTASH_REDIS_URL=https://default:password@host:port

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email

# Firebase Web
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Resend
RESEND_API_KEY=your-resend-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Frontend Architecture

### Project Root Structure (CORRECT)

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

**KEY POINTS:**
- ✅ `src/app/` = ONLY pages, layouts, and API routes
- ✅ `src/components/`, `src/hooks/`, `src/lib/`, `src/types/` = OUTSIDE `app/`
- ✅ `public/` = ROOT level (next to `src/`), NOT inside src/
- ✅ `src/middleware.ts` = at ROOT of src folder
- ✅ NO duplicate folders - clean, organized structure

---

### Inside src/app/ - PAGES ONLY
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
│
├── components/
│   ├── ui/                           # Shadcn components
│   ├── forms/
│   │   ├── PainterSubmissionForm.tsx
│   │   ├── JobForm.tsx
│   │   ├── CompanyForm.tsx
│   │   └── ImageUploadField.tsx
│   │
│   ├── common/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   │
│   ├── dashboards/
│   │   ├── PainterDashboard.tsx
│   │   ├── OwnerDashboard.tsx
│   │   └── AdminDashboard.tsx
│   │
│   └── photos/
│       ├── PhotosList.tsx
│       ├── PhotoViewer.tsx
│       └── DownloadPhotoPDF.tsx
│
├── hooks/
│   ├── useAuth.ts                    # Zustand auth
│   ├── useAppDispatch.ts
│   ├── useAppSelector.ts
│   ├── useFCM.ts                     # FCM registration
│   ├── useNotifications.ts
│   ├── useJob.ts
│   └── useSubmission.ts
│
├── store/
│   ├── authStore.ts                  # Zustand
│   ├── index.ts                      # RTK setup
│   ├── slices/
│   │   ├── jobsSlice.ts
│   │   ├── submissionsSlice.ts
│   │   ├── filesSlice.ts
│   │   └── notificationsSlice.ts
│   │
│   └── api/
│       ├── submissionsApi.ts         # RTK Query
│       ├── jobsApi.ts
│       └── filesApi.ts
│
├── lib/
│   ├── cloudinary.ts
│   ├── firebase-fcm.ts               # Firebase FCM setup
│   ├── validators.ts
│   └── utils.ts
│
├── types/
│   ├── index.ts
│   ├── job.ts
│   ├── submission.ts
│   ├── file.ts
│   └── notification.ts
│
├── public/
│   ├── firebase-messaging-sw.js      # Service Worker for FCM
│   ├── icon.png                      # App icon
│   └── badge.png                     # Notification badge
│
└── middleware.ts                      # Auth middleware

src/lib/
├── auth.ts                           # NextAuth config (if using)
├── firebase-fcm.ts                   # Firebase FCM setup
├── cloudinary.ts                     # Cloudinary SDK
├── validators.ts                     # Zod schemas
├── rbac.ts                           # Role-based access control
└── utils.ts                          # Helper functions

src/types/
├── index.ts
├── auth.ts
├── job.ts
├── submission.ts
├── file.ts
├── company.ts
├── image.ts
└── notification.ts
```

#---

## Folder Structure Clarification

### ❌ WRONG - Don't Do This
```
src/
├── app/
│   ├── components/          ❌ WRONG - components in app/
│   ├── hooks/               ❌ WRONG - hooks in app/
│   ├── lib/                 ❌ WRONG - lib in app/
│   ├── types/               ❌ WRONG - types in app/
│   └── store/               ❌ WRONG - store in app/
```

### ✅ CORRECT - Do This
```
src/
├── app/                      ✅ ONLY pages, layouts, API routes
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   ├── (painter)/
│   └── api/
│
├── components/               ✅ OUTSIDE app/ (shared components)
├── hooks/                    ✅ OUTSIDE app/ (custom hooks)
├── lib/                      ✅ OUTSIDE app/ (utilities & services)
├── types/                    ✅ OUTSIDE app/ (TypeScript types)
├── store/                    ✅ OUTSIDE app/ (state management)
└── middleware.ts             ✅ ROOT of src/
```

### Why This Structure?

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

## Backend Architecture

### Core Services

#### 1. Authentication Service
```typescript
// services/authService.ts
export const authService = {
  async register(email: string, password: string, role: UserRole) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await User.create({
      email,
      password: hashedPassword,
      role,
      status: 'active'
    });
  },

  async login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('Invalid credentials');

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return { token, user };
  }
};
```

#### 2. Submission Service
```typescript
// services/submissionService.ts
export const submissionService = {
  async createSubmission(painterId: string, jobId: string, data: SubmissionData) {
    // Generate unique number for watermarking
    const generatedNumber = await this.generateUniqueNumber();

    const submission = await Submission.create({
      painterId,
      jobId,
      generatedNumber,
      location: data.location,
      paintingSize: data.paintingSize,
      images: data.images,
      status: 'pending',
      submittedAt: new Date(),
      canEditUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    });

    // Queue watermarking job
    await watermarkQueue.add({
      submissionId: submission._id,
      images: data.images,
      generatedNumber
    });

    // Send FCM notification to owner
    await notificationService.notifyOwner(
      jobId,
      'New painting submission received'
    );

    return submission;
  },

  async generateUniqueNumber(): Promise<string> {
    const count = await Submission.countDocuments();
    return `#${(count + 1).toString().padStart(4, '0')}`;
  }
};
```

#### 3. File Generation Service
```typescript
// services/fileGenerationService.ts
export const fileGenerationService = {
  async generateExcel(jobId: string) {
    const submissions = await Submission.find({ jobId });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Paintings');

    // Headers
    worksheet.columns = [
      { header: 'Serial #', key: 'serial', width: 12 },
      { header: 'Photo #', key: 'photoNumber', width: 12 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Size', key: 'size', width: 15 }
    ];

    // Data rows
    submissions.forEach((sub, idx) => {
      worksheet.addRow({
        serial: idx + 1,
        photoNumber: sub.generatedNumber,
        location: sub.location,
        size: sub.paintingSize
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  },

  async generatePhotosPDF(jobId: string) {
    // PDF with all watermarked photos, one per page
    const submissions = await Submission.find({ jobId });
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    for (const submission of submissions) {
      for (const image of submission.images) {
        // Add new page
        doc.addPage();

        // Fetch watermarked image
        const imageBuffer = await fetch(image.watermarkedUrl)
          .then((r) => r.buffer());

        // Embed image
        const pdfImage = await doc.registerFont('temp', imageBuffer);
        doc.image(imageBuffer, 50, 50, { width: 500, height: 400 });

        // Add generated number at bottom
        doc.fontSize(12)
          .text(`Photo #: ${submission.generatedNumber}`, 50, 500);
      }
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }
};
```

#### 4. Watermarking Service (Background Job)
```typescript
// services/watermarkingService.ts
import Jimp from 'jimp';

export const watermarkingService = {
  async watermarkImage(
    cloudinaryUrl: string,
    generatedNumber: string
  ): Promise<string> {
    // Fetch image
    const imageBuffer = await fetch(cloudinaryUrl)
      .then((r) => r.buffer());

    // Load with Jimp
    let image = await Jimp.read(imageBuffer);

    // Create watermark text
    const watermarkText = generatedNumber;
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    // Add text to bottom-right
    image = image.print(
      font,
      image.bitmap.width - 200,
      image.bitmap.height - 60,
      watermarkText
    );

    // Convert to buffer
    const watermarkedBuffer = await image
      .quality(85)
      .getBuffer('image/jpeg');

    // Upload to R2
    return await r2Service.uploadImage(
      watermarkedBuffer,
      `watermarked_${generatedNumber}.jpg`
    );
  }
};
```

#### 5. R2 File Storage Service
```typescript
// services/r2Service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!
});

export const r2Service = {
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: 'pdf' | 'excel' | 'image'
  ): Promise<{ path: string; url: string }> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const filePath = `${year}/${month}/${day}/${fileType}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: filePath,
      Body: fileBuffer,
      ContentType: this.getContentType(fileName)
    });

    await s3Client.send(command);

    // Generate signed URL (valid for 24 hours)
    const getCommand = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: filePath
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 86400
    });

    return { path: filePath, url: signedUrl };
  },

  getContentType(fileName: string): string {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.xlsx'))
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))
      return 'image/jpeg';
    if (fileName.endsWith('.png')) return 'image/png';
    return 'application/octet-stream';
  }
};
```

#### 6. Notification Service
```typescript
// services/notificationService.ts
import { getMessaging } from 'firebase-admin/messaging';
import { Resend } from 'resend';

const messaging = getMessaging();
const resend = new Resend(process.env.RESEND_API_KEY);

export const notificationService = {
  async notifyOwner(
    ownerId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    const owner = await User.findById(ownerId);
    if (!owner?.fcmTokens?.length) return;

    // Send FCM push notification
    const message = {
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon.png',
          badge: '/badge.png',
          click_action: process.env.NEXT_PUBLIC_APP_URL
        }
      }
    };

    for (const token of owner.fcmTokens) {
      try {
        await messaging.send({
          ...message,
          token
        });
      } catch (error) {
        // Remove invalid token
        await User.updateOne(
          { _id: ownerId },
          { $pull: { fcmTokens: token } }
        );
      }
    }
  },

  async sendEmail(to: string, subject: string, html: string) {
    return await resend.emails.send({
      from: 'notifications@wallpainter.app',
      to,
      subject,
      html
    });
  },

  async notifyPainter(
    painterId: string,
    event: 'submission_approved' | 'submission_rejected' | 'new_job'
  ) {
    const painter = await User.findById(painterId);

    const messages: Record<string, { title: string; body: string }> = {
      submission_approved: {
        title: 'Submission Approved ✓',
        body: 'Your painting submission has been approved!'
      },
      submission_rejected: {
        title: 'Submission Rejected',
        body: 'Your painting submission needs revision'
      },
      new_job: {
        title: 'New Job Available',
        body: 'A new job has been assigned to you'
      }
    };

    const msg = messages[event];

    // Send FCM
    await this.notifyOwner(painterId, msg.title, msg.body);

    // Send Email
    await this.sendEmail(
      painter!.email,
      msg.title,
      `<p>${msg.body}</p>`
    );
  }
};
```

---

## Database Schema

### MongoDB Collections

#### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: 'painter' | 'owner' | 'admin',
  name: String,
  phone: String,
  companyId: ObjectId (optional, for painters),
  fcmTokens: [String],
  profileImage: String (optional, Cloudinary URL),
  status: 'active' | 'inactive' | 'suspended',
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Jobs Collection
```javascript
{
  _id: ObjectId,
  jobNumber: String (unique),
  companyId: ObjectId,
  clientId: ObjectId,
  ownerId: ObjectId,
  jobName: String,
  location: String,
  description: String,
  status: 'draft' | 'active' | 'completed' | 'invoiced',
  startDate: Date,
  endDate: Date,
  budget: Number,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.jobs.createIndex({ jobNumber: 1 }, { unique: true });
db.jobs.createIndex({ companyId: 1, status: 1 });
db.jobs.createIndex({ ownerId: 1 });
```

#### 3. Submissions Collection
```javascript
{
  _id: ObjectId,
  painterId: ObjectId,
  jobId: ObjectId,
  generatedNumber: String (unique), // #0001, #0002, etc.
  location: String,
  paintingSize: String,
  images: [{
    cloudinaryId: String,
    cloudinaryUrl: String,
    watermarkedUrl: String,
    uploadedAt: Date
  }],
  status: 'pending' | 'approved' | 'rejected' | 'archived',
  submittedAt: Date,
  canEditUntil: Date,
  approvedAt: Date,
  approvedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.submissions.createIndex({ painterId: 1, jobId: 1 });
db.submissions.createIndex({ jobId: 1, status: 1 });
db.submissions.createIndex({ generatedNumber: 1 }, { unique: true });
```

#### 4. GeneratedFiles Collection
```javascript
{
  _id: ObjectId,
  jobId: ObjectId,
  fileType: 'excel' | 'pdf_photos',
  fileName: String,
  r2Path: String,
  r2Url: String,
  fileSize: Number,
  status: 'generating' | 'ready' | 'archived',
  generatedBy: ObjectId,
  generatedAt: Date,
  expiresAt: Date,
  downloadCount: Number,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.generatedFiles.createIndex({ jobId: 1, fileType: 1 });
db.generatedFiles.createIndex({ generatedAt: -1 });
db.generatedFiles.createIndex({ expiresAt: 1 });
```

#### 5. BackgroundJobs Collection
```javascript
{
  _id: ObjectId,
  jobType: 'watermarking' | 'excel' | 'pdf_generation' | 'email',
  submissionId: ObjectId,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: Number (0-100),
  error: String,
  retryCount: Number,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.backgroundJobs.createIndex({ jobType: 1, status: 1 });
db.backgroundJobs.createIndex({ createdAt: -1 });
```

#### 6. Companies Collection
```javascript
{
  _id: ObjectId,
  name: String,
  ownerId: ObjectId,
  address: String,
  city: String,
  phone: String,
  email: String,
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.companies.createIndex({ ownerId: 1 });
```

---

## Authentication & Authorization

### Role-Based Access Control

```typescript
// lib/rbac.ts
export const rolePermissions = {
  painter: [
    'view_assigned_jobs',
    'submit_form',
    'edit_own_submission', // Within 2 hours
    'view_own_submissions',
    'upload_images'
  ],

  owner: [
    'view_all_jobs',
    'create_job',
    'edit_job',
    'view_all_submissions',
    'approve_submission',
    'reject_submission',
    'edit_submission', // Owner can edit any submission
    'delete_submission',
    'generate_excel',
    'generate_photos_pdf',
    'download_files',
    'view_photos',
    'download_photos_pdf',
    'manage_painters',
    'manage_companies'
  ],

  admin: [
    'manage_all_users',
    'manage_all_jobs',
    'manage_all_submissions',
    'view_system_logs',
    'view_background_jobs',
    'delete_files',
    'view_all_analytics'
  ]
};

export const hasPermission = (role: string, permission: string): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};
```

---

## Complete API Specification

### Authentication APIs

```
POST /api/auth/register
  Body: { email, password, role, name, phone }
  Response: { token, user }

POST /api/auth/login
  Body: { email, password }
  Response: { token, user }

POST /api/auth/logout
  Response: { success: true }

POST /api/auth/verify
  Headers: { Authorization: "Bearer <token>" }
  Response: { user, valid: true }
```

### Submission APIs (Painter)

```
POST /api/submissions
  Description: Create new painting submission
  Body: {
    jobId: String,
    location: String,
    paintingSize: String,
    images: [{ cloudinaryId, cloudinaryUrl }]
  }
  Response: {
    _id,
    generatedNumber: "#0001",
    canEditUntil: Date,
    watermarkingStatus: "queued"
  }

GET /api/submissions?jobId=<jobId>&status=pending
  Description: Get submissions (paginated)
  Response: { submissions: [], total, page, pageSize }

GET /api/submissions/:submissionId
  Description: Get submission with images
  Response: { submission with all details }

PUT /api/submissions/:submissionId
  Description: Edit submission (within 2-hour window)
  Body: { location?, paintingSize?, images? }
  Response: { updatedSubmission }
  Error: 409 if edit period expired

DELETE /api/submissions/:submissionId
  Description: Delete submission (within edit period)
  Response: { success: true }
```

### Job APIs (Owner/Admin)

```
POST /api/jobs
  Body: { jobNumber, jobName, companyId, location, budget }
  Response: { job }

GET /api/jobs?companyId=<id>&status=active
  Response: { jobs: [], total, page }

GET /api/jobs/:jobId
  Response: { job with submission stats }

PUT /api/jobs/:jobId
  Body: { jobName?, location?, status? }
  Response: { updatedJob }

GET /api/jobs/:jobId/submissions?page=1
  Response: { submissions: [], total, page }

GET /api/jobs/:jobId/statistics
  Response: {
    totalSubmissions,
    approvedSubmissions,
    pendingSubmissions,
    completionPercentage
  }
```

### File Generation APIs

```
POST /api/generate/excel
  Description: Trigger Excel file generation
  Body: { jobId }
  Response: { jobId, status: "queued", fileId }

POST /api/generate/photos-pdf
  Description: Trigger watermarked photos PDF generation
  Body: { jobId }
  Response: { jobId, status: "queued", fileId }

GET /api/generate/status/:generatedFileId
  Description: Check generation progress
  Response: { status: "completed" | "processing", progress: 65 }

GET /api/jobs/:jobId/files
  Description: List all generated files for job
  Response: {
    files: [
      { 
        _id,
        fileType: "excel" | "pdf_photos",
        fileName,
        r2Url,
        generatedAt,
        downloadCount
      }
    ]
  }
```

### Photos APIs

```
GET /api/photos/:jobId
  Description: Get all photos for a job
  Response: {
    photos: [
      {
        _id,
        submissionId,
        generatedNumber: "#0001",
        originalUrl: String (Cloudinary),
        watermarkedUrl: String (R2),
        location,
        paintingSize
      }
    ]
  }

GET /api/photos/:jobId/download-pdf
  Description: Download all watermarked photos as PDF (1 per page)
  Response: PDF file stream
  Headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="photos.pdf"'
  }

POST /api/photos/sign
  Description: Get Cloudinary upload signature
  Body: { submissionId }
  Response: { signature, timestamp, publicId, cloudName }
```

### File Management APIs

```
GET /api/files?jobId=<id>&fileType=excel
  Description: List files (paginated)
  Response: { files: [], total, page }

GET /api/files/:fileId/download
  Description: Get download link (R2 signed URL)
  Response: { downloadUrl, expiresIn: 3600 }

DELETE /api/files/:fileId
  Description: Delete generated file (owner only)
  Response: { success: true }
```

### Notification APIs

```
POST /api/notifications/fcm-token
  Description: Register FCM device token
  Body: { token: String }
  Response: { success: true }

POST /api/notifications/send-test
  Description: Send test notification (admin)
  Body: { userId, title, body }
  Response: { success: true }

GET /api/notifications?limit=20
  Description: Get user notifications (if stored in DB)
  Response: { notifications: [] }
```

### Owner Submission Management

```
PUT /api/owner/submissions/:submissionId
  Description: Edit submission as owner (anytime)
  Body: { location?, paintingSize?, images? }
  Response: { updatedSubmission }

DELETE /api/owner/submissions/:submissionId
  Description: Delete submission as owner
  Response: { success: true }

POST /api/owner/submissions/:submissionId/approve
  Description: Approve submission
  Body: { notes? }
  Response: { approvedSubmission }
  Action: Sends FCM + Email to painter

POST /api/owner/submissions/:submissionId/reject
  Description: Reject submission
  Body: { rejectionReason }
  Response: { rejectedSubmission }
  Action: Sends FCM + Email to painter
```

### Company APIs (Owner Only)

```
POST /api/companies
  Description: Create company
  Body: { name, address, city, phone, email }
  Response: { company }

GET /api/companies?ownerId=<id>
  Description: Get owner's companies
  Response: { companies: [], total }

GET /api/companies/:companyId
  Description: Get company details
  Response: { company with job count and stats }

PUT /api/companies/:companyId
  Description: Update company
  Body: { name?, address?, phone?, email? }
  Response: { updatedCompany }

DELETE /api/companies/:companyId
  Description: Delete company
  Response: { success: true }
```

---

## File Generation Pipeline

### Excel File Generation

```
POST /api/generate/excel with { jobId }
    ↓
Queue Job: type='excel', status='processing'
    ↓
Worker Process:
1. Fetch all submissions for job
2. Create ExcelJS workbook
3. Add columns:
   - Serial # (1, 2, 3, ...)
   - Photo # (#0001, #0002, ...)
   - Location
   - Size
4. Add data rows
5. Write to buffer
    ↓
Upload to R2: /2026/05/17/excel/job_xyz.xlsx
    ↓
Create GeneratedFile entry
    ↓
Return: { fileId, downloadUrl }
```

### Watermarked Photos PDF Generation

```
POST /api/generate/photos-pdf with { jobId }
    ↓
Queue Job: type='pdf_generation', status='processing'
    ↓
Worker Process:
1. Fetch all approved submissions for job
2. Create PDFKit document
3. For each submission:
   - Add new page
   - Fetch watermarked image from R2
   - Embed image (A4 size)
   - Add text: "Photo #: #0001" at bottom
4. Generate PDF buffer
    ↓
Upload to R2: /2026/05/17/pdf_photos/job_xyz_photos.pdf
    ↓
Create GeneratedFile entry
    ↓
Return: { fileId, downloadUrl }

User Can: Download and print → Cut out photos → Paste into hard files
```

### Watermarking Process (Background)

```
Painter submits images
    ↓
For each image:
  Queue watermarking job
    ↓
  Worker fetches image from Cloudinary
    ↓
  Load with Jimp library
    ↓
  Add watermark: generatedNumber (#0001)
    ↓
  Upload watermarked to R2
    ↓
  Update Submission.images[].watermarkedUrl
    ↓
  Mark BackgroundJob complete
```

---

## Notifications System

### Push Notifications (FCM)

#### Frontend Setup

```typescript
// lib/firebase-fcm.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function registerFCM() {
  if (!('serviceWorker' in navigator)) return;

  // Register service worker
  await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // Get device token
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  });

  if (token) {
    // Send token to backend
    await fetch('/api/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  // Listen for foreground messages
  onMessage(messaging, (payload) => {
    console.log('Message:', payload);
    // Show in-app notification
    store.dispatch(
      notificationsSlice.actions.addNotification({
        title: payload.notification?.title,
        body: payload.notification?.body,
        type: 'info'
      })
    );
  });
}
```

```typescript
// hooks/useFCM.ts
export function useFCM() {
  useEffect(() => {
    const token = useAuthStore((state) => state.token);
    if (token) {
      registerFCM();
    }
  }, []);
}
```

#### Backend Setup

```typescript
// lib/firebase-admin.ts
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
  ),
  projectId: process.env.FIREBASE_PROJECT_ID
});

export const messaging = admin.messaging();
```

#### Sending Notifications

```typescript
// services/notificationService.ts
export async function notifyOwner(
  ownerId: string,
  title: string,
  body: string
) {
  const user = await User.findById(ownerId);
  if (!user?.fcmTokens?.length) return;

  const message = {
    notification: { title, body },
    webpush: {
      notification: {
        title,
        body,
        icon: '/icon.png'
      }
    }
  };

  for (const token of user.fcmTokens) {
    try {
      await messaging.send({ ...message, token });
    } catch (error) {
      // Remove invalid token
      await User.updateOne({ _id: ownerId }, { $pull: { fcmTokens: token } });
    }
  }
}
```

### Email Notifications (Resend)

```typescript
// services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(painterEmail: string, jobName: string) {
  return await resend.emails.send({
    from: 'notifications@wallpainter.app',
    to: painterEmail,
    subject: 'Submission Approved ✓',
    html: `
      <h2>Your submission has been approved!</h2>
      <p>Job: ${jobName}</p>
      <p>You can now view your approval status in the app.</p>
    `
  });
}

export async function sendRejectionEmail(
  painterEmail: string,
  reason: string
) {
  return await resend.emails.send({
    from: 'notifications@wallpainter.app',
    to: painterEmail,
    subject: 'Submission Needs Revision',
    html: `
      <h2>Your submission needs revision</h2>
      <p>Reason: ${reason}</p>
      <p>Please re-submit with corrections.</p>
    `
  });
}
```

### Notification Types

| Event | Method | Recipient |
|-------|--------|-----------|
| **New submission received** | FCM + Email | Owner |
| **Submission approved** | FCM + Email | Painter |
| **Submission rejected** | FCM + Email | Painter |
| **File ready for download** | FCM + In-app | Owner |
| **New job assigned** | FCM + Email | Painter |

---

## File Storage Strategy

### Cloudflare R2 Configuration

```javascript
// R2 bucket structure
wallpaint-files/
├── 2026/
│   ├── 05/
│   │   ├── 17/
│   │   │   ├── excel/
│   │   │   │   ├── job_xyz_abc.xlsx
│   │   │   │   └── job_def_ghi.xlsx
│   │   │   ├── pdf_photos/
│   │   │   │   ├── job_xyz_photos.pdf
│   │   │   │   └── job_def_photos.pdf
│   │   │   └── images/
│   │   │       ├── watermarked_#0001.jpg
│   │   │       └── watermarked_#0002.jpg
```

### Upload Service

```typescript
// services/r2Service.ts
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'excel' | 'pdf_photos' | 'image'
): Promise<{ path: string; publicUrl: string }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const filePath = `${year}/${month}/${day}/${fileType}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: filePath,
    Body: fileBuffer,
    ContentType: getContentType(fileName)
  });

  await s3Client.send(command);

  // Generate signed URL valid for 24 hours
  const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: filePath
  }), { expiresIn: 86400 });

  return { path: filePath, publicUrl: signedUrl };
}
```

### Storage Costs

```
Free Tier (5GB forever):
- ✅ Unlimited file uploads
- ✅ Unlimited downloads
- ✅ Unlimited API requests
- ✅ Signed URLs (24-hour expiry)

If exceeds 5GB:
- $0.015 per GB (vs S3: $0.023)
- First 5GB forever free
```

---

## Scalability Design

### Multi-Tenancy (Multiple Companies/Owners)

All queries filter by `companyId`:

```typescript
// Example: Painter can only see jobs from their company
app.get('/api/jobs', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const user = await User.findById(userId);

  const jobs = await Job.find({
    $or: [
      { companyId: user.companyId },
      { ownerId: userId }
    ]
  }).limit(20);

  res.json({ jobs });
});
```

### Database Optimization

```javascript
// Indexes for frequently accessed queries
db.jobs.createIndex({ companyId: 1, status: 1 });
db.submissions.createIndex({ jobId: 1, status: 1 });
db.submissions.createIndex({ painterId: 1 });
db.generatedFiles.createIndex({ jobId: 1 });

// Lean queries (plain JS, faster)
const submissions = await Submission
  .find({ jobId })
  .select('generatedNumber location paintingSize') // Only needed fields
  .lean();
```

### Queue Distribution (Bull)

```typescript
// Each job type processed separately
const watermarkQueue = new Queue('watermarking', { redis });
const excelQueue = new Queue('excel-generation', { redis });
const pdfQueue = new Queue('pdf-generation', { redis });
const emailQueue = new Queue('email', { redis });

// Multiple workers can run in parallel
watermarkQueue.process(5, workerFunction); // 5 concurrent
excelQueue.process(2, workerFunction);     // 2 concurrent
pdfQueue.process(2, workerFunction);       // 2 concurrent
emailQueue.process(10, workerFunction);    // 10 concurrent
```

### Pagination

```typescript
app.get('/api/jobs', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const jobs = await Job
    .find({ companyId })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Job.countDocuments({ companyId });

  res.json({
    jobs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});
```

---

## Caching Strategies

### 1. In-Memory Cache (Node.js)

```typescript
// lib/cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 min default

export const cacheService = {
  get<T>(key: string): T | undefined {
    return cache.get(key);
  },

  set<T>(key: string, value: T, ttl = 600) {
    cache.set(key, value, ttl);
  },

  del(key: string) {
    cache.del(key);
  },

  flush() {
    cache.flushAll();
  }
};

// Usage
app.get('/api/jobs/:jobId', async (req, res) => {
  const cacheKey = `job:${req.params.jobId}`;
  
  let job = cacheService.get(cacheKey);
  if (job) return res.json(job);

  job = await Job.findById(req.params.jobId);
  cacheService.set(cacheKey, job, 600); // 10 min

  res.json(job);
});

// Invalidate on update
app.put('/api/jobs/:jobId', async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.jobId, req.body, {
    new: true
  });

  cacheService.del(`job:${req.params.jobId}`);
  res.json(job);
});
```

### 2. RTK Query Caching (Frontend)

```typescript
// Automatic request deduplication & caching
const submissionsApi = createApi({
  endpoints: (builder) => ({
    getSubmissions: builder.query({
      query: (jobId) => `/submissions?jobId=${jobId}`,
      keepUnusedDataFor: 300, // Keep 5 min after component unmounts
      pollingInterval: 60000 // Auto-refetch every 60s if subscribed
    })
  })
});

// Usage
const { data: submissions } = useGetSubmissionsQuery(jobId);
```

### 3. Response Caching Headers

```typescript
app.get('/api/public-data', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  res.json(data);
});

app.get('/api/private-data', authMiddleware, (req, res) => {
  res.set('Cache-Control', 'private, max-age=300'); // 5 min
  res.json(data);
});
```

### 4. Redis Caching (Optional, for distributed systems)

```typescript
// Upstash Redis (free tier: 10K commands/day)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL
});

export async function getCachedJob(jobId: string) {
  const cached = await redis.get(`job:${jobId}`);
  if (cached) return cached;

  const job = await Job.findById(jobId);
  await redis.setex(`job:${jobId}`, 600, JSON.stringify(job));

  return job;
}
```

---

## Deployment Architecture

### Tech Stack (Free Tier)

| Component | Service | Free Tier | Link |
|-----------|---------|-----------|------|
| **Hosting** | Vercel | 100GB bandwidth/mo | vercel.com |
| **Database** | MongoDB Atlas | 5GB storage | mongodb.com/cloud |
| **Images** | Cloudinary | 25GB/month | cloudinary.com |
| **File Storage** | Cloudflare R2 | 5GB forever | r2.dev |
| **Cache/Queue** | Upstash Redis | 10K commands/day | upstash.com |
| **Email** | Resend | 100/day | resend.com |
| **Push Notifications** | Firebase FCM | Unlimited | firebase.google.com |
| **Domain** | Custom | Paid | namecheap.com |
| **SSL** | Vercel | Included | Automatic |

### Deployment Flow

```
Local Development
    ↓
GitHub Push (main branch)
    ↓
GitHub Actions: Run tests, build, lint
    ↓
✅ Vercel Auto Deploy
    ↓
Production Live
    ↓
MongoDB ←→ Cloudinary ←→ R2 ←→ Redis
```

### Environment Variables

```bash
# .env.local (Development)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

CLOUDFLARE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=wallpaint-files
CLOUDFLARE_R2_ACCESS_KEY=your-key
CLOUDFLARE_R2_SECRET_KEY=your-secret

UPSTASH_REDIS_URL=https://default:pass@host:port

FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=your-email
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

RESEND_API_KEY=your-key

# .env.production (Vercel)
# Same keys, different credentials
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## Security Best Practices

### 1. Password Hashing

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.password);
```

### 2. JWT Tokens

```typescript
const token = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: '7d', algorithm: 'HS256' }
);

// Verify
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
```

### 3. Input Validation

```typescript
// Zod schemas
const submissionSchema = z.object({
  jobId: z.string().regex(/^[0-9a-f]{24}$/), // MongoDB ObjectId
  location: z.string().min(3).max(500),
  paintingSize: z.enum(['small', 'medium', 'large']),
  images: z.array(z.object({
    cloudinaryId: z.string(),
    cloudinaryUrl: z.string().url()
  }))
});

// Validate all inputs
const data = submissionSchema.parse(req.body);
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // 5 attempts
  skipSuccessfulRequests: true
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

### 5. File Upload Validation

```typescript
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function validateImage(file: File) {
  if (file.size > MAX_SIZE) throw new Error('File too large');
  if (!ALLOWED_MIMES.includes(file.type)) throw new Error('Invalid type');

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer).subarray(0, 4);
  const hex = Array.from(bytes)
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');

  // JPEG: FFD8FF | PNG: 89504E47
  if (!hex.startsWith('ffd8ff') && !hex.startsWith('89504e47')) {
    throw new Error('Invalid file format');
  }
}
```

### 6. CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 7. Secure Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https:', 'data:']
    }
  }
}));
```

### 8. Data Encryption (Optional)

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

export function encrypt(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}
```

### 9. Audit Logging

```typescript
export async function logAudit(
  userId: string,
  action: string,
  entityId: string
) {
  await AuditLog.create({
    userId,
    action, // 'create', 'update', 'delete'
    entityId,
    timestamp: new Date(),
    ipAddress: getClientIp()
  });
}
```

### 10. Environment Security

```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# All secrets in Vercel dashboard
# Rotation: Change secrets every 90 days
```

---

## Important Configuration Files

### next.config.ts
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/*/image/upload/**'
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com'
      }
    ]
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'Wall Painting Contractor App',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  },

  // TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false
  },

  // ESLint during build
  eslint: {
    ignoreDuringBuilds: false
  },

  // Compression
  compress: true,

  // Production optimizations
  poweredByHeader: false,

  // Security headers
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

### tsconfig.json
```json
{
  "compilerOptions": {
    // Target and library
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",

    // Module resolution
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,

    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // Type checking
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Emit
    "noEmit": true,
    "outDir": "./.next/types",

    // Module features
    "allowJs": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,

    // Incremental builds
    "incremental": true,

    // Bundler features
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "strictBindCallApply": true,
    "alwaysStrict": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist"
  ]
}
```

### globals.css (Tailwind v4+ Setup)
```css
@import "tailwindcss";

/* Custom theme variables (optional) */
@theme {
  --color-primary: #0050b3;
  --color-secondary: #ff7a45;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --radius: 0.5rem;
}

/* Custom utilities (optional) */
@layer utilities {
  .btn-primary {
    @apply px-4 py-2 rounded bg-primary text-white font-semibold hover:opacity-90;
  }
  
  .btn-secondary {
    @apply px-4 py-2 rounded bg-secondary text-white font-semibold hover:opacity-90;
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
- [ ] Setup Next.js + TypeScript + Tailwind
- [ ] MongoDB Atlas connection & schema
- [ ] Authentication (Zustand + JWT)
- [ ] Basic job CRUD
- [ ] Painter submission form

### Phase 2: Core Features (Weeks 4-6)
- [ ] Image upload to Cloudinary
- [ ] Watermarking background jobs (Bull)
- [ ] Excel file generation
- [ ] Watermarked photos PDF generation
- [ ] Cloudflare R2 integration
- [ ] File download endpoints

### Phase 3: Notifications (Weeks 7-8)
- [ ] Firebase Cloud Messaging setup
- [ ] FCM token registration
- [ ] Push notifications on events
- [ ] Resend email integration
- [ ] Email templates

### Phase 4: Polish & Production (Weeks 9-12)
- [ ] RTK Query integration
- [ ] Frontend caching
- [ ] Rate limiting
- [ ] Input validation
- [ ] Error handling
- [ ] Testing
- [ ] Deployment to Vercel
- [ ] Documentation

---

## Project Notes

### Key Architectural Decisions

1. **Single Application**: All 3 roles (painter, owner, admin) in one Next.js app with role-based routing
2. **No Client Role**: Removed client/company owner role - contractors communicate directly with painters
3. **File Structure**: Uses `src/app` directory (type-safe, cleaner structure)
4. **100% Free Stack**: All services have free tiers, no paid integrations
5. **Scalable from Day 1**: Multi-tenancy built-in, can handle 10,000+ painters without changes

### Roles Defined

| Role | Responsibility | Key Actions |
|------|---|---|
| **Painter** | Submit wall paintings | Upload images, fill forms, view submissions |
| **Owner** | Manage jobs & payments | Create jobs, approve submissions, generate files |
| **Admin** | System management | Manage users, view logs, system settings |

### Three-Tier Architecture

```
Frontend Layer (React + Next.js)
    ↓
API Layer (Next.js Routes + Services)
    ↓
Data Layer (MongoDB + External Services)
```

### File Generation Workflow

1. **Watermarking** (Background Job)
   - Painter uploads image to Cloudinary
   - Generated # assigned (#0001, #0002, etc.)
   - Bull job queue watermarks image with Jimp
   - Uploads watermarked version to Cloudflare R2

2. **Excel Generation** (Background Job)
   - Owner clicks "Generate Excel"
   - ExcelJS creates: Serial #, Photo #, Location, Size
   - Uploads to R2
   - Owner downloads

3. **Photos PDF** (Background Job)
   - Owner clicks "Download Photos as PDF"
   - PDFKit creates PDF with 1 watermarked photo per page
   - Each page shows generated number
   - Owner prints and cuts photos
   - Pastes into hard files matching location/sizes

### Notification Flow

**Event**: Painter submits form
→ FCM Push Notification (Owner)
→ Email from Resend (Owner)

**Event**: Owner approves submission
→ FCM Push Notification (Painter)
→ Email from Resend (Painter)

### Data Storage

| Data | Storage | Size Limit | Cost |
|------|---------|------------|------|
| User accounts, jobs, submissions | MongoDB Atlas | 5GB free | Free tier |
| Original images | Cloudinary | 25GB/month free | Free tier |
| Watermarked images, PDFs, Excel | Cloudflare R2 | 5GB forever free | Free tier |
| Session cache, job queue | Redis (Upstash) | 10K commands/day free | Free tier |

### Scalability Checklist

- ✅ Multi-tenancy (multiple companies/owners)
- ✅ Pagination (20 items per page)
- ✅ Caching (in-memory, Redis, RTK Query)
- ✅ Background jobs (Bull queue, separate workers)
- ✅ Database indexes (optimized queries)
- ✅ Lean queries (only fetch needed fields)
- ✅ Horizontal scaling ready (stateless API)

### Security Checklist

- ✅ JWT authentication (7-day expiry)
- ✅ Role-based access control (RBAC)
- ✅ Input validation (Zod schemas)
- ✅ Password hashing (bcryptjs)
- ✅ Rate limiting (5 attempts/15 min)
- ✅ File upload validation (magic bytes)
- ✅ CORS headers configured
- ✅ Helmet security headers
- ✅ Audit logging enabled
- ✅ Environment variables secured

### Performance Targets

- **Page Load**: < 2s
- **API Response**: < 500ms
- **File Generation**: < 30s (PDF), < 15s (Excel)
- **Image Watermarking**: < 5s per image
- **Database Query**: < 100ms (with indexes)

### Next Steps After Review

1. Review architecture with team
2. Set up development environment
3. Create MongoDB collections
4. Initialize Cloudinary project
5. Set up Firebase & Resend accounts
6. Configure Cloudflare R2
7. Start Phase 1 implementation

---

## Latest Technology Updates (May 2026)

### Next.js 14+ Features Used
- ✅ **App Router** - File-based routing in `src/app/`
- ✅ **Server Components** - Default, async/await support
- ✅ **API Routes** - `src/app/api/` for REST endpoints
- ✅ **Middleware** - `src/middleware.ts` for auth checks
- ✅ **Image Optimization** - Built-in with `next/image`
- ✅ **Turbopack** - Faster development builds
- ✅ **Dynamic Imports** - Lazy load components with code splitting
- ✅ **Font Optimization** - `next/font` for web fonts

### React 18+ Features
- ✅ **Concurrent Rendering** - Automatic batching of updates
- ✅ **Suspense** - Better loading states & code splitting
- ✅ **useTransition** - Non-blocking state updates
- ✅ **Streaming SSR** - Faster initial page loads
- ✅ **Automatic Memoization** - Better performance by default

### TypeScript 5.x Features
- ✅ **Const Type Parameters** - Better generic type inference
- ✅ **Decorators** - Stage 3 proposal support
- ✅ **Improved JSDoc** - Better type inference from comments
- ✅ **Type Narrowing** - Smarter type guards

### Tailwind CSS v4+ (No Config Needed!)
- ✅ **Zero Config** - Works out of the box
- ✅ **@theme Directive** - Customize in CSS files
- ✅ **CSS-First Setup** - Define variables in CSS
- ✅ **Better Performance** - Optimized CSS generation
- ✅ **Modern CSS Features** - Native CSS nesting, variables

### MongoDB Latest Features
- ✅ **Flexible Schemas** - No strict validation required
- ✅ **Transactions** - ACID transactions for consistency
- ✅ **Change Streams** - Real-time data monitoring
- ✅ **Aggregation Pipeline** - Complex data processing

### Firebase v11+ Features
- ✅ **Modular SDK** - Tree-shakeable, smaller bundle size
- ✅ **Web Workers** - Background processing support
- ✅ **Performance Monitoring** - Built-in metrics
- ✅ **Local Testing** - Offline development support

---

## Best Practices Implemented

### Frontend Development
```typescript
// Use Server Components by default (better performance)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Mark Client Components explicitly
'use client';

// Use Next.js Image for optimization
import Image from 'next/image';

// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./heavy'), {
  loading: () => <Skeleton />
});
```

### Database Operations
```javascript
// Index frequently queried fields
db.submissions.createIndex({ jobId: 1, status: 1 });

// Use lean() for read-only operations
const data = await Model.find().lean();

// TTL indexes for auto-cleanup
db.logs.createIndex({ createdAt: 1 }, 
  { expireAfterSeconds: 86400 } // Auto-delete after 1 day
);
```

### Security & Performance
```typescript
// Validate all inputs with Zod
const data = schema.parse(req.body);

// Cache API responses
res.set('Cache-Control', 'public, max-age=3600');

// Hash passwords with bcrypt
const hash = await bcrypt.hash(password, 10);

// Rate limiting on sensitive endpoints
// 5 attempts per 15 minutes on login

// CORS only trusts same origin
// Configured in middleware
```

---

## Updated npm Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "next": "^14.0.0"
  }
}
```

---

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

---

## Pre-Production Deployment Checklist

Essential steps before going live:

**Environment & Secrets**
- [ ] All `.env` variables in Vercel dashboard
- [ ] No secrets in code or git
- [ ] MongoDB connection string validated
- [ ] API keys rotated and secured

**Database Setup**
- [ ] MongoDB collections created with indexes
- [ ] TTL indexes configured for cleanup
- [ ] Backups enabled (MongoDB Atlas)
- [ ] IP whitelist includes Vercel servers

**External Services**
- [ ] Firebase credentials configured
- [ ] Cloudinary API keys verified
- [ ] Cloudflare R2 bucket created
- [ ] Resend email sender verified
- [ ] Upstash Redis endpoint tested

**Security**
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] CORS headers configured
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] Audit logging active
- [ ] Password hashing verified

**Performance**
- [ ] Images optimized (Cloudinary CDN)
- [ ] Database indexes verified
- [ ] Caching headers set
- [ ] Bundle size analyzed
- [ ] Load testing passed

**Monitoring**
- [ ] Error tracking enabled (Sentry optional)
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Alerts setup for failures

---

**Version 3.1 - Production Ready ✅**
- ✅ `src/app` folder structure (Next.js 14+)
- ✅ Client role removed completely
- ✅ Tailwind CSS v4+ (no config file)
- ✅ Latest Next.js/React/TS best practices
- ✅ Complete setup guide with npm packages
- ✅ All config files with modern defaults
- ✅ 100% free technology stack
- ✅ Enterprise-grade security
- ✅ Scalable architecture
- ✅ Performance optimized
- ✅ Ready to deploy

**End of System Architecture V3**
