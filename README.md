# Wallo

**Job management for painting contractors.** Owners create jobs and assign painters; painters submit photo documentation of their walls; owners review, approve, and generate professional output files - all in one place.

Live at **[wallo.cc](https://wallo.cc)**

---

## What it does

Painting contractors traditionally managed work via WhatsApp chats and manual Excel sheets. Wallo replaces that with a structured digital workflow - without forcing painters to abandon WhatsApp entirely. Owners generate a unique invite link per painter, send it on WhatsApp, and the painter is onboarded in one tap. No app store, no separate sign-up.

---

## Roles

| Role | What they do |
|---|---|
| **Painter** | Receives a WhatsApp invite link, submits wall photos with measurements, tracks approval status, edits rejected work |
| **Owner / Contractor** | Creates jobs, assigns painters, reviews and approves submissions, generates Excel and PDF reports |
| **Admin** | System-wide user management, background job monitoring, storage oversight, audit logs |

---

## Features

### Onboarding
- Owner creates a painter account directly from their dashboard
- A unique invite link is generated and sent to the painter via WhatsApp
- Painter clicks the link, claims their account, and is in - no traditional sign-up required
- Token-based, expiring invites (configurable TTL, default 30 days)

### Auth
- JWT-based stateless auth with bcrypt password hashing
- Role-based access control enforced at the middleware layer on every route
- Email + OTP verification for owner accounts via Resend

### Jobs
- Owners create jobs with a name and description
- Painters are assigned per job; submission stats tracked in real time
- Job lifecycle: `active → completed → invoiced`

### Submissions
- Painters submit walls with location, photo number, and one or more size measurements
- Photos compressed client-side (full: 2 MB / 2000px · preview: 300 KB / 800px) before upload to Cloudinary
- Both full-resolution and preview URLs stored per photo
- Owners can edit or delete any submission; painters can only edit pending or rejected ones

### Photo Approval
- Owners select which photos to approve within a submission
- Approved photos are assigned sequential generated numbers, unique and gapless per job
- Cloudinary URL-transform applied on approval to watermark the photo with its generated number
- Revoking approval resets the photo to pending and clears the generated number

### File Generation
- One click triggers background generation of three file types: **Excel spreadsheet**, **Photos PDF**, **File PDF**
- Jobs queued via BullMQ + Redis and processed by a dedicated worker process
- Generated files stored on Cloudflare R2 with presigned download URLs

### Notifications
- In-app notification inbox for all key events: new submission, approval, rejection, resubmission, owner edits
- Firebase FCM push notifications to web/mobile
- Email notifications via Resend
- Notifications auto-expire after 30 days (MongoDB TTL index)

### Admin Tools
- Full user directory with approval/rejection of owner accounts
- Background job queue monitor
- Storage management (Cloudinary, Cloudflare R2, MongoDB)
- Audit log viewer - all mutating actions logged with user, IP, action, and duration

---

## Tech Stack

### Frontend
| | |
|---|---|
| Next.js | App Router, Turbopack |
| React | React Compiler enabled |
| Tailwind CSS | CSS-first config |
| Zustand | Persisted auth state (user, token, role) |
| Redux Toolkit + RTK Query | App state slices and all server-state fetching with caching |

### Backend
| | |
|---|---|
| Next.js API Routes | REST API, middleware-enforced RBAC |
| Mongoose | MongoDB ODM with schema validation |
| Zod | Runtime validation on all API inputs |
| jsonwebtoken + bcryptjs | Stateless auth and password hashing |
| BullMQ + ioredis | Background job queue for file generation |
| Pino | Structured logging |

### External Services
| | |
|---|---|
| MongoDB Atlas | Primary database |
| Cloudinary | Image CDN, storage, and URL-based watermark transforms |
| Cloudflare R2 | Generated file storage (Excel, PDF) via S3-compatible API |
| Redis | BullMQ backend - Upstash in dev, self-hosted in prod |
| Firebase FCM | Push notifications to web/mobile |
| Resend | Transactional email - OTP, verification, notifications |

### Tooling
| | |
|---|---|
| TypeScript 5 | Strict typing end-to-end |
| ExcelJS | Excel report generation |
| PDFKit | PDF report generation |
| ESLint 9 | Flat config linting |

---

## Architecture

```
Browser / PWA
     │
     ▼
Nginx  (TLS termination · Let's Encrypt · reverse proxy)
     │
     ▼
Next.js App  ──────────────────────────────────────────┐
  ├── Pages & Layouts  (App Router)                    │
  ├── API Routes       (REST · JWT + RBAC middleware)  │
  └── RTK Query        (client-side cache)             │
                                                       │
       ├── MongoDB Atlas    primary data               │
       ├── Cloudinary       image storage + watermarks │
       ├── Cloudflare R2    generated file storage     │
       ├── Firebase FCM     push notifications         │
       └── Resend           transactional email        │
                                                       │
Redis ◄────────────────────────────────────────────────┘
  │    (self-hosted)
  ▼
BullMQ Worker  (separate Docker container)
  ├── excelWorker.ts
  ├── photosPdfWorker.ts
  ├── filePdfWorker.ts
  └── notifyWorker.ts
```

**State management:** Zustand for auth (persisted to localStorage) · RTK Query for all server state · Redux slices for cross-component app state.

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env template and fill in values
cp .env.production.example .env.local

# Start the dev server (Turbopack)
npm run dev

# In a separate terminal, start the background worker
npm run worker
```

```bash
npx tsc --noEmit   # type check
npm run lint        # lint
```

---

## Deployment

Production runs on an **Oracle Cloud VM** behind **Nginx** with Let's Encrypt SSL. Three Docker containers managed by Docker Compose:

| Container | Runs |
|---|---|
| `redis` | Redis 7 (BullMQ backend) |
| `app` | Next.js standalone server on port 3000 |
| `worker` | BullMQ workers - file generation and notifications |

**CI/CD:** Every push to `main` triggers a GitHub Actions workflow that SSHs into the VM, pulls the latest code, rebuilds the Docker images, restarts containers, and hits `/api/health` to verify the deploy.

```
git push origin main  →  GitHub Actions  →  Oracle VM  →  docker compose up
```

To deploy manually on the VM:

```bash
git pull origin main
set -a && source .env.production && set +a
docker compose build --no-cache
docker compose up -d --no-deps --build app worker
```

All required environment variables are documented in `.env.production.example`.

---

## Roadmap

Confirmed next items, in rough priority order:

- **Job types** - Wall Painting, Shutter Painting, Van Painting selectable per job
- **Job lifecycle UI** - complete and invoiced workflow fully wired to the frontend
- **Recycle bin** - soft-delete for submissions and jobs with restore capability
- **Painter sort order in file gen** - owner-controlled ordering of painters in the output files
- **Skeleton loading states** - replace blank loading screens with skeletons across all views

Further out, after core adoption is stable:

- **WhatsApp data sink** - pull structured data from painter WhatsApp chats directly into the owner dashboard using [wwebjs.dev](https://wwebjs.dev), as a zero-friction fallback for painters who don't engage with the invite link
- **City-walk job video** - auto-generated video that moves between job site locations and zooms into each submission; shareable with clients and upper management as a professional deliverable

---

## Project Layout

```
src/
├── app/                  # Pages, layouts, and API routes only
│   ├── (auth)/           # Login, register, forgot/reset password
│   ├── owner/            # Owner dashboard, jobs, submissions, files
│   ├── painter/          # Painter dashboard, job views, submission forms
│   ├── admin/            # Admin tools - users, logs, storage, queue monitor
│   ├── join/[token]/     # Painter invite claim page
│   └── api/              # All REST endpoints
├── components/           # Reusable UI - ui/, forms/, common/, dashboards/, photos/
├── hooks/                # useAuth, useJob, useFCM, useAppDispatch
├── store/                # Zustand auth store + RTK store + RTK Query API slices
├── lib/                  # Services and utilities - auth, validators, rbac, cloudinary…
└── proxy.ts              # JWT + RBAC on every route

workers/                  # BullMQ worker processes (separate Docker container)
nginx/                    # Nginx config - TLS, reverse proxy to port 3000
```

---

## Developers

| | |
|---|---|
| **Mayank Mohit Agarwal** | [mayankmohitagarwal7@gmail.com](mailto:mayankmohitagarwal7@gmail.com) |
| **Krish Kumar** | [krishkrsquare@gmail.com](mailto:krishkrsquare@gmail.com) |

---

## Copyright

Copyright (c) 2026 Mayank Mohit Agarwal & Krish Kumar. All rights reserved.

See [COPYRIGHT](./COPYRIGHT) for details.
