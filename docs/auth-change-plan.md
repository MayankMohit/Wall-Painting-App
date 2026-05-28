# Auth Changes — Implementation Plan

---

## Progress Tracker

### Phase Status

| Phase | Description | Status |
|---|---|---|
| 0 | Environment & service setup | ✅ Done |
| 1 | Infrastructure libs (firebase, redis, otp, email) | ✅ Done |
| 2 | Database schema & validators | ✅ Done |
| 3 | Backend: Registration | ✅ Done |
| 4 | Backend: Login guards | ✅ Done |
| 5 | Backend: OTP login routes | ✅ Done |
| 6 | Backend: Email verify & change routes | ✅ Done |
| 7 | Backend: Admin approve/reject | ✅ Done |
| 8 | Frontend: authStore updates | ✅ Done |
| 9 | Frontend: Register UI (inline OTP) | 🔲 Not started |
| 10 | Frontend: Login UI (password + OTP modes) | 🔲 Not started |
| 11 | Frontend: Pending approval page + route guards | 🔲 Not started |
| 12 | Frontend: Profile email verify & change UI | 🔲 Not started |
| 13 | Frontend: Admin pending owners panel | 🔲 Not started |
| 14 | Notifications wiring (FCM utility) | 🔲 Not started |
| 15 | Cleanup & QA | 🔲 Not started |
| 16 (backend) | Forgot/reset password routes | ✅ Done |
| 16 (frontend) | Forgot password page UI | 🔲 Not started |

---

### API Status

| Method | Route | Purpose | Coded | Tested |
|---|---|---|---|---|
| POST | `/api/auth/register` | Register painter or owner | ✅ | ❌ |
| POST | `/api/auth/verify/email/send` | Send email OTP before owner registration | ✅ | ❌ |
| POST | `/api/auth/login` | Password login (email or phone identifier) | ✅ | ❌ |
| POST | `/api/auth/login/otp/send` | Send login OTP to email | ✅ | ❌ |
| POST | `/api/auth/login/otp/verify` | Verify email login OTP → JWT | ✅ | ❌ |
| POST | `/api/auth/login/otp/phone` | Firebase phone token → JWT | ✅ | ❌ |
| POST | `/api/auth/forgot-password` | Send reset link (verified email only) | ✅ | ❌ |
| POST | `/api/auth/reset-password` | Reset password via token | ✅ | ❌ |
| POST | `/api/users/verify-email/send` | Send OTP to verify current email | ✅ | ❌ |
| POST | `/api/users/verify-email/confirm` | Confirm OTP → emailVerified true | ✅ | ❌ |
| POST | `/api/users/change-email/send` | Verify password + send OTP to new email | ✅ | ❌ |
| POST | `/api/users/change-email/confirm` | Confirm OTP → swap email | ✅ | ❌ |
| PATCH | `/api/admin/users/[userId]/approve` | Approve pending owner → active + notify | ✅ | ❌ |
| PATCH | `/api/admin/users/[userId]/reject` | Reject pending owner → suspended + notify | ✅ | ❌ |
| GET | `/api/users` | List users — supports `?role=owner&status=inactive` | ✅ | ❌ |

---

## Phase 9 — Register UI

**File:** `src/app/(auth)/register/page.tsx` (currently stubbed — full rewrite)

**Layout:** All fields on one page — **Name → Role → Email → Phone → Password**. Role selection controls which verify buttons appear. No page transitions.

### State
```ts
const [phoneVerified, setPhoneVerified] = useState(false);
const [emailVerified, setEmailVerified] = useState(false);
const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
const [phoneOtpInput, setPhoneOtpInput] = useState('');
const [emailOtpInput, setEmailOtpInput] = useState('');
const [emailSessionId, setEmailSessionId] = useState<string | null>(null);
const [showPhoneOtp, setShowPhoneOtp] = useState(false);
const [showEmailOtp, setShowEmailOtp] = useState(false);
```

### Phone verification (both roles)
- "Verify with OTP" button below phone input
- Click → reCAPTCHA → `signInWithPhoneNumber(firebaseAuth, phone, recaptchaVerifier)` → save `confirmationResult`, `showPhoneOtp = true`
- 6-digit input appears → `confirmationResult.confirm(otp)` → save `firebaseIdToken`, `phoneVerified = true`, show ✓
- If user edits phone after verifying → reset `phoneVerified`, clear `firebaseIdToken` and `confirmationResult`

### Email verification (owner only)
- "Verify with OTP" button below email input — only shown when `role === 'owner'`
- Click → `POST /api/auth/verify/email/send { email }` → save `emailSessionId`, `showEmailOtp = true`
- 6-digit input appears → user types OTP → `emailVerified = true`, show ✓ (actual verification is server-side on register submit)
- If user edits email after verifying → reset `emailVerified` and `emailSessionId`

### Register button
- **Painter:** enabled only when `phoneVerified === true`
- **Owner:** enabled only when `phoneVerified === true && emailVerified === true`

