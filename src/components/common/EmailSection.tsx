'use client';

import { useState } from 'react';
import { User } from '@/store/authStore';

interface Props {
  user: User;
  onEmailUpdated: () => void;
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function post(url: string, body: object) {
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  const json = await res.json();
  return { ok: res.ok, data: json.data ?? json };
}

export default function EmailSection({ user, onEmailUpdated }: Props) {
  // ── Verify email state ────────────────────────────────────────────────────
  const [verifySending, setVerifySending] = useState(false);
  const [verifySessionId, setVerifySessionId] = useState<string | null>(null);
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyConfirming, setVerifyConfirming] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  // ── Change email state ────────────────────────────────────────────────────
  const [showChange, setShowChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changePassword, setChangePassword] = useState('');
  const [changeSending, setChangeSending] = useState(false);
  const [changeSessionId, setChangeSessionId] = useState<string | null>(null);
  const [changeOtp, setChangeOtp] = useState('');
  const [changeConfirming, setChangeConfirming] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);

  // ── Verify email flow ─────────────────────────────────────────────────────

  async function handleSendVerifyOtp() {
    setVerifyError(null);
    setVerifySending(true);
    try {
      const { ok, data } = await post('/api/users/verify-email/send', {});
      if (!ok) { setVerifyError(data.error ?? 'Failed to send OTP'); return; }
      setVerifySessionId(data.sessionId);
    } catch {
      setVerifyError('Network error. Please try again.');
    } finally {
      setVerifySending(false);
    }
  }

  async function confirmVerifyOtp(otp: string) {
    if (!verifySessionId) return;
    setVerifyConfirming(true);
    setVerifyError(null);
    try {
      const { ok, data } = await post('/api/users/verify-email/confirm', { sessionId: verifySessionId, otp });
      if (!ok) {
        setVerifyError(data.error ?? 'Invalid or expired OTP');
        setVerifyOtp('');
        return;
      }
      setVerifySuccess(true);
      onEmailUpdated();
    } catch {
      setVerifyError('Network error. Please try again.');
    } finally {
      setVerifyConfirming(false);
    }
  }

  function handleVerifyOtpChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setVerifyOtp(digits);
    if (digits.length === 6) confirmVerifyOtp(digits);
  }

  // ── Change email flow ─────────────────────────────────────────────────────

  function openChange() {
    setShowChange(true);
    setChangeError(null);
    setChangeSuccess(false);
    setNewEmail('');
    setChangePassword('');
    setChangeSessionId(null);
    setChangeOtp('');
  }

  function cancelChange() {
    setShowChange(false);
    setChangeSessionId(null);
    setChangeOtp('');
    setChangeError(null);
  }

  async function handleSendChangeOtp(e: React.FormEvent) {
    e.preventDefault();
    setChangeError(null);
    setChangeSending(true);
    try {
      const { ok, data } = await post('/api/users/change-email/send', { newEmail, password: changePassword });
      if (!ok) { setChangeError(data.error ?? 'Failed to send OTP'); return; }
      setChangeSessionId(data.sessionId);
    } catch {
      setChangeError('Network error. Please try again.');
    } finally {
      setChangeSending(false);
    }
  }

  async function confirmChangeOtp(otp: string) {
    if (!changeSessionId) return;
    setChangeConfirming(true);
    setChangeError(null);
    try {
      const { ok, data } = await post('/api/users/change-email/confirm', { sessionId: changeSessionId, otp });
      if (!ok) {
        setChangeError(data.error ?? 'Invalid or expired OTP');
        setChangeOtp('');
        return;
      }
      setChangeSuccess(true);
      setShowChange(false);
      onEmailUpdated();
    } catch {
      setChangeError('Network error. Please try again.');
    } finally {
      setChangeConfirming(false);
    }
  }

  function handleChangeOtpChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setChangeOtp(digits);
    if (digits.length === 6) confirmChangeOtp(digits);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
        Email Address
      </h3>

      {/* Current email row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900">{user.email}</span>
          {user.emailVerified || verifySuccess ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              Verified
            </span>
          ) : (
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
              Unverified
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!user.emailVerified && !verifySuccess && !verifySessionId && (
            <button
              onClick={handleSendVerifyOtp}
              disabled={verifySending}
              className="rounded-md border-2 border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifySending ? 'Sending…' : 'Verify Email'}
            </button>
          )}
          {!showChange && !changeSuccess && (
            <button
              onClick={openChange}
              className="rounded-md border-2 border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Change Email
            </button>
          )}
        </div>
      </div>

      {/* Success banners */}
      {verifySuccess && (
        <p className="mt-3 text-sm font-medium text-green-600">Email verified successfully.</p>
      )}
      {changeSuccess && (
        <p className="mt-3 text-sm font-medium text-green-600">Email updated successfully.</p>
      )}

      {/* Verify email — OTP input */}
      {verifySessionId && !verifySuccess && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500">Enter the 6-digit OTP sent to <span className="font-medium text-gray-700">{user.email}</span></p>
          <input
            type="text"
            inputMode="numeric"
            value={verifyOtp}
            onChange={e => handleVerifyOtpChange(e.target.value)}
            maxLength={6}
            disabled={verifyConfirming}
            placeholder={verifyConfirming ? 'Verifying…' : 'Enter 6-digit OTP'}
            autoFocus
            className="w-full rounded-md border-2 border-blue-300 px-3 py-2.5 text-sm tracking-widest text-gray-900 focus:border-blue-600 focus:outline-none disabled:bg-gray-50"
          />
          {verifyError && <p className="text-xs text-red-600">{verifyError}</p>}
          <button
            type="button"
            onClick={handleSendVerifyOtp}
            disabled={verifySending}
            className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            {verifySending ? 'Sending…' : 'Resend OTP'}
          </button>
        </div>
      )}

      {/* Change email — step 1: form */}
      {showChange && !changeSessionId && (
        <form onSubmit={handleSendChangeOtp} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              placeholder="new@example.com"
              className="w-full rounded-md border-2 border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Confirm with Password</label>
            <input
              type="password"
              value={changePassword}
              onChange={e => setChangePassword(e.target.value)}
              required
              placeholder="Your current password"
              className="w-full rounded-md border-2 border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          {changeError && <p className="text-xs text-red-600">{changeError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={changeSending}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changeSending ? 'Sending OTP…' : 'Send OTP'}
            </button>
            <button
              type="button"
              onClick={cancelChange}
              className="rounded-md border-2 border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Change email — step 2: OTP */}
      {showChange && changeSessionId && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500">
            Enter the 6-digit OTP sent to <span className="font-medium text-gray-700">{newEmail}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={changeOtp}
            onChange={e => handleChangeOtpChange(e.target.value)}
            maxLength={6}
            disabled={changeConfirming}
            placeholder={changeConfirming ? 'Verifying…' : 'Enter 6-digit OTP'}
            autoFocus
            className="w-full rounded-md border-2 border-blue-300 px-3 py-2.5 text-sm tracking-widest text-gray-900 focus:border-blue-600 focus:outline-none disabled:bg-gray-50"
          />
          {changeError && <p className="text-xs text-red-600">{changeError}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setChangeSessionId(null); setChangeOtp(''); setChangeError(null); }}
              className="text-xs font-medium text-gray-500 hover:underline"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleSendChangeOtp as unknown as React.MouseEventHandler}
              disabled={changeSending}
              className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
            >
              {changeSending ? 'Sending…' : 'Resend OTP'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
