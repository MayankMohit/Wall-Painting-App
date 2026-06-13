# Plan — Remove Phone Verification, WhatsApp Invite Flow & Painter-wise Excel

> Status: **Phase A done · §8 done · Phase B done (foundation + APIs + frontend) · Phase C next** · Last updated: 2026-06-13
>
> Replaces Firebase phone OTP (blocked in production by the Spark plan's 10 SMS/day
> limit) and implements the hackathon panel's feedback: a WhatsApp-first onboarding
> flow where owners provision painter accounts and share login links over WhatsApp,
> so painters never go through a manual signup. Also adds a second, painter-wise
> Excel export per job (§8), independent of the auth work.

---

## 1. Background

**Problem 1 — Phone OTP is broken in production.** Phone verification uses Firebase
Phone Auth, which only sends real SMS on the Blaze plan. On Spark, real numbers are
capped at 10 SMS/day — unusable. Test numbers worked in dev, masking this.

**Problem 2 — Painter signup friction.** Painters are WhatsApp-first users. The
current flow (self-signup with email + phone + password + two OTP verifications)
is a major adoption barrier. Panel feedback: let the owner share a unique login
link per painter over WhatsApp, removing signup entirely.

**Solution overview:**

- **Phase A** — Rip out Firebase phone verification everywhere. Ships immediately,
  unblocks production.
- **Phase B** — Owner-provisioned painter accounts + per-painter invite links +
  public claim page that logs the painter straight into the job, plus the
  painter account upgrade (set email/password) so they can also log in normally.
- **Phase C** — Invite management polish (batch resend, unclaimed banner) and
  Firebase env cleanup.
- **Painter-wise Excel (§8)** — a second Excel export type where the job's data is
  grouped into one section per painter, each with its own area total. Independent
  of Phases A–C; can be built in parallel.

---

## 2. Decision Record

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Painter login credential | **Magic link** (token in URL is the credential) | Panel suggested link + OTP *in the same WhatsApp message* — but if both travel together, the OTP adds no security, only typing. Email OTP (original idea) adds a second channel painters rarely check, and requires the owner to know each painter's real email — the same friction we are removing. The claim endpoint is designed so an email-OTP step can be added later if abuse appears (see §7.4). |
| D2 | Invite token reuse | **Multi-use until expiry/revocation** | The link doubles as the painter's login. Single-use breaks "open on another device" and "session expired" cases. Mitigated by expiry + revocation + regeneration. |
| D3 | Invite token lifetime | **30 days, renewable** | WhatsApp messages persist for months; a short TTL guarantees dead links. Resend regenerates the token and invalidates the old one. |
| D4 | Invite token storage | **MongoDB (hashed), not Redis** | Tokens must be listable, revocable from the owner UI, and outlive a cache. Store SHA-256 of the token so a DB leak does not leak login links. |
| D5 | `User.email` | **Optional, sparse unique index** | Owner usually knows the painter's phone, not email. Email becomes optional painter metadata, addable later (Phase C). |
| D6 | `User.password` | **Optional** | Provisioned painters have no password. They can set one later (Phase C). Login route must reject password login for password-less accounts. |
| D7 | Phone uniqueness | **Keep unique, unverified** | Phone is now the painter's primary identity, entered by the owner. A conflict on create means the painter already exists → offer "add existing painter to job" instead. |
| D8 | wwebjs WhatsApp data sink (panel idea) | **Out of scope** | Unofficial library, account-ban risk, requires a persistent browser session on the VM. The invite flow needs zero WhatsApp infrastructure (`wa.me` deep links only). Revisit only if painter adoption stalls after Phase C. |

---

## 3. Phase A — Remove Firebase Phone Verification

Independent of Phases B/C. Small, ships first, fixes production today.

### 3.1 File-by-file changes

