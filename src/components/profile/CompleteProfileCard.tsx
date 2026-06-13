'use client';

import { useState } from 'react';
import { apiPost, apiPut, errMsg } from '@/lib/profileApi';
import { OtpInput } from '@/components/ui/OtpInput';
import { AlertIco } from './icons';
import { EyeOff } from './icons';

// Shown to owner-provisioned painters who have no password yet. Sets up email +
// password + email verification in one guided flow, reusing existing endpoints:
//   1. PUT  /api/users/me/password         → set the first password
//   2. POST /api/users/change-email/send   → send an OTP to the new email
//   3. POST /api/users/change-email/confirm→ set email + emailVerified
export function CompleteProfileCard({ onDone }: { onDone: () => void }) {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState<'form' | 'otp'>('form');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otp, setOtp]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setBusy(true);
    try {
      // 1 — set the first password (no current-password check on this route)
      const pw = await apiPut('/api/users/me/password', { newPassword: password });
      if (!pw.ok) { setError(errMsg(pw.data, 'Could not set your password.')); return; }

      // 2 — send the verification code to the new email (now that a password exists)
      const send = await apiPost('/api/users/change-email/send', { newEmail: email, password });
      if (!send.ok) { setError(errMsg(send.data, 'Could not send the verification code.')); return; }

      setSessionId(send.data.sessionId);
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp(code: string) {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost('/api/users/change-email/confirm', { sessionId, otp: code });
      if (!res.ok) { setError(errMsg(res.data, 'Invalid or expired code.')); setOtp(''); return; }
      setDone(true);
      onDone();
    } catch {
      setError('Network error. Please try again.');
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  function handleOtpChange(v: string) {
    setOtp(v);
    if (v.length === 6) confirmOtp(v);
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="rounded-(--r-md) border border-(--approved) bg-(--approved-soft) p-3.5 flex items-center gap-3">
        <div className="shrink-0 rounded-[10px] bg-(--approved) text-white flex items-center justify-center" style={{ width: 36, height: 36 }}>✓</div>
        <div className="text-[13px] text-(--ink-2) leading-[1.4]">
          <span className="font-semibold text-(--ink)">Profile complete.</span> You can now sign in with your phone or email and password.
        </div>
      </div>
    );
  }

  // ── Collapsed warning banner ─────────────────────────────────────────────
  if (!open) {
    return (
      <div className="rounded-(--r-md) border border-(--accent) bg-(--accent-soft) p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-[10px] bg-(--accent) text-white flex items-center justify-center" style={{ width: 38, height: 38 }}>
            <AlertIco size={20} weight={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-(--ink)">Complete your profile</div>
            <p className="text-[12px] text-(--ink-2) mt-1 leading-[1.5]">
              Right now you can only sign in by tapping the WhatsApp link your contractor sent.
              Add an <span className="font-semibold">email</span> and <span className="font-semibold">password</span> so you can
              sign in normally on any device, recover your account if you lose the link, and get job updates by email.
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-11 rounded-(--r) text-white text-[14px] font-semibold border-0 cursor-pointer"
          style={{ background: 'var(--accent-deep)' }}
        >
          Set up email &amp; password
        </button>
      </div>
    );
  }

  // ── Expanded: form / OTP ─────────────────────────────────────────────────
  return (
    <div className="rounded-(--r-md) border border-(--accent) bg-(--surface) p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-bold text-(--ink)">Complete your profile</div>
        <button onClick={() => { setOpen(false); setStep('form'); setError(null); }} className="text-[12px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer">
          Cancel
        </button>
      </div>

      {step === 'form' ? (
        <form onSubmit={start} className="space-y-3">
          <div>
            <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">Email address</div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              autoFocus
              className="w-full h-11 bg-(--paper-2) border border-(--border-2) rounded-(--r) px-3 text-[14px] text-(--ink) outline-none focus:border-(--border-3) placeholder:text-(--ink-4)"
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">Create a password</div>
            <div className="h-11 bg-(--paper-2) border border-(--border-2) rounded-(--r) px-3 flex items-center gap-2">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="At least 8 characters"
                className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="text-(--ink-3) bg-transparent border-0 cursor-pointer shrink-0">
                <EyeOff size={16} weight={1.6} />
              </button>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">Confirm password</div>
            <div className={['h-11 bg-(--paper-2) border rounded-(--r) px-3 flex items-center', confirm && confirm !== password ? 'border-(--rejected)' : 'border-(--border-2)'].join(' ')}>
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                placeholder="Repeat password"
                className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
              />
            </div>
          </div>
          {error && <div className="text-[12px] text-(--rejected)">{error}</div>}
          <button
            type="submit"
            disabled={busy || !email || !password || !confirm}
            className="w-full h-11 rounded-(--r) text-white text-[14px] font-semibold border-0 cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--ink)' }}
          >
            {busy ? 'Sending code…' : 'Send verification code'}
          </button>
        </form>
      ) : (
        <div className="space-y-2.5">
          <div className="text-[12px] text-(--ink-3) leading-[1.4]">
            Enter the 6-digit code sent to <span className="font-semibold text-(--ink)">{email}</span>
          </div>
          <OtpInput
            value={otp}
            onChange={handleOtpChange}
            disabled={busy}
            error={error ?? undefined}
            placeholder={busy ? 'Verifying…' : 'Enter 6-digit code'}
          />
          <div className="flex items-center justify-between">
            <button onClick={() => { setStep('form'); setError(null); setOtp(''); }} className="text-[12px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer">
              ← Back
            </button>
            <button
              onClick={() => start({ preventDefault() {} } as React.FormEvent)}
              disabled={busy}
              className="text-[12px] font-semibold text-(--accent-deep) bg-transparent border-0 cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
