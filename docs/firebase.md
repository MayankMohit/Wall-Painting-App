# Firebase Phone Authentication — How It Works

## The core idea

Firebase phone auth proves that the person registering **physically holds the SIM card** for the phone number they typed. The browser is just the input interface — Firebase talks to the phone network directly via SMS.

Our backend never sends an SMS and never sees the raw OTP code. By the time we get involved, Firebase has already done the verification and hands us a signed token as proof.

---

## Full flow, step by step

```
Browser (on laptop)                  Firebase servers        User's phone (SMS)
────────────────────────────────────────────────────────────────────────────────

1. User types +919876543210 in the form
   signInWithPhoneNumber("+91...", recaptchaVerifier)
   ─────────────────────────────────►
                                     Firebase sends SMS ────────────────────────►
                                                               "Your code: 847291"

2. User reads the SMS on their physical phone
   types 847291 into the browser form

3. confirmationResult.confirm("847291")
   ─────────────────────────────────►
                                     Firebase checks: did I send 847291 to +91...?
                                     Yes → here's a signed ID token proving it
                                     ◄─────────────────────────────────────────

4. client calls user.getIdToken() → firebaseIdToken (a signed JWT from Firebase)

5. POST /api/auth/register { ..., firebaseIdToken }
   ─────────────────────────────────► OUR backend
```

---

## What each party does

| Party | Responsibility |
|---|---|
| Firebase servers | Sends the SMS, validates the code the user typed, issues a signed ID token |
| Browser | Collects the code from the user and passes it to Firebase |
| Our backend | Verifies the token signature, checks it matches the submitted phone number |

---

## What it proves

Only someone who physically holds the SIM card for `+919876543210` can read that SMS and type the correct code. That's the proof of ownership.

---

## The reCAPTCHA step

Before Firebase will send an SMS, it requires a `RecaptchaVerifier` to be solved. This happens at step 1, before the SMS is sent.

```ts
const verifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });
const confirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier);
```

Its only job is to stop bots from spamming Firebase with SMS requests, since each SMS costs money. Firebase offers an invisible reCAPTCHA that resolves automatically for legitimate browser sessions without any user interaction.

---

## Our backend verification — line by line

```ts
// 1. Verify the token with Firebase Admin SDK
let decoded: { phone_number?: string };
try {
  decoded = await admin.auth().verifyIdToken(firebaseIdToken);
} catch {
  return err('Phone verification failed', 401);
}

// 2. Check the token matches the phone number in the form
if (decoded.phone_number !== phone) return err('Phone token mismatch', 401);
```

**Line 1 — `verifyIdToken`**
Sends the token to Firebase's servers to check the cryptographic signature and expiry. If the token was forged, tampered with, or expired, this throws — we catch it and return 401.

**Line 2 — phone number comparison**
The decoded token contains the phone number Firebase actually verified (e.g. `+919876543210`). We compare it against the `phone` field the user submitted in the request body.

This check prevents an attack where someone:
- verifies their own phone A with Firebase
- but submits a different phone B in the register payload

Without this check, a user could register any phone number in the database as long as they hold *some* valid Firebase token.

---

## Why there is no backend route for sending phone OTP

Firebase handles the entire SMS flow — our backend has no role in it. The sequence is:

1. Client triggers SMS send via Firebase SDK (browser → Firebase directly)
2. User reads SMS on physical phone
3. Client confirms OTP via Firebase SDK (browser → Firebase directly)
4. Firebase returns a signed token
5. Client sends that token to our backend

Our backend only enters the picture at step 5. This is intentional — Firebase manages phone auth infrastructure (SMS gateways, rate limiting, OTP expiry) so we don't have to.

---

## Exactly what happens when user clicks "Send OTP" — internal breakdown

### Step 1 — reCAPTCHA fires

```ts
const verifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });
```

The Firebase SDK makes a request to Google's reCAPTCHA service to prove the request comes from a real browser, not a bot or script. With `size: 'invisible'` this resolves automatically in the background — no checkbox shown to the user. It returns a reCAPTCHA token.

### Step 2 — `signInWithPhoneNumber` is called

```ts
const confirmationResult = await signInWithPhoneNumber(firebaseAuth, "+919876543210", verifier);
```

Internally the Firebase SDK makes a POST to Google's Identity Toolkit API:

```
POST https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=<NEXT_PUBLIC_FIREBASE_API_KEY>

Body: {
  phoneNumber: "+919876543210",
  recaptchaToken: "<token from step 1>"
}
```

Google's servers validate the reCAPTCHA token, then instruct their SMS gateway to send a message like:
```
"123456 is your verification code for <your-app>. Don't share it."
```
to `+919876543210` via a carrier (Airtel, Jio, etc.).

The API responds with a `sessionInfo` string — an opaque server-side reference to this OTP session. The Firebase SDK wraps this in a `ConfirmationResult` object and returns it. **The OTP code itself never comes to the browser** — it only goes to the phone via SMS.

### Step 3 — User reads SMS, types code, clicks Verify

```ts
const credential = await confirmationResult.confirm("123456");
```

Internally the Firebase SDK makes another POST to Identity Toolkit:

```
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=<API_KEY>

Body: {
  sessionInfo: "<the opaque token from step 2>",
  code: "123456"
}
```

Google's servers look up the OTP they sent for that `sessionInfo` and compare it with `"123456"`:
- **Wrong** → returns an error → `confirmationResult.confirm()` throws → catch and show "Invalid OTP"
- **Correct** → creates a Firebase Auth user with `phoneNumber: "+919876543210"` → returns an `idToken` (a signed JWT) + `refreshToken`

### Step 4 — Get the ID token

```ts
const token = await credential.user.getIdToken();
```

`credential.user` is the Firebase Auth user object. `.getIdToken()` returns the raw JWT string from step 3. This JWT is signed by Google's private key and contains:

```json
{
  "phone_number": "+919876543210",
  "aud": "<your-firebase-project-id>",
  "exp": 1234567890
}
```

### Step 5 — Token goes to our backend

```ts
POST /api/auth/register { ..., firebaseIdToken: token }
```

Our backend calls `admin.auth().verifyIdToken(token)` — this calls Google's servers one more time to verify the JWT signature hasn't been tampered with, then reads `decoded.phone_number` and confirms it matches the `phone` field in the request body.

### Summary of all network calls

| # | From | To | Purpose |
|---|---|---|---|
| 1 | Browser | Google reCAPTCHA | Prove it's a real browser |
| 2 | Browser | Firebase Identity Toolkit | Send OTP SMS to phone |
| 3 | Firebase servers | Phone carrier (SMS) | Deliver OTP to user's phone |
| 4 | Browser | Firebase Identity Toolkit | Submit OTP code, get signed token |
| 5 | Browser | Our backend | Register with token as proof |
| 6 | Our backend | Firebase Admin API | Verify token signature |

Our backend is only involved in calls 5 and 6. Everything before that is between the browser and Google.

---

## Email OTP vs Phone OTP — the difference

| | Email OTP | Phone OTP |
|---|---|---|
| Who sends it | Our backend (via Resend) | Firebase (via SMS gateway) |
| Where the code goes | User's email inbox | User's phone via SMS |
| Who verifies the code | Our backend (Redis lookup) | Firebase |
| What our backend gets | The raw OTP code to check | A signed token (never sees the code) |
| Backend route needed | Yes — `/api/auth/verify/email/send` | No — client talks to Firebase directly |
