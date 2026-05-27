# Auth Verification — Phone & Email OTP at Registration

## Overview

Phone is mandatory for all users. Email is optional. Whatever is provided must be verified before the account is created. Login accepts either email or phone number as the identifier.

---

## Registration Flow

```
User fills form
  → POST /api/auth/verify/email/send   (only if email provided)
  → Firebase signInWithPhoneNumber()   (always, client-side)
  → Verify page shown (same register page, step 2)
      → User enters phone OTP (always)
      → User enters email OTP (only if email was provided)
  → Firebase confirmationResult.confirm(phoneOtp) → firebaseIdToken
  → POST /api/auth/register { ...formData, firebaseIdToken, emailOtp?, sessionId? }
      → Backend: verifyIdToken(firebaseIdToken) via Firebase Admin
      → Backend: verifyEmailOtp(sessionId, emailOtp) via Redis  (only if email present)
      → User created in MongoDB → JWT returned → Dashboard
```

---

## Phone Verification — Firebase Phone Auth (Free tier)

- **Provider:** Firebase Phone Auth (client SDK + Admin SDK)
- **Cost:** Free up to 10,000 verifications/month
- **Client packages:** `firebase` (already installed)
- **Server packages:** `firebase-admin` (already installed)

### Client-side (register page)
```ts
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase-client';

const verifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });
const confirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier);

// After user enters OTP:
const credential = await confirmationResult.confirm(phoneOtp);
const firebaseIdToken = await credential.user.getIdToken();
```

### Server-side (register route)
```ts
import { admin } from '@/lib/firebase-admin';

const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
// decoded.phone_number is in E.164 format e.g. +919876543210
```

### Phone format requirement
Phone must be in **E.164 format**: `+[country code][number]` e.g. `+919876543210`.  
Validation regex: `/^\+[1-9]\d{7,14}$/`

---

## Email Verification — OTP via Resend + Redis

- **Email provider:** Resend (already configured via `RESEND_API_KEY`)
- **OTP storage:** Upstash Redis (10-minute TTL)
- **OTP format:** 6-digit numeric code

### Flow
1. `POST /api/auth/verify/email/send` — generates OTP, stores in Redis, sends via Resend, returns `sessionId`
2. User enters 6-digit code on verify step
3. `POST /api/auth/register` — backend calls `verifyEmailOtp(sessionId, otp)`, deletes from Redis on success

### Redis keys
| Key | Value | TTL |
|---|---|---|
| `otp:email:<sessionId>` | 6-digit OTP string | 600s (10 min) |

---

## Login Changes

Login now accepts **email or phone** as the identifier. Backend detects type by checking for `@`.

```
POST /api/auth/login
{ identifier: "you@example.com" | "+919876543210", password: "..." }
```

Backend lookup:
```ts
const isEmail = identifier.includes('@');
const user = await User.findOne(
  isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
);
```

---

## Database Schema Changes

### User model (`src/lib/models/User.ts`)

| Field | Before | After |
|---|---|---|
| `email` | `required: true, unique: true` | `required: false, unique: true, sparse: true` |
| `phone` | `optional` | `required: true, unique: true` |

**Sparse unique index on email** — allows multiple documents with no email (null), but enforces uniqueness when the field is present. Set via `{ unique: true, sparse: true }` on the field definition (no separate `UserSchema.index({ email: 1 })`).

```ts
email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
phone: { type: String, required: true, unique: true, trim: true },
```

### IUser interface changes
```ts
email?: string;   // was: email: string
phone: string;    // was: phone?: string
```

---

## Validator Changes (`src/lib/validators.ts`)

### RegisterSchema
```ts
z.object({
  email: z.email().optional(),
  password: z.string().min(8),
  name: z.string().min(1).trim(),
  role: z.enum(['painter', 'owner']),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),  // E.164, required
  firebaseIdToken: z.string().min(1),                    // from Firebase phone auth
  emailOtp: z.string().length(6).optional(),             // required only if email present
  sessionId: z.string().optional(),                      // required only if email present
}).refine(
  (data) => !data.email || (data.emailOtp && data.sessionId),
  { message: 'Email OTP and session are required when email is provided', path: ['emailOtp'] }
)
```

### LoginSchema
```ts
z.object({
  identifier: z.string().min(1),   // was: email: z.email()
  password: z.string().min(1),
})
```

---

## New Files