| File | Change |
|---|---|
| `src/app/(auth)/register/page.tsx` | Remove all phone-OTP state (`confirmationResult`, `firebaseIdToken`, `phoneOtpInput`, `showPhoneOtp`, `phoneSending`, `phoneConfirming`), the `RecaptchaVerifier` ref + `recaptcha-container` div, `handleSendPhoneOtp` / `confirmPhoneOtp` / `handlePhoneOtpChange`, and the Firebase imports. Phone becomes a plain required field (label: "Phone", keep the E.164 hint). `canSubmit` drops `phoneVerified`. `registerUser` call drops `firebaseIdToken`. |
| `src/app/(auth)/login/page.tsx` | OTP tab becomes email-only. Remove Firebase imports, `RecaptchaVerifier`, `confirmationResult`, the phone branch in `handleSendOtp` / `confirmOtp`, and the `recaptcha-container` div. If the identifier is not an email on the OTP tab, show "One-time codes are sent by email — enter your email address" instead of attempting send. Password login by phone still works (unchanged). |
| `src/app/api/auth/register/route.ts` | Remove `admin.auth().verifyIdToken(...)` block and `firebase-admin` import. `firebaseIdToken` no longer read from body. |
| `src/app/api/auth/login/otp/phone/route.ts` | **Delete the route directory** (`otp/phone/`). |
| `src/store/authStore.ts` | Remove `loginWithPhoneOtp` from the interface and implementation. `registerUser` signature drops `firebaseIdToken`. |
| `src/lib/validators.ts` | `RegisterSchema`: drop `firebaseIdToken`. Delete `LoginOtpPhoneSchema`. |
| `src/lib/firebase-client.ts` | Keep the file (`firebase-fcm.ts` imports `firebaseApp` for push). Remove the `firebaseAuth` / `getAuth` export. |
| `src/lib/firebase-admin.ts` | Keep — still used by `src/lib/fcm.ts` for server-side push. |
| `src/lib/errors.ts` | Remove phone-verification-specific error codes if any are now unused. |

### 3.2 Behavioural notes

- Self-registration stays available for **owners and painters — permanently**.
  Owner-provisioning (Phase B) becomes the primary painter path, but manual
  painter signup remains a supported secondary path (unverified phone, no demotion
  or hiding). Owner registration still requires email OTP — that flow is untouched.
- Phone numbers are now stored **unverified**. Risk: a typo'd or squatted number.
  Accepted: stakes are low, admins can edit users, and Phase B makes the owner
  the source of truth for painter phones anyway.
- Audit event `AUTH_LOGIN_PHONE` becomes unused — leave historical log entries,
  remove the emit site with the route.

### 3.3 Acceptance criteria

- [ ] `npx tsc --noEmit` and `npm run lint` pass.
- [ ] Painter and owner can register in production without any SMS.
- [ ] Email-OTP login works; phone+password login works.
- [ ] No remaining imports of `firebase/auth` anywhere in `src/`.
- [ ] FCM push notifications still work (uses `firebaseApp` + `firebase-admin`).

---

## 4. Phase B — Owner-Provisioned Painters & Invite Links

### 4.1 Flow (end to end)

```
Owner (job page)                                Painter (WhatsApp)
─────────────────                               ──────────────────
1. "Add painter" → search list
2. Not found → "Create painter" (bottom of list)
3. Enters name + phone only → one "Create & add" button:
     POST /api/users/painters  ──► creates User (role painter, no password)
     POST /api/jobs/[jobId]/painters ──► adds painter to THIS job
4. Taps "Share link" (per painter, in the job's painter list or detail page):
     POST /api/jobs/[jobId]/invites ──► Invite { tokenHash, painterId, jobId }
5. Gets wa.me deep link with prefilled
   message containing https://app/join/<token>
6. Taps link → WhatsApp opens → sends     ──►  7. Painter taps /join/<token>
                                               8. Auto-claims on load (POST) — no
                                                  confirmation page shown
                                               9. JWT issued (normal signToken payload)
                                              10. Redirect → that invite's job page
```

