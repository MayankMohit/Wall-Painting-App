# Wall Painting Contractor App - System Overview

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
| **File Storage** | Cloudflare R2 | Object storage | Free (10GB/mo) |
| **Queue** | Bull + Redis | Background jobs | Free (Upstash) |
| **Caching** | Redis (Upstash) | Query cache | Free (10K/day) |
| **Email** | Resend | Transactional email | Free (100/day) |
| **Push Notifications** | Firebase Cloud Messaging | Web push | Free (unlimited) |
| **Hosting** | Vercel | Next.js deployment | Free (100GB/mo) |

---

## Roles Defined

| Role | Responsibility | Key Actions |
|------|---|---|
| **Painter** | Submit wall paintings | Upload images, fill forms, view submissions |
| **Owner** | Manage jobs & payments | Create jobs, approve submissions, generate files |
| **Admin** | System management | Manage users, view logs, system settings |

---

## Three-Tier Architecture

```
Frontend Layer (React + Next.js)
    ↓
API Layer (Next.js Routes + Services)
    ↓
Data Layer (MongoDB + External Services)
```

---

## Key Architectural Decisions

1. **Single Application**: All 3 roles (painter, owner, admin) in one Next.js app with role-based routing
2. **No Client Role**: Removed client/company owner role - contractors communicate directly with painters
3. **File Structure**: Uses `src/app` directory (type-safe, cleaner structure)
4. **100% Free Stack**: All services have free tiers, no paid integrations
5. **Scalable from Day 1**: Multi-tenancy built-in, can handle 10,000+ painters without changes