| File | Purpose |
|---|---|
| `src/lib/firebase-client.ts` | Firebase client SDK init — exports `firebaseAuth` |
| `src/lib/firebase-admin.ts` | Firebase Admin SDK init — exports `admin` |
| `src/lib/redis.ts` | Redis client (Upstash) — exports `getRedis()` |
| `src/lib/otp.ts` | OTP generation, Redis store/verify — `generateOtp`, `storeEmailOtp`, `verifyEmailOtp` |
| `src/app/api/auth/verify/email/send/route.ts` | `POST` — send email OTP, return sessionId |

## Modified Files

| File | Change |
|---|---|
| `src/lib/validators.ts` | RegisterSchema + LoginSchema updated (see above) |
| `src/lib/models/User.ts` | email optional+sparse, phone required+unique |
| `src/app/api/auth/register/route.ts` | Verify Firebase token + email OTP before creating user |
| `src/app/api/auth/login/route.ts` | Lookup by email or phone via `identifier` field |
| `src/app/(auth)/register/page.tsx` | Two-step form: step 1 = form, step 2 = OTP inputs |
| `src/app/(auth)/login/page.tsx` | Replace email input with identifier input |
| `src/store/authStore.ts` | Updated User type, login signature, registerUser signature |

---

## Deleted Files

| File | Reason |
|---|---|
| `src/app/api/auth/me/route.ts` | Duplicate of `GET /api/users/me` — removed, all callers updated |

---

## Required Environment Variables (new)

Add these to `.env.local`:

```bash
# Redis (Upstash)
REDIS_URL=rediss://...

# Firebase Admin SDK (from Firebase console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client SDK (from Firebase console → Project Settings → Your apps → Web)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### Firebase console setup steps
1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Enable **Phone** sign-in under Authentication → Sign-in method
3. For Admin SDK keys: Project Settings → Service Accounts → Generate new private key
4. For client config: Project Settings → General → Your apps → Web app config

---

## Known Limitations / Follow-up Work

- **Password reset for phone-only users** — the current forgot-password flow requires email. Users without email have no recovery path. A phone-based OTP reset flow needs to be added separately.
- **Phone format on login** — users must enter phone in E.164 format (+919876543210). Consider adding a country code selector in a future UX pass.
- **OTP resend** — not yet implemented. Users have 10 minutes to use the OTP. A resend button should be added to the verify step.

---

## Future Idea: Owner Role Verification

### Problem
The `role` field is currently self-selected. Any painter can register as an owner. There is no verification that the person is actually a legitimate business owner.

### Proposed Solution: GST Validation + Manual Admin Approval

**Registration flow for owners:**
1. Owner fills registration form with extra fields: `companyName` + `gstNumber`
2. On submit, backend calls the Indian GST public API to validate the GST number exists and is active
3. If GST is valid, account is created with `status: 'inactive'`
4. Admin sees the pending owner account in the admin dashboard with the GST validation result highlighted
5. Admin manually reviews and activates the account (`status: 'active'`)
6. Owner receives a notification (email/SMS) that their account is approved

Painter accounts continue to be immediately active (`status: 'active'`) on registration — no change there.

**GST validation API (free, no key required):**
```
GET https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=<GSTIN>
```
Returns taxpayer details including legal name, status (Active/Cancelled), and business type. Cross-check the returned legal name against the `companyName` the user entered as a soft signal.

**Schema changes needed:**
- `User.gstNumber` — optional string, stored only for owners
- `User.companyName` — move out of `letterhead` and make it a top-level field for owners (or keep in letterhead but populate at registration)
- `RegisterSchema` — add `gstNumber` and `companyName` fields, required when `role === 'owner'`

**Validator change:**
```ts
RegisterSchema.refine(
  (data) => data.role !== 'owner' || (data.gstNumber && data.companyName),
  { message: 'GST number and company name are required for owner accounts', path: ['gstNumber'] }
)
```

**Admin dashboard change:**
- Add a "Pending Owners" section showing accounts with `role: 'owner'` and `status: 'inactive'`
- Show company name, GST number, GST API validation result (valid/invalid), and registration date
- One-click approve (sets `status: 'active'`) or reject (deletes account or sets `status: 'suspended'`)

**Why this works:**
- GST validation automatically filters out obviously fake registrations (no valid GST = no approval)
- Admin still makes the final call — GST existing doesn't prove this person owns that business
- No cost — GST API is a free government service
- Works for all legitimate Indian painting contractors (GST registration is mandatory above ₹20L turnover)

**Limitation:** Only works for GST-registered businesses. Very small contractors below the GST threshold won't have a GSTIN. Admin can still manually approve these on a case-by-case basis.