Step 3 creates the account **and** adds the painter to the current job in one
click (symmetric with tapping an existing search result). Job membership is
**always** the owner's action — tapping the link never adds the painter to a
job, it only logs them in and drops them into the job the invite was made for.
Existing painters skip step 3 (invite can be generated for any painter already
on the job).

### 4.2 Database changes

**`src/lib/models/User.ts`**

```ts
email:    { type: String, unique: true, sparse: true, lowercase: true, trim: true }, // was required
password: { type: String },                                                          // was required
```

- Migration: drop the old `email_1` unique index and recreate it sparse
  (one-off script in `scripts/`, or let Mongoose autoIndex handle it in dev and
  run `db.users.dropIndex('email_1')` manually on Atlas before deploy).
- `src/store/authStore.ts` `User` interface: `email` becomes `string | null`.
  Audit every UI render of `user.email` (profile pages, `PersonalInfoCard`,
  admin user pages) for null-safety — show "No email" placeholder.

**New model `src/lib/models/Invite.ts`**

```ts
interface IInvite {
  _id: Types.ObjectId;
  tokenHash: string;          // sha256(token) — raw token is never stored
  painterId: Types.ObjectId;  // ref User
  jobId: Types.ObjectId;      // ref Job
  ownerId: Types.ObjectId;    // ref User (creator, for listing/audit)
  status: 'active' | 'revoked';
  expiresAt: Date;            // now + 30 days
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
// Indexes: { tokenHash: 1 } unique; { jobId: 1, painterId: 1 }; { ownerId: 1, status: 1 }
```

Token: `crypto.randomBytes(32).toString('base64url')` (~256 bits). Raw token
appears only in the API response and the WhatsApp message.

### 4.3 New API routes

All wrapped in the existing middleware stack (`withMiddleware` / `withRole`,
Zod validation, rate limit, audit).

**`POST /api/users/painters`** — `withRole(['owner', 'admin'])`

- Body: `{ name, phone, email? }` (`CreatePainterSchema`: name min 1, phone
  `PhoneRegex`, email optional).
- Creates `User { role: 'painter', status: 'active', emailVerified: false }` —
  no password.
- **409 on phone conflict** with payload `{ existingPainter: { _id, name, phone } }`
  so the UI can offer "Add existing painter instead". If the conflicting user is
  not a painter, return a plain 409 without leaking details.
- Audit: `PAINTER_PROVISIONED`.

**`POST /api/jobs/[jobId]/invites`** — `withRole(['owner', 'admin'], { access: requireJobOwner })`

- Body: `{ painterId }`. Validates the painter is in `job.painters` (assign first
  via the existing `POST /api/jobs/[jobId]/painters`, or do both in one client call).
- Revokes any previous active invite for the same `(jobId, painterId)`, creates a
  new one, returns:

  ```json
  { "url": "https://app/join/<token>",
    "waLink": "https://wa.me/<phone>?text=<urlencoded message>",
    "expiresAt": "..." }
  ```

- Message template (also used by the copy button):
  > Hi <painter name>! <owner name> added you to the job "<company>" on Wallo.
  > Tap to open your dashboard and upload your work: https://app/join/<token>
- Audit: `INVITE_CREATED`. Same route with `DELETE` (body `{ painterId }`)
  revokes — audit `INVITE_REVOKED`.

**`POST /api/auth/invite/claim`** — public, `rateLimit: 'strict'` keyed by IP

- Body: `{ token }`. Hash → look up Invite → checks, in order:
  1. exists and `status === 'active'` → else 410 `INVITE_INVALID`
     ("Ask your contractor to send a new link").
  2. `expiresAt > now` → else 410 `INVITE_EXPIRED` (same user-facing message).
  3. Painter exists and `status !== 'suspended'` → else 403 `ACCOUNT_DISABLED`.
