# Wall Painting Contractor App - System Architecture Documentation

**Version:** 3.1 (Updated)  
**Last Updated:** May 2026  
**Status:** Production Ready ✅

This documentation is split into modular files for better context management when providing architecture reference to Claude Code. Read files based on your specific needs.

---

## 📋 Documentation Index

### Core Architecture
1. **[01-OVERVIEW.md](./01-OVERVIEW.md)** - System overview, tech stack summary, and architectural decisions
   - Single application architecture
   - High-level system diagram
   - Tech stack with cost analysis
   - Key architectural decisions

2. **[02-TECH-STACK.md](./02-TECH-STACK.md)** - Setup guide, environment configuration, and deployment
   - Quick setup guide with prerequisites
   - Project initialization commands
   - Environment variables
   - Deployment architecture
   - npm scripts

### Frontend & Backend
3. **[03-FRONTEND-ARCHITECTURE.md](./03-FRONTEND-ARCHITECTURE.md)** - Frontend project structure and file organization
   - Project root structure
   - `src/app/` routing structure
   - Component organization
   - Import guide and path aliases
   - State management (Zustand + RTK)
   - File organization rules

4. **[04-BACKEND-ARCHITECTURE.md](./04-BACKEND-ARCHITECTURE.md)** - Backend services and core functionality
   - Authentication service
   - Submission service
   - File generation service
   - Watermarking service
   - R2 file storage service
   - Notification service

### Data & APIs
5. **[05-DATABASE-SCHEMA.md](./05-DATABASE-SCHEMA.md)** - MongoDB collections and schema design
   - Users, Jobs, Submissions collections
   - GeneratedFiles and BackgroundJobs
   - Companies collection
   - Database indexes and optimization
   - Storage allocation

6. **[06-API-SPECIFICATION.md](./06-API-SPECIFICATION.md)** - Complete REST API endpoints
   - Authentication APIs
   - Submission APIs
   - Job management APIs
   - File generation APIs
   - Photo management APIs
   - Notification APIs
   - Company management APIs

### Features & Workflows
7. **[07-FILE-GENERATION.md](./07-FILE-GENERATION.md)** - File generation pipelines
   - Excel generation workflow
   - PDF photos generation
   - Watermarking process
   - R2 storage configuration
   - Upload service

8. **[08-NOTIFICATIONS.md](./08-NOTIFICATIONS.md)** - Push and email notifications
   - Firebase Cloud Messaging setup
   - Email notifications with Resend
   - Notification flow and types

### Production & Operations
9. **[09-SECURITY.md](./09-SECURITY.md)** - Security best practices
   - Password hashing and JWT tokens
   - Input validation with Zod
   - Rate limiting and CORS
   - File upload validation
   - Role-based access control (RBAC)
   - Security checklist

10. **[10-CONFIGURATION.md](./10-CONFIGURATION.md)** - Configuration files and deployment
    - next.config.ts
    - tsconfig.json
    - globals.css
    - GitHub Actions CI/CD

11. **[11-SCALABILITY-CACHING.md](./11-SCALABILITY-CACHING.md)** - Performance and scaling strategies
    - Multi-tenancy support
    - Pagination implementation
    - Queue distribution with Bull
    - Caching strategies (in-memory, RTK, Redis, HTTP headers)
    - Performance targets

12. **[12-IMPLEMENTATION-ROADMAP.md](./12-IMPLEMENTATION-ROADMAP.md)** - Development phases and checklist
    - Phase-based implementation plan
    - Pre-production deployment checklist
    - Next steps

---

## 🚀 Quick Navigation by Task

**Getting Started?**
→ Read [01-OVERVIEW.md](./01-OVERVIEW.md) + [02-TECH-STACK.md](./02-TECH-STACK.md)

**Building Frontend?**
→ Read [03-FRONTEND-ARCHITECTURE.md](./03-FRONTEND-ARCHITECTURE.md)

**Implementing Backend?**
→ Read [04-BACKEND-ARCHITECTURE.md](./04-BACKEND-ARCHITECTURE.md) + [05-DATABASE-SCHEMA.md](./05-DATABASE-SCHEMA.md)

**Creating APIs?**
→ Read [06-API-SPECIFICATION.md](./06-API-SPECIFICATION.md)

**Setting up Notifications?**
→ Read [08-NOTIFICATIONS.md](./08-NOTIFICATIONS.md)

**Ensuring Security?**
→ Read [09-SECURITY.md](./09-SECURITY.md)

