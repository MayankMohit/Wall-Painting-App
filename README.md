# Wall Painting App

A full-stack job management platform for painting contractors. Owners create jobs and assign painters; painters submit photo documentation of their work; owners review, approve, and generate professional output files — all in one place.

---

## Tech Stack

### Frontend
| | |
|---|---|
| **Next.js 16** | Full-stack framework (App Router, Turbopack) |
| **React 19** | UI with React Compiler enabled |
| **Tailwind CSS v4** | Utility-first styling via CSS custom properties — no config file needed |
| **Zustand 5** | Persisted auth state (user, token, role) |
| **Redux Toolkit + RTK Query** | App state slices and all server-state fetching with caching |
| **React Hook Form** | Form state and validation |
| **browser-image-compression** | Client-side image compression before upload |

### Backend
| | |
|---|---|
| **Next.js API Routes** | REST API with middleware-enforced RBAC |
| **Mongoose 9** | MongoDB ODM with schema validation |
| **Zod 4** | Runtime API input validation |
| **jsonwebtoken** | Stateless JWT auth |
| **bcryptjs** | Password hashing |
| **BullMQ + ioredis** | Background job queue for file generation |
| **Pino** | Structured logging |

### External Services
| | |
|---|---|
| **MongoDB Atlas** | Primary database |
| **Cloudinary** | Image CDN, storage, and URL-based watermark transforms |
| **Cloudflare R2** | Generated file storage (Excel, PDF) via S3-compatible API |
| **Redis** | BullMQ queue backend (Upstash in dev, self-hosted in prod) |
| **Firebase FCM** | Mobile/web push notifications |
| **Resend** | Transactional email (verification, notifications) |

### Tooling
| | |
|---|---|
| **TypeScript 5** | Strict typing across the full stack |
| **ESLint 9** | Flat config linting |
| **ExcelJS** | Excel report generation |
| **PDFKit** | PDF report generation |

---

## Roles

| Role | Responsibilities |
|---|---|
| **Painter** | Submit wall photos with measurements, edit/resubmit rejected work, view submission history |
| **Owner / Contractor** | Create and manage jobs, assign painters, review and approve submissions, generate Excel/PDF reports |
| **Admin** | System-wide oversight, background job monitoring |

---

## Implemented Workflows

### Auth
- JWT-based stateless authentication with role-based access control (RBAC)
- Email + password signup/login with bcrypt hashing
- Email verification via Resend on signup
- Firebase phone OTP authentication as an alternative login method
- Middleware enforces role and resource ownership on every API route

### Jobs
- Owners create jobs with company name and description
- Painters are assigned/removed per job
- Job status lifecycle: `active → completed → invoiced`
- Per-painter and per-job submission stats tracked in real time

### Submissions
- Painters submit walls with location, photo number, and one or more size measurements
- Photos compressed client-side (full: 2 MB / 2000px, preview: 300 KB / 800px) before upload to Cloudinary
- Each photo stores both full-resolution and preview URLs
- Owners can edit or delete any submission at any time; painters can only edit pending/rejected ones

### Photo Approval
- Owners select which photos to approve from a submission
- Approved photos are assigned sequential generated numbers (unique per job, gapless)
- Cloudinary URL transformation applied on approval to watermark photos with the generated number
- Revoking approval resets status to pending and clears generated numbers

### File Generation
- Owners trigger background generation of: Excel spreadsheet, Photos PDF, File PDF
- Jobs queued via BullMQ + Redis; processed by a dedicated worker process
- Generated files stored on Cloudflare R2 with presigned download URLs
- Job document tracks the latest generated file per type; stale files replaced on re-generation

### Notifications
- In-app notifications for key events: new submission, approval, rejection, resubmission, owner edits
- Firebase FCM push notifications to mobile/web
- Email notifications via Resend
- Notifications auto-expire after 30 days (MongoDB TTL index)

### Audit Logging
- All mutating API actions write an audit log entry (user, action, resource, IP, duration)
- Audit logs auto-expire after 6 months (MongoDB TTL index)

---