- On success: set `lastUsedAt`, issue the standard JWT via
  `signToken({ userId, role: 'painter', name })`, return the same
  `{ token, user }` shape as the other login routes (so `authStore` logic is
  reused), **plus `{ jobId }`** so the claim page redirects straight into that
  job.
- Audit: `AUTH_LOGIN_INVITE`.

> **No `resolve` preview endpoint.** Earlier drafts had a `GET .../resolve` to
> render a "Joining \<company\> as \<name\>" greeting. We dropped the greeting
> entirely (see §4.5), so there is no preview endpoint. The WhatsApp
> link-preview bot only GETs the page HTML and never runs the client-side claim
> POST, so it can't consume an invite; multi-use makes an accidental claim
> harmless anyway.

### 4.4 Login route guard (password-less accounts)

`src/app/api/auth/login/route.ts` — before `comparePassword`:

```ts
if (!user.password) ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid credentials');
```

(bcrypt against `undefined` would throw; identical error message avoids
account-state enumeration.) Same guard in any other password-checking route
(`change-email/send` takes a password — check it too).

### 4.5 New page — `src/app/join/[token]/page.tsx`

Public route (no auth middleware). Client component. **No confirmation screen** —
the painter taps the WhatsApp link and lands in the job; nothing to read or click.

1. On mount: show a brief loading state, then `POST /api/auth/invite/claim` via a
   new `authStore.loginWithInvite(token)` action (mirrors `loginWithEmailOtp`:
   `persistAuth`, `scheduleRefresh`, set user).
2. On success: `router.replace('/painter/jobs/<jobId>')` (the invite's job, from
   the claim response) — not the dashboard.
3. On failure: friendly full-page error states for expired/revoked/disabled
   ("Ask your contractor to send a new link"). This is the only UI the painter
   ever sees on this route, and only when something is wrong.
4. If already authenticated as the **same** painter, skip the claim and redirect
   straight to the job. If authenticated as **someone else**, log out first, then
   claim.

Auto-claiming on load (rather than behind a Continue button) is safe: the
WhatsApp preview bot GETs the HTML but never runs the claim POST, and the invite
is multi-use so a re-open just re-logs-in.

### 4.6 Owner UI changes

**`src/components/owner/AddPainterModal.tsx`** — a single search list (no tabs):

