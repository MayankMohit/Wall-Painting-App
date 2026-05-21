# Tech Stack & Local Setup

This file lists the exact runtimes, libraries, and external services this codebase depends on, plus the commands to get a working dev environment.

For production deployment to Oracle Cloud, see `13-DEPLOYMENT.md`.

---

## Runtimes

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.x LTS | ARM64 on the prod VM; whatever architecture for dev. |
| npm | 10.x | Comes with Node 20. |
| MongoDB | Atlas (M0 free or self-hosted 7.x) | We rely on `$inc` atomicity and replica-set transactions. |
| Redis | Upstash (managed) or local 7.x | Used as queue store, cache, blacklist, and pubsub. |

Browser requirements for the client: modern evergreen (Chrome, Safari, Firefox, Edge). The painter app is a PWA installable on Android and iOS.

---

## Core libraries

### Framework
- `next` 16 (App Router, Turbopack, React Compiler enabled in `next.config.ts`)
- `react` 19, `react-dom` 19
- `typescript` 5.5+

### Server-side
- `mongoose` — MongoDB ODM
- `bullmq` — durable queues on Redis
- `ioredis` — Redis client (BullMQ's preferred)
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT issuance / verification
- `zod` — single source of truth for request validation
- `pino` + `pino-pretty` — structured request logs
- `helmet`-style headers applied via Next middleware
- `express-rate-limit`-style logic implemented over Redis
- `sharp` — watermarking (libvips). Pre-bundled with Next.js; on bare Linux install `libvips-dev`.
- `exceljs` — Excel generation
- `pdfkit` — PDF generation (Photos PDF + File PDF)
- `cloudinary` — server-side signing
- `@aws-sdk/client-s3` — talks to Cloudflare R2 (S3-compatible)
- `firebase-admin` — FCM token send
- `resend` — transactional email
- `react-email` + `@react-email/components` — email templates

### Client-side
- `@reduxjs/toolkit` — Redux Toolkit + RTK Query
- `react-redux`
- `zustand` (with `persist` middleware) — auth + UI state
- `react-hook-form` + `@hookform/resolvers/zod`
- `tailwindcss` 4
- shadcn/ui components (copy-pasted into `src/components/ui/`)
- `lucide-react` — icons
- `firebase` (client SDK) — for FCM `getToken()`

---

## External services & accounts

You'll need accounts on:

1. **MongoDB Atlas** — create a free M0 cluster, allow access from your VM's IP (or `0.0.0.0/0` while developing). Copy the connection string.
2. **Cloudinary** — create an unsigned upload preset `wp_submissions` restricted to the `submissions/` folder. Note the cloud name, API key, API secret.
3. **Cloudflare R2** — create a bucket `wallpainter`. Generate an S3 API token with `Object Read & Write` scoped to that bucket. Note endpoint, access key, secret.
4. **Upstash Redis** — create a free Redis database in your region. Copy the `rediss://` connection string.
5. **Firebase** — create a project, enable Cloud Messaging, download the service account JSON, generate a Web Push VAPID key.
6. **Resend** — create an account, add and verify your sending domain (DNS records), grab an API key.

---

## Environment variables

Create `.env.local` for development and `.env.production` on the deployment VM. Both share the same keys:

```bash
# --- Core ---
NODE_ENV=development                       # production on the VM
PORT=3001                                  # any free port; Nginx proxies 443→3001
NEXT_PUBLIC_APP_URL=https://wallpainter.yourdomain.com
NEXT_PUBLIC_VERSION=v1.0.0

# --- Database ---
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/wallpainter?retryWrites=true&w=majority

# --- Redis (Upstash) ---
REDIS_URL=rediss://default:<pass>@<host>.upstash.io:6379

# --- Auth ---
JWT_SECRET=<base64-128-bit>                # openssl rand -base64 32

# --- Cloudinary (raw uploads) ---
CLOUDINARY_CLOUD_NAME=wallpainter-prod
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...                  # never commit
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=wallpainter-prod   # safe to expose

# --- Cloudflare R2 (watermarked + exports) ---
CLOUDFLARE_R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=wallpainter

# --- Firebase Cloud Messaging (server) ---
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# --- Firebase (client, public — exposed in NEXT_PUBLIC_*) ---
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

# --- Resend ---
RESEND_API_KEY=re_...
EMAIL_FROM=notifications@yourdomain.com

# --- Observability (optional but recommended) ---
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
```

---

## Local development

```bash
git clone git@github.com:youruser/wallpainter.git
cd wallpainter
npm install

# Run dev: API + Next.js
npm run dev

# In a second terminal, run the BullMQ workers
npm run workers
```

Visit `http://localhost:3000`.

### npm scripts

```bash
npm run dev        # next dev with Turbopack
npm run workers    # tsx workers/index.ts (BullMQ workers + listeners)
npm run build      # next build
npm run start      # next start (production)
npm run lint       # ESLint v9 flat config
npm run typecheck  # tsc --noEmit
npm run email:dev  # react-email preview server on :3001
```

There's no test runner configured yet. When one is added, this section will document it.

---

## Project layout (top-level)

```
wall-painting-app/
├── docs/                    # this folder
├── public/                  # static assets, manifest.json, firebase-messaging-sw.js
├── src/
│   ├── app/                 # pages + API routes (App Router)
│   ├── components/          # ui/, forms/, common/, dashboards/, photos/
│   ├── hooks/               # useAuth, useJob, useFCM, useAppDispatch
│   ├── lib/                 # services, validators, rbac, middleware composers, audit, r2, cloudinary, firebase-fcm, redis
│   ├── store/               # zustand auth store + RTK store + RTK Query slices
│   ├── types/               # auth, job, submission, photo, file, company, notification
│   └── middleware.ts        # edge auth check
├── workers/                 # BullMQ workers (separate PM2 process)
│   ├── index.ts             # entry point — boots all workers
│   ├── watermarkWorker.ts
│   ├── fileGenWorker.ts
│   ├── excelWorker.ts
│   ├── photosPdfWorker.ts
│   ├── filePdfWorker.ts
│   ├── notifyWorker.ts
│   └── assetCleanupWorker.ts
├── ecosystem.config.js      # PM2 process definitions (used in prod)
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs        # ESLint v9 flat
└── package.json
```

See `03-FRONTEND-ARCHITECTURE.md` for what goes inside `src/`, and `04-BACKEND-ARCHITECTURE.md` for the API + workers internals.
