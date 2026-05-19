# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start dev server (Turbopack enabled)
npm run build     # Production build
npm run start     # Run production server
npm run lint      # ESLint (v9 flat config)
```

No test runner is configured yet. TypeScript type-checking: `npx tsc --noEmit`.

## Architecture

Single Next.js 16 full-stack app with three user roles: **Painters** (submit work), **Owners/Contractors** (manage jobs, approve submissions, generate files), **Admins** (system oversight).

```
Frontend (React 19 + Zustand + RTK Query) → API Routes (Next.js) → MongoDB + External Services
```

External services: MongoDB Atlas (DB), Cloudinary (image CDN + watermarking), Cloudflare R2 (file storage), Upstash Redis + Bull (background job queue), Firebase FCM (push notifications), Resend (email).

## Source Layout

`src/app/` holds **only** pages, layouts, and API routes. All other code lives outside it:

| Folder | Purpose |
|---|---|
| `src/components/` | Reusable UI (`ui/`, `forms/`, `common/`, `dashboards/`, `photos/`) |
| `src/hooks/` | Custom hooks (`useAuth`, `useJob`, `useFCM`, `useAppDispatch`) |
| `src/store/` | Zustand auth store + RTK store + RTK Query API slices |
| `src/lib/` | Services and utilities (`auth`, `validators`, `rbac`, `cloudinary`, `firebase-fcm`, `utils`) |
| `src/types/` | TypeScript types (`auth`, `job`, `submission`, `file`, `company`, `notification`) |
| `src/middleware.ts` | Auth middleware (JWT + RBAC) |

Route groups in `src/app/`: `(auth)/`, `(painter)/`, `(owner)/`, `(admin)/`, `api/`.

## State Management

- **Zustand** (`src/store/authStore.ts`) — persisted auth state: `user`, `token`, `role`, `isAuthenticated`
- **Redux Toolkit** (`src/store/index.ts`) — app state slices: `jobs`, `submissions`, `files`, `notifications`
- **RTK Query** (`src/store/api/`) — server state with caching for all API calls

## Key Conventions

- Always use `@/` path alias for imports (maps to `src/`). Never use relative `../` imports.
- Tailwind CSS v4 — no `tailwind.config.js` needed; configured via `@import "tailwindcss"` in `globals.css`.
- React Compiler is enabled (`reactCompiler: true` in `next.config.ts`) — no manual `useMemo`/`useCallback`.
- Validate all API inputs with Zod schemas from `src/lib/validators.ts`.
- All API routes must enforce RBAC via the middleware or explicit role checks using `src/lib/rbac.ts`.

## Deep-Dive Docs

Detailed specs live in `docs/README.md`, it has links to the following files that has more details about specific parts:

- `docs/04-BACKEND-ARCHITECTURE.md` — service implementations (auth, submissions, file generation, watermarking)
- `docs/05-DATABASE-SCHEMA.md` — MongoDB collections and indexes
- `docs/06-API-SPECIFICATION.md` — full REST API reference
- `docs/09-SECURITY.md` — JWT, rate limiting, CORS, file upload validation
- `docs/11-SCALABILITY-CACHING.md` — pagination, Bull queues, Redis/RTK caching strategies
- `docs/12-IMPLEMENTATION-ROADMAP.md` — phase-by-phase build plan
