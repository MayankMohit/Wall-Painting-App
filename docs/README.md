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

8. **[07-NOTIFICATIONS.md](./07-NOTIFICATIONS.md)** - Push and email notifications
   - Firebase Cloud Messaging setup
   - Email notifications with Resend
   - Notification flow and types

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
→ Read [07-NOTIFICATIONS.md](./07-NOTIFICATIONS.md)

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