- Type to search the owner's scoped painters (by name or phone). Matches render
  at the top; **a "＋ Create new painter" row is always pinned at the bottom of
  the list** (so it's available whether or not the search matched anyone).
- Tapping an existing match adds them to the job (current behaviour).
- Tapping "Create new painter" opens an inline **name + phone** form (no email
  field — painters set email themselves later, §4.10). One **"Create & add"**
  button does `POST /api/users/painters` → `POST /api/jobs/[jobId]/painters` in
  a single action, then returns to the painter list with a per-row **"Share
  link"** button for the new painter.
- **Name collision is allowed** — if the typed name matches existing painters,
  show them as suggestions above the create form ("Did you mean…?") so the owner
  can pick the real one instead of duplicating, but creation still proceeds.
- **Phone collision blocks creation** — `POST /api/users/painters` returns 409
  with the existing painter; the form renders that painter inline with an
  **"Add to job"** button instead of creating a duplicate. (Non-painter
  conflict → plain 409, no details leaked.)

**Invite sharing** lives wherever a painter appears on a job, as a per-painter
button (not bundled into creation):

- **`src/app/owner/jobs/[jobId]/painters/page.tsx`** — each painter row gets an
  invite-status chip (active / expired / none, from a small
  `GET /api/jobs/[jobId]/invites` list endpoint or embedded in the painters
  aggregate) and a **"Share link"** action (creates/regenerates the invite,
  shows the **"Open WhatsApp"** + **"Copy message"** buttons), plus **"Revoke"**.
- **`src/app/owner/jobs/[jobId]/painters/[pid]/page.tsx`** (painter detail) — the
  **same "Share link" / status / revoke** controls for that one painter.

**RTK Query** — new endpoints in `src/store/api/endpoints/painters.ts`
(`createPainter`) and `jobs.ts` (`createInvite`, `revokeInvite`), with cache
invalidation on the job painters list.

### 4.7 Scoping fix — REVERTED (2026-06-13, owner's decision)

Originally scoped `GET /api/users` so owners saw only painters in their own jobs
(`Job.distinct('painters', { ownerId })` → `$in`). **Reverted** at the owner's
request: it hid pre-existing/self-registered painters from the Add-painter search,
breaking the "add an existing painter" workflow. Owners now see **all** painters
again (pre-Phase-B behaviour). Trade-off accepted: this app is treated as a shared
painter pool, not multi-tenant with cross-contractor privacy. Revisit only if it
becomes genuinely multi-tenant.

### 4.8 Security summary

| Threat | Mitigation |
|---|---|
| Token brute force | 256-bit random token; `strict` rate limit on claim; tokens hashed at rest |
| Forwarded link = stolen session | Accepted for this threat model (painter uploads photos to one job). Owner-side revoke + 30-day expiry + regenerate-on-resend bound the exposure. JWT expiry/refresh unchanged. |
| Link-preview bots consuming invites | Claim is a client-side POST run on page load; the preview bot only GETs the HTML and never executes it. Multi-use makes an accidental claim harmless. |
| DB leak leaks login links | Only SHA-256 hashes stored |
| Owner A invites painter of owner B | Invites require `requireJobOwner` on the job; painter accounts are global but the invite only grants login + that painter's own existing access |
| Suspended painter uses old link | Claim re-checks `user.status` on every use |

### 4.10 Painter account upgrade — set email + password (pulled into Phase B)

A painter created by an owner has **no email and no password**, so they can only
get in via the invite link. Phase B gives them a way to upgrade so normal login
works too (originally Phase C; moved up so provisioned painters aren't link-only).

- **Painter profile page** gets **"Add email"** (reuses the existing
  verify-email OTP flow → sets `email` + `emailVerified`) and **"Set password"**
  (no current-password check when `user.password` is unset; `ChangePasswordSchema`).
- Until both are set, password login stays rejected by the §4.4 guard. Once set,
  phone/email + password login works **alongside** the still-valid invite link.
- This is independent of the invite mechanics — a painter can upgrade anytime,
  and self-registered painters already have email+password from signup.

### 4.11 Acceptance criteria

- [ ] Owner can create a painter with just name + phone via the "Create & add"
      button, share a wa.me link, and the painter logs in by tapping it — zero
      typing for the painter, landing directly in that job (no confirmation page).
- [ ] Re-opening the same link within 30 days logs in again; after revoke/resend
      the old link shows the "ask your contractor" screen.
- [ ] Phone conflict on create surfaces the existing painter with one-tap add;
      name collisions are allowed and surface "did you mean…" suggestions.
- [ ] "Share link" is available per-painter in both the job painter list and the
      painter detail page.
- [ ] A provisioned painter can set email + password from their profile, after
      which normal login works; before that, password login is rejected.
- [ ] Password login is impossible for password-less painters but still works for
      everyone else; `tsc` + lint clean; profile/admin pages render null-email users.
- [x] ~~Owners no longer see painters outside their own jobs.~~ **Reverted (§4.7)** — owners see all painters (shared pool).
- [ ] Painter self-registration (`/register`) still works, unverified, as a
      secondary path.

---

## 5. Phase C — Polish

> Painter profile upgrade (set email/password) moved into Phase B — see §4.10.
> Painter self-signup is **kept permanently** as a secondary path (no demotion).

1. **Invite management UX** — batch "resend all", and a banner on the job page
   when painters haven't claimed yet (`lastUsedAt === null`).
2. **Cleanup** — remove unused Firebase env vars from deploy config **except** the
   FCM ones (`NEXT_PUBLIC_FIREBASE_*` and the admin credentials are still needed
   for push).

---

## 6. Rollout Sequence

| Step | What | Risk |
|---|---|---|
| 1 | Phase A on a branch → deploy | Low — removes a broken path |
| 2 | Atlas: drop `email_1` index, recreate sparse (off-hours, fast) | Low — additive schema loosening |
| 3 | Phase B behind normal deploy (no flag needed — new routes/pages are additive) | Medium — new auth surface; watch audit logs for `AUTH_LOGIN_INVITE` anomalies |
| 4 | Pilot with 1–2 painters on an active job (per panel advice) before announcing broadly | — |
| 5 | Phase C iterations from pilot feedback | Low |
| — | Painter-wise Excel (§8) — independent, can ship any time alongside the above | Low — additive file type, no schema/auth impact beyond one enum value |

---

## 7. Open Questions & Future Options

1. **Job-scoped vs account-scoped invite sessions** — currently the claim issues a
   normal painter JWT (access to all their jobs). Fine today; if painters work for
   multiple competing owners later, consider job-scoped claims.
2. **`wa.me` without phone** — `https://wa.me/?text=...` (no number) lets the owner
   pick any chat, useful when the painter's WhatsApp number differs from the
   stored phone. Offer both buttons.
3. **Invite expiry length** — 30 days is a guess; make it an env var
   (`INVITE_TTL_DAYS`) and tune from pilot data.
4. **Optional email-OTP hardening (original proposal)** — if link forwarding ever
   becomes a real abuse problem *and* painters have verified emails by then, the
   claim page could re-introduce a confirmation step requiring an email OTP
   (`otp:invite:` Redis prefix, existing `sendOtpEmail`). This would mean bringing
   back a deliberate Continue screen (removed in §4.5), so it's a UX change, not
   just additive.
5. **wwebjs WhatsApp data sink** — parked per D8. Reconsider only if, after
   Phase C, painters still won't open the dashboard link.
6. **URL shortener for the invite link — out of scope.** Considered and dropped:
   the link *is* the login credential, so a short code would either lose the
   entropy that resists brute force or hand the credential to a third-party
   shortener. The full `wallo.cc/join/<token>` (~65 chars) renders fine as a
   WhatsApp tappable link. Revisit only if real links prove unwieldy.

---

## 8. Feature — Painter-wise Excel Export  ✅ DONE (2026-06-13)

Independent of Phases A–C. A second Excel file per job, alongside the existing
"Master List" export: the same approved-submission data, but grouped into **one
section per painter**, each section with the same columns as the current sheet
(S.NO., PHOTO NO., LOCATION, SIZE L×B, TOTAL) and its own **per-painter total
area**, plus a grand total for the job.

### 8.1 How it plugs into the existing pipeline

File generation already flows through one pipeline:

```
POST /api/jobs/[jobId]/files/generate  { types: [...] }
  → GeneratedFile doc (status: generating)
  → BullMQ fileGenQueue → workers/fileGenWorker.ts (switch on type)
  → buildExcel / buildPhotosPdf / buildFilePdf → R2 upload
  → GeneratedFile updated to ready → frontend polling picks it up
```

The new export is a **fourth file type, `excel_painters`**, reusing this pipeline
end to end. No new routes, no new queue, no schema migration beyond one enum value.

### 8.2 Workbook layout

Single worksheet **"Painter Wise"**:

```
Row 1   JOB NAME (merged A1:G1, same style as Master List)

        ── Summary block ─────────────────────────────
Row 3   PAINTER            | WALLS | TOTAL SQ. FT.
Row 4+  one row per painter, bold grand-total row last

        ── Section per painter (repeated) ────────────
        PAINTER: <NAME>           (merged, bold, light fill)
        S.NO. | PHOTO NO. | LOCATION | SIZE(L×B) | TOTAL   ← same columns as Master
        1..n  data rows (S.NO. restarts per painter)
        TOTAL SQ. FT. = <painter total>                    ← same style as Master total
        (one blank row between sections)

        ── Footer ────────────────────────────────────
        GRAND TOTAL SQ. FT. = <job total>
```

- The summary block at the top is what makes the file useful at a glance (the
  per-painter "total area painted" the owner actually wants); the sections below
  carry the full detail.
- Sorting: painters by name; rows within a section by `photoNo, submittedAt` —
  the existing query already sorts by `painterId, photoNo, submittedAt`, so
  grouping is a single pass.

### 8.3 File-by-file changes

| File | Change |
|---|---|
| `src/lib/models/GeneratedFile.ts` | Add `'excel_painters'` to the `fileType` enum + the `IGeneratedFile` union. |
| `workers/excelWorker.ts` | Add `buildPainterWiseExcel(jobId, header)` — same `Submission.find({ jobId, status: 'approved' })` query and `.populate('painterId', 'name')` as `buildExcel`, then delegate to the new layout. |
| `workers/layouts/painterExcelLayout.ts` | **New.** `buildPainterSections(wb, header, subs)` per §8.2. Extract the shared bits from `excelLayout.ts` (column widths, border/center helper, total-row styling) into a small shared helper module rather than copy-pasting — the two layouts must stay visually consistent. |
| `workers/fileGenWorker.ts` | Extend the `Payload['type']` union and add a `case 'excel_painters'` that calls `buildPainterWiseExcel` (same mime/ext as `excel`). |
| `src/app/api/jobs/[jobId]/files/generate/route.ts` | The route already accepts an arbitrary `types` array. Fix the extension line: `type === 'excel' ? 'xlsx' : 'pdf'` → `type.startsWith('excel') ? 'xlsx' : 'pdf'`. Optionally validate `types` against the known enum and 400 on unknown values (currently unvalidated — worth tightening while here). |
| `src/store/api/endpoints/files.ts` | Add `'excel_painters'` to the `fileType` union. |
| `src/app/owner/jobs/[jobId]/files/page.tsx` | Add `excel_painters` to `typeMeta` (label: "Excel · Painter-wise"), `FileFilter` union, `filterCounts`, and the filter pills. Change the two `fileType === 'excel'` checks (icon choice, Office-Online preview/sandbox) to `fileType.startsWith('excel')`. |
| `src/app/owner/jobs/[jobId]/page.tsx` (generate dialog) | Add a "Painter-wise Excel" checkbox next to the existing Excel/PDF options; it pushes `'excel_painters'` into the `types` array. |

### 8.4 Edge cases

- **Painter deleted after submitting** — `populate` returns `null`; group those
  rows under "Unknown painter" instead of crashing (the master layout currently
  assumes `sub.painterId.name` exists — guard in the new layout, and fix the
  master while touching shared code).
- **Painter on the job with zero approved submissions** — listed in the summary
  block with total 0 (the owner wants to see who hasn't produced), but no detail
  section. Requires also loading `job.painters` names, one extra query.
- **No approved submissions at all** — generate an empty workbook with headers
  and a zero grand total (same behaviour as the current master export).
- **`pdf_file` reuse** — `buildFilePdf` consumes `buildExcel(...).rows`; the new
  type does not touch that path.

### 8.5 Acceptance criteria

- [ ] Owner can select "Painter-wise Excel" in the generate dialog, alone or
      together with the other types, and the file appears in the files list with
      its own label/filter once ready.
- [ ] Each painter's section total equals the sum of their rows; the grand total
      equals the Master List grand total for the same job (cross-check on a job
      with 2+ painters).
- [ ] Deleted-painter and zero-submission cases render per §8.4 without worker
      failures.
- [ ] Existing `excel`, `pdf_photos`, `pdf_file` generation is unaffected;
      preview/download/delete work for the new type; `tsc` + lint clean.
