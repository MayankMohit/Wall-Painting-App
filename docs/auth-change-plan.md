# Auth Changes — Status

## Phase Progress

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
| 9 | Frontend: Register UI | ✅ Done |
| 10 | Frontend: Login UI | ✅ Done |
| 11 | Frontend: Pending approval page + route guards | ✅ Done |
| 12 | Frontend: Profile email verify & change UI | ✅ Done |
| 13 | Frontend: Admin pending owners panel | ✅ Done |
| 14 | Notifications wiring (FCM utility) | 🔲 Not started |
| 15 | Cleanup & QA | 🔄 In progress |
| 16 | Forgot/reset password (backend + frontend) | ✅ Done |

---

## QA Checklist (Phase 15)

- [x] Painter: register → `/painter/dashboard`
- [x] Painter: email login denied when unverified → phone OTP allowed
- [x] Painter: verify email from profile → email login now allowed
- [x] Painter: change email from profile
- [x] Owner: register → `/pending-approval`
- [x] Owner: admin approves → `/owner/dashboard`
- [x] Owner: admin rejects → suspended message
- [x] Forgot password → reset link → new password works
- [x] Forgot password with unverified email → correct message shown
- [x] OTP login: email path
- [x] OTP login: phone path
- [x] Duplicate phone on register → 409
- [x] Wrong OTP → 401

---

## Notes

- **Rate limiting gap:** OTP send endpoints have no rate limiting. Add Redis `INCR` + TTL per IP/identifier before production.
- **Phase 14 spec:** see `docs/phase-14-plan.md`

---

## Bugs Fixed During Testing (2026-05-29)

- **Firebase reCAPTCHA "already rendered"** — Lazy init inside handler on first call, `clear()` + null on error, reuse on retry. No `useEffect`.
- **`user` null after page refresh** — `authStore` has no persist middleware. Fixed: all three layouts call `checkAuth()` on mount.
- **Dead owner route guard** — Guard was in `(owner)/layout.tsx` but pages live under `owner/`. Fixed: moved to real layout.
- **`emailSessionId` vs `sessionId` mismatch** — Destructure and remap in `authStore.registerUser` before API call.
- **Admin dashboard missing `key`** — `<>` fragment can't take `key`. Fixed: use `<React.Fragment key={...}>`.
- **Email OTP login blocked for unverified painters** — Fixed: skip check for painters in `otp/send`; `otp/verify` now marks `emailVerified: true` on success.
- **Firebase SMS region policy** — `auth/operation-not-allowed`. Fixed: enable India + US in Firebase Console → Authentication → Settings → SMS region policy.