### On submit
```ts
registerUser({
  name, email, phone, password, role,
  firebaseIdToken: firebaseIdToken!,
  emailOtp: emailOtpInput || undefined,       // owner only
  emailSessionId: emailSessionId || undefined, // owner only
})
```
- Painter success → `router.push('/painter/dashboard')`
- Owner success → `router.push('/pending-approval')`
- Error → show inline, keep OTP state (don't reset verification)

### reCAPTCHA
- Add `<div id="recaptcha-container" />` to JSX
- Init `RecaptchaVerifier` on button click, not on page load
- Call `verifier.clear()` before re-initialising on retry

---

## Phase 10 — Login UI

**File:** `src/app/(auth)/login/page.tsx`

- Tabs at top: **"Password"** | **"OTP"**
- Shared `identifier` input (email or phone)

**Password mode:**
- Password input → `login(identifier, password)`

**OTP mode:**
- "Send OTP" button → detect type via `identifier.includes('@')`
- Email path: `POST /api/auth/login/otp/send { identifier }` → 6-digit input → `loginWithEmailOtp(sessionId, otp)`
- Phone path: `signInWithPhoneNumber(firebaseAuth, identifier, verifier)` → 6-digit input → `confirmationResult.confirm(otp)` → `loginWithPhoneOtp(phone, firebaseIdToken)`

**On success** — branch on returned user:
```ts
if (user.role === 'owner' && user.status !== 'active') router.push('/pending-approval');
else router.push(`/${user.role}/dashboard`);
```

**On 403 error** — show the server message verbatim (it's already actionable: "verify email", "account pending", "account suspended").

---

## Phase 11 — Pending Approval Page + Route Guard

**File:** `src/app/(auth)/pending-approval/page.tsx` (new)

- Read `user` from authStore
- `status === 'inactive'` → "Your account is under review. You'll receive an email once approved."
- `status === 'suspended'` → "Your registration was rejected. Contact `{ADMIN_CONTACT_EMAIL}` to appeal."
- Logout button

**Route guard** — in `src/app/(owner)/layout.tsx`:
```ts
useEffect(() => {
  if (user?.role === 'owner' && user.status !== 'active') router.replace('/pending-approval');
}, [user]);
```

---

## Phase 12 — Profile Email Verify & Change

**Find the profile page** — likely `src/app/(painter)/profile/` or a shared profile component. Check what already exists before building.

**Email section:**
- Show current email + badge: `emailVerified ? "Verified" : "Unverified"`
- **"Verify Email"** button (if `!emailVerified`) → `POST /api/users/verify-email/send` → modal with 6-digit OTP → `POST /api/users/verify-email/confirm` → refresh user in authStore
- **"Change Email"** button → modal: new email + password inputs → `POST /api/users/change-email/send { newEmail, password }` → second modal with 6-digit OTP → `POST /api/users/change-email/confirm { sessionId, otp }` → refresh user

---

## Phase 13 — Admin Pending Owners Panel

**Find admin dashboard** — check `src/app/(admin)/` for existing dashboard page. Extend it, don't create from scratch.

**Pending owners section:**
- Fetch `GET /api/users?role=owner&status=inactive`
- Table: name, email, phone, registered date, Approve / Reject buttons
- Approve → `PATCH /api/admin/users/:id/approve` → remove row optimistically
- Reject → modal with optional reason input → `PATCH /api/admin/users/:id/reject { reason }`
- Toast on success/failure

---

## Phase 14 — Notifications Wiring

Email + inline FCM already fires from Phase 7 approve/reject routes. This phase adds:
- A proper `sendFcmToUser(userId, { title, body })` helper in `src/lib/` (reads `fcmTokens` from user doc, calls `admin.messaging().send()`)
- Wire `Notification.create()` into the register route (owner case) so admins see it in the notification bell
- Check `src/store/api/` for existing notification RTK Query slice and confirm it fetches from `GET /api/notifications`

---

## Phase 16 — Forgot Password UI

**File:** `src/app/(auth)/forgot-password/page.tsx`

- Email input + submit → `POST /api/auth/forgot-password { email }`
- Response `message` contains either "check your email" or "use OTP login" — show it verbatim
- Link back to login

**Reset password page** — `src/app/(auth)/reset-password/page.tsx` (check if it already exists)
- Reads `?token=` from URL
- New password input → `POST /api/auth/reset-password { token, newPassword }`
- Success → redirect to login

---

## Phase 15 — QA Checklist

Run `npx tsc --noEmit` and `npm run lint` clean first, then manual E2E:

- [ ] Painter: register → `/painter/dashboard`
- [ ] Painter: logout → email login denied (unverified) → phone login allowed
- [ ] Painter: verify email from profile → email login now allowed
- [ ] Painter: change email from profile (password + OTP flow)
- [ ] Owner: register → `/pending-approval`
- [ ] Owner: admin approves → owner login → `/owner/dashboard`
- [ ] Owner: admin rejects (with reason) → owner login → suspended message with admin contact
- [ ] Forgot password (verified email) → reset link arrives → `/reset-password` works
- [ ] Forgot password (unverified email) → OTP login message shown
- [ ] OTP login: email path works
- [ ] OTP login: phone path works
- [ ] Duplicate phone on register → 409
- [ ] Wrong OTP on register → 401

---

## Notes

**Rate limiting (known gap):** OTP send endpoints have no rate limiting. Add Redis `INCR` + TTL per IP and per identifier before going to production.

**Error message consistency:** The 403 messages from `/login`, `/login/otp/*` and the `/pending-approval` page should word things identically. Consider a `src/lib/auth-errors.ts` constants file when building Phase 10/11.