**Optimizing Performance?**
→ Read [11-SCALABILITY-CACHING.md](./11-SCALABILITY-CACHING.md)

**Planning Implementation?**
→ Read [12-IMPLEMENTATION-ROADMAP.md](./12-IMPLEMENTATION-ROADMAP.md)

---

## 🎯 Architecture at a Glance

```
Single Next.js Application
├── Frontend Layer (React 18 + Zustand + RTK)
├── API Layer (Next.js Routes + Services)
└── Data Layer (MongoDB + External Services)

User Roles:
- Painters: Submit wall paintings
- Owners: Manage jobs & approve submissions
- Admins: System management

Key Features:
✅ Watermarked image generation
✅ Excel & PDF file export
✅ Background job processing
✅ Push notifications (FCM)
✅ Email notifications (Resend)
✅ Multi-tenancy support
✅ Role-based access control
```

---

## 📦 Tech Stack Summary

| Component | Technology | Free Tier |
|-----------|-----------|-----------|
| Frontend | Next.js 14+ | ✅ Free |
| Language | TypeScript 5+ | ✅ Free |
| Styling | Tailwind CSS v4 | ✅ Free |
| Database | MongoDB Atlas | ✅ 5GB free |
| Auth State | Zustand | ✅ Free |
| Global State | Redux Toolkit | ✅ Free |
| API Cache | RTK Query | ✅ Free |
| Image CDN | Cloudinary | ✅ 25GB/month |
| File Storage | Cloudflare R2 | ✅ 5GB forever |
| Queue | Bull + Redis | ✅ Upstash free |
| Email | Resend | ✅ 100/day |
| Push Notifications | Firebase FCM | ✅ Unlimited |
| Hosting | Vercel | ✅ 100GB/month |

**Total: 100% FREE** with production-grade features

---

## ✅ Pre-Production Checklist

- [ ] All environment variables configured
- [ ] MongoDB indexes created
- [ ] Firebase credentials verified
- [ ] Cloudinary API keys tested
- [ ] Cloudflare R2 bucket created
- [ ] Resend email verified
- [ ] HTTPS/SSL enabled
- [ ] CORS configured
- [ ] Rate limiting tested
- [ ] Security headers set

---

## 🔍 File Organization

```
wall-painting-app/
├── docs/
│   ├── 01-OVERVIEW.md
│   ├── 02-TECH-STACK.md
│   ├── 03-FRONTEND-ARCHITECTURE.md
│   ├── 04-BACKEND-ARCHITECTURE.md
│   ├── 05-DATABASE-SCHEMA.md
│   ├── 06-API-SPECIFICATION.md
│   ├── 07-FILE-GENERATION.md
│   ├── 08-NOTIFICATIONS.md
│   ├── 09-SECURITY.md
│   ├── 10-CONFIGURATION.md
│   ├── 11-SCALABILITY-CACHING.md
│   ├── 12-IMPLEMENTATION-ROADMAP.md
│   └── README.md (this file)
├── src/
│   ├── app/          (Pages & API routes)
│   ├── components/   (Reusable UI)
│   ├── hooks/        (Custom hooks)
│   ├── lib/          (Utilities)
│   ├── store/        (State management)
│   ├── types/        (TypeScript types)
│   └── middleware.ts (Auth middleware)
├── public/           (Static assets)
└── SYSTEM_ARCHITECTURE_V3.md (Original monolithic file - kept intact)
```

---

## 📖 Reading Guide

Each documentation file is **standalone** and contains complete, unmodified information from the original architecture file. You can:

1. **Read individually** - Each file has all necessary context
2. **Use with Claude Code** - Provide only the files relevant to your task
3. **Reference together** - Cross-references between files help navigate

---

## 🎓 Latest Technologies (May 2026)

- **Next.js 14+** - App Router, Turbopack, Server Components
- **React 18+** - Concurrent rendering, Suspense, useTransition
- **TypeScript 5+** - Const generics, decorators, better type inference
- **Tailwind CSS v4+** - Zero config, CSS-first customization
- **Firebase v11+** - Modular SDK, better tree-shaking
- **MongoDB Atlas** - ACID transactions, Change Streams

---

## 🤝 Contributing

When implementing features:
1. Check relevant documentation file
2. Follow patterns shown in code examples
3. Maintain security best practices from [09-SECURITY.md](./09-SECURITY.md)
4. Test against scalability guidelines in [11-SCALABILITY-CACHING.md](./11-SCALABILITY-CACHING.md)

---

**Status:** ✅ Production Ready | **Version:** 3.1 | **Last Updated:** May 2026
