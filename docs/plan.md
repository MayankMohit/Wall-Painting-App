# Analytics Dashboard — Wall-Painting App (Wallo)

> Single source of truth for the analytics dashboard work. (Replaces the prior
> security-audit content; those findings H-1/H-2/H-3 and M-1…M-4 were implemented
> earlier — see git history.)

## Context

For the hackathon panel we need a surface that shows "every possible info about the
whole system." The valuable data (jobs, submissions, approval rates, storage,
BullMQ health, audit activity, invites, notifications) already lives in MongoDB +
Redis and is aggregation-ready. No third-party web-analytics tool can see it.

**Confirmed decisions:** admin god-view only · Recharts · **real data only** (no seed;
onboarding real painters/owners over ~1 week) · **in-app only, no PostHog**.

## Relationship to the EXISTING admin dashboard (important — no duplication)

`src/app/admin/dashboard/page.tsx` is a **live operational snapshot**: 4 count tiles
(users/jobs/submissions/storage), Mongo/Redis health chips, background-queue rows,
pending-owner approvals, quick links. It has **no charts, no history, no trends**.

The new **Analytics** page is the complementary **"over time + analysis"** layer:
trends, distributions, funnels, leaderboards, turnaround, activity. It must NOT
re-show the same plain snapshot counts — its KPIs are *analytical* (rates, deltas,
averages) and every block is a chart. The two link to each other (Dashboard = "now &
act", Analytics = "understand the story"). Reuse the dashboard's building blocks:
`authHeaders()`, `StatTile`, `SectionLabel`, `QueueRow`, `Avatar`, `fmtGB`,
`src/components/admin/icons.tsx`, and the mobile/desktop split + design tokens.

## Behavior analytics come from AuditLog (no third-party tool)

**Decided: build in-app only — no PostHog.** `AuditLog` (`src/lib/models/AuditLog.ts`)
already records behavioral events (`AUTH_LOGIN`, `SUBMISSION_CREATE`, …) with `userId`,
`role`, `timestamp` (90-day TTL), so activity trends, logins-per-day, and the
invite→login→first-submission funnel are all self-buildable from our own data. PostHog
would only add session recordings / heatmaps / no-code retention and a second screen to
present — deferred as a possible future add-on, out of scope here.

---

## Non-disruption guarantees (existing workflows stay intact)

This feature is **additive**. Verified against the real code (React 19.2.4, Next 16.2.6,
React Compiler on):

**Zero-risk (new files, nothing else imports them):**
- New API route `/api/admin/analytics` is **read-only** — only `$group`/`$match`
  aggregations, `getJobCounts`, `getOwnerStorageBytes`. No writes/updates/deletes, so it
  cannot mutate data or affect any other endpoint.
- New page `/admin/analytics` + `TrendTile`/`ChartCard` are new files.
- The page uses plain `fetch` + `authHeaders` (like every other admin page), **not RTK
  Query** — so it never touches the RTK cache/tags that jobs/submissions/notifications
  rely on. No shared client state is mutated.
- New audit action `ADMIN_ANALYTICS_VIEW`: `AuditLog.action` is a free-form `String`
  (no enum), so no schema/validator change and existing audit writes are unaffected.

**Small in-place additions (append-only, existing entries untouched):**
- `src/components/admin/icons.tsx`: add one new icon export (e.g. `BarChart`).
- `src/app/admin/layout.tsx`: append one `NavItem` to both `SIDEBAR_LINKS` and
  `BOTTOM_TABS` (**confirmed: 5-tab mobile bar**). The sidebar `nav` is
  `flex-1 overflow-y-auto` (no overflow); the mobile bar goes 4→5 tabs, each `flex-1` so
  they get slightly narrower — the only visible change to existing UI, and accepted. SSE
  stream, notifications, logout, auth in that file are untouched.
- `package.json`: add `recharts@^3` only (v3 officially supports React 19). No existing
  package versions change. React Compiler compiles app code only (node_modules excluded),
  so recharts is unaffected. recharts renders inline SVG in a client component; the
  production CSP already allows `style-src 'unsafe-inline'` and needs no remote origins,
  so **the CSP added earlier will not block charts**. recharts is imported only by the
  analytics route → it lands in that route's chunk, not the global/other bundles.

**Untouched entirely:** auth/RBAC/middleware pipeline, models & schemas, validators,
every existing route, workers/queues (read-only `getJobCounts`), storage logic,
notifications, and the existing dashboard/stats endpoints.

**Rollback:** delete the 4 new files + revert the 3 append-only edits → exact prior state.

---

## Part 1 — API: `src/app/api/admin/analytics/route.ts` (new)

Exact admin pattern from `src/app/api/admin/stats/route.ts`:
`export const GET = withRole(['admin'], { audit: 'ADMIN_ANALYTICS_VIEW' })(handler)`,
`connectDB()`, respond via `ok(...)` (`{ data }` envelope). Accept `?range=7d|30d|90d|all`
→ a `from` Date fed into `$match` on `createdAt`/`timestamp`/`submittedAt`. One endpoint,
all sections via `Promise.all` (~20 small indexed aggregations; DB is tiny, so **no Redis
cache** — cut for simplicity). Refinements from code-grounding:

- **AuditLog only holds non-GET (state-changing) requests** — the pipeline skips audit
  writes for GETs (`src/lib/middleware/index.ts`). So activity charts are "actions", not
  "API requests"; failures ARE logged (statusCode ≥ 400) which enables success-vs-failed
  login series. The `audit: 'ADMIN_ANALYTICS_VIEW'` tag is declared for convention but
  never lands (GET).
- All day/hour bucketing uses `timezone: 'Asia/Kolkata'` in `$dateToString`/`$hour`/
  `$dayOfWeek` so buckets match the user's local days; day series are zero-filled
  server-side so sparse data doesn't render broken areas.
- Per-owner storage = **one** aggregation (GeneratedFile `$match status:'ready'` →
  `$lookup` jobs → group by `ownerId`), not N× `getOwnerStorageBytes`. Import
  `STORAGE_LIMIT_BYTES` for quota %.
- Queue counts: `queue.getJobCounts(...).catch(() => ({}))` per queue (same best-effort
  pattern as admin/stats — there is no `getJobCounts` helper in `src/lib/queues.ts`).
- Invite "claimed" = `lastUsedAt != null`; also count revoked and expired-unclaimed.
- Approval rate = approved / (approved + rejected) (decided only). Turnaround =
  `$dateDiff(submittedAt → approvedAt)`; buckets <1h / 1–4h / 4–12h / 12–24h / 1–3d / >3d.
- KPI deltas: current range vs the prior equal-length window (null when `range=all`).

Returned sections (all from real models — see exploration inventory): growth series,
submission pipeline + approval rate + avg turnaround (`approvedAt - submittedAt`), job
status + duration, painter/owner leaderboards, storage/downloads by type + per-owner
quota, queue health, audit activity (by day / category / role / error-rate), logins &
active-user series, invite funnel, notification read-rate, activity heatmap (hour×weekday
from `AuditLog.timestamp`).

## Part 2 — Charts (explicit mapping → Recharts component)

On-brand palette from `globals.css` — but **hardcoded oklch strings** in the page
(`oklch(0.68 0.185 50)` accent, `oklch(0.48 0.12 150)` approved, `oklch(0.55 0.17 25)`
rejected, `oklch(0.5 0.12 240)` info, `oklch(0.62 0.025 80)` pending): SVG presentation
attributes can't resolve `var()`, and the dashboard already inlines oklch values as
precedent. Tooltips (HTML) keep using CSS vars. Every chart wrapped in
`ResponsiveContainer` + a graceful empty state (data is sparse early). recharts **3.9.1**
(peer-supports React 19).

| # | Metric | Chart (Recharts) |
|---|--------|------------------|
| 1 | Platform growth: new users(by role)/jobs/submissions per day | `AreaChart` (stacked, multi-series) |
| 2 | Submission pipeline: created → approved / rejected | `FunnelChart` |
| 3 | Submission status split | `PieChart` donut (`innerRadius`) |
| 4 | Approval rate % | `RadialBarChart` gauge + KPI |
| 5 | Approval turnaround distribution (hrs buckets) | `BarChart` (histogram) |
| 6 | Job status distribution | `PieChart` donut |
| 7 | Jobs created vs completed over time | `LineChart` (2 series) |
| 8 | Top painters by approved submissions | horizontal `BarChart` + `Avatar` labels |
| 9 | Top owners by jobs/submissions/storage | horizontal `BarChart` |
| 10 | Storage by fileType | `BarChart` (stacked) |
| 11 | Per-owner storage vs 200 MB quota | hand-rolled progress bars (existing pattern) |
| 12 | File-gen success vs failed | `PieChart` donut + rate |
| 13 | Downloads by fileType | `BarChart` |
| 14 | Actions per day (total + failed overlay; AuditLog = non-GET only) | `AreaChart` |
| 15 | Actions by category (AUTH/JOB/SUBMISSION/… totals — readable over stacked-by-day) | horizontal `BarChart` |
| 16 | Logins per day: **success vs failed** (AUTH_LOGIN\|_OTP\|_INVITE, statusCode split) | `LineChart` (2 series) |
| 17 | Failed-action rate (statusCode ≥ 400 share of audited actions) | folded into #14 overlay |
| 18 | Invite funnel: issued → claimed | `FunnelChart` + acceptance KPI |
| 19 | Notification read-rate (7-day window, labeled) | `PieChart` donut + KPI |
| 20 | Activity heatmap (hour × weekday) | hand-rolled CSS grid (Recharts has none) |
| 21 | Queue health snapshot | mini count rows + link to Task Queue (`QueueRow` is local to dashboard/page.tsx, not exported — small local copy instead) |

## Part 3 — Page UI: `src/app/admin/analytics/page.tsx` (new, APP-NATIVE)

Match the Wallo look exactly — same **mobile sticky top-bar + desktop header** split as
`dashboard/page.tsx`; `'use client'`, plain `fetch('/api/admin/analytics?range=…')` with
`authHeaders()`; range selector (7d/30d/90d/All) + Refresh styled like the dashboard's
header controls. Cards: `bg-(--surface) border border-(--border) rounded-(--r-md) p-5
shadow-(--shadow-sm)`, `SectionLabel` headers, mono numerals, accent/status colors —
**not** a generic BI theme.

Layout (top → bottom):
1. **Analytical KPI row** — new `TrendTile` (StatTile-styled: accent top-border, mono
   value, but with a delta arrow + tiny sparkline instead of a nav link): Approval rate,
   Avg turnaround, New painters (this range, ▲/▼ vs prior), Active painters (7d).
2. **Platform growth** — full-width area chart (#1).
3. Two-col: **Submission funnel** (#2) · **Job status donut** (#6).
4. Two-col: **Top painters** (#8, Avatars) · **Top owners** (#9).
5. Two-col: **Storage by type + quota bars** (#10/#11) · **Downloads / file-gen** (#12/#13).
6. **Activity** — audit-per-day area (#14) + category stacked bar (#15) + logins line (#16).
7. Two-col: **Invite funnel** (#18) · **Notification read-rate** (#19).
8. **Activity heatmap** (#20) — signature "wow" block.
9. Footer link to `/admin/background-jobs` for live queue detail (reuse, no dup).

New small reusable pieces: `src/components/admin/TrendTile.tsx` and
`src/components/admin/ChartCard.tsx` (title + `SectionLabel` + `ResponsiveContainer`
wrapper) so every chart is consistent and app-styled.

## Part 4 — Navigation: `src/app/admin/layout.tsx`

Add an **Analytics** entry (chart icon; add to `src/components/admin/icons.tsx` if
missing) to the desktop sidebar links and mobile bottom tabs, `href:'/admin/analytics'`,
active on `pathname.startsWith('/admin/analytics')` — matching existing link objects.

---

## Files

**Create:** `src/app/api/admin/analytics/route.ts`, `src/app/admin/analytics/page.tsx`,
`src/components/admin/TrendTile.tsx`, `src/components/admin/ChartCard.tsx`.
**Modify:** `src/app/admin/layout.tsx` (nav), `src/components/admin/icons.tsx` (chart icon),
`package.json` (recharts).
**Reuse unchanged:** `withRole`/`ok`/`connectDB`, `src/lib/models/*`, `src/lib/storage.ts`,
`src/lib/queues.ts`, dashboard helpers/components.

## Verification

1. **API:** admin `GET /api/admin/analytics?range=30d` → 200 all sections; owner/painter → 403;
   spot-check a couple aggregates vs `/api/admin/stats`. (No audit-row check — GETs are not audited.)
2. **Page:** `/admin/analytics` renders KPI row + every chart; toggling range refetches; empty
   states show on a near-empty range; nav link appears/highlights (desktop + mobile); looks
   on-brand next to the existing dashboard.
3. **Perf:** loads in ~1–2 s on demo DB; enable 60 s Redis cache if not.
4. `npx tsc --noEmit` + `npm run lint` clean on new/changed files.
