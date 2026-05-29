'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase-client';
import { useAuthStore } from '@/store/authStore';

type Tab = 'password' | 'otp';

function redirectAfterLogin(role: string, status: string, router: ReturnType<typeof useRouter>) {
  if (role === 'owner' && status !== 'active') {
    router.push('/pending-approval');
  } else {
    router.push(`/${role}/dashboard`);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithEmailOtp, loginWithPhoneOtp, isLoading, error, clearError } = useAuthStore();

  const [tab, setTab] = useState<Tab>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // OTP shared state
  const [otpInput, setOtpInput] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpConfirming, setOtpConfirming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Email OTP
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Phone OTP
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => { clearError(); }, [clearError]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isEmail = identifier.includes('@');

  function resetOtpState() {
    setOtpInput('');
    setShowOtp(false);
    setSendError(null);
    setSessionId(null);
    setConfirmationResult(null);
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    resetOtpState();
    clearError();
  }

  function handleIdentifierChange(val: string) {
    setIdentifier(val);
    if (showOtp) resetOtpState();
  }

  // ── Password login ────────────────────────────────────────────────────────

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const success = await login(identifier, password);
    if (success) {
      const { user } = useAuthStore.getState();
      redirectAfterLogin(user!.role, user!.status, router);
    }
  }

  // ── OTP: send ─────────────────────────────────────────────────────────────

  async function handleSendOtp() {
    setSendError(null);
    setSending(true);
    try {
      if (isEmail) {
        const res = await fetch('/api/auth/login/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier }),
        });
        const json = await res.json();
        if (!res.ok) {
          setSendError((json.data ?? json).error ?? 'Failed to send OTP');
          return;
        }
        setSessionId((json.data ?? json).sessionId);
        setShowOtp(true);
      } else {
        // Phone path — Firebase
        if (!recaptchaRef.current) {
          const container = document.getElementById('recaptcha-container');
          if (container) container.innerHTML = '';
          recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });
          await recaptchaRef.current.render();
        }
        const result = await signInWithPhoneNumber(firebaseAuth, identifier, recaptchaRef.current);
        setConfirmationResult(result);
        setShowOtp(true);
      }
    } catch (e: unknown) {
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('invalid-phone-number')) {
        setSendError('Invalid phone number. Use E.164 format e.g. +919876543210');
      } else if (msg.includes('too-many-requests')) {
        setSendError('Too many attempts. Please wait before trying again.');
      } else {
        setSendError('Failed to send OTP. Please try again.');
      }
    } finally {
      setSending(false);
    }
  }

  // ── OTP: confirm ──────────────────────────────────────────────────────────

  async function confirmOtp(otp: string) {
    if (isEmail) {
      if (!sessionId) return;
      const success = await loginWithEmailOtp(sessionId, otp);
      if (success) {
        const { user } = useAuthStore.getState();
        redirectAfterLogin(user!.role, user!.status, router);
      }
    } else {
      if (!confirmationResult) return;
      setOtpConfirming(true);
      try {
        const credential = await confirmationResult.confirm(otp);
        const firebaseIdToken = await credential.user.getIdToken();
        const success = await loginWithPhoneOtp(identifier, firebaseIdToken);
        if (success) {
          const { user } = useAuthStore.getState();
          redirectAfterLogin(user!.role, user!.status, router);
        }
      } catch {
        // authStore will surface generic errors; set a local one for bad OTP
        useAuthStore.setState({ error: 'Incorrect OTP. Please try again.' });
        setOtpInput('');
      } finally {
        setOtpConfirming(false);
      }
    }
  }

  function handleOtpChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtpInput(digits);
    if (digits.length === 6) confirmOtp(digits);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border-2 border-gray-200 p-1">
          {(['password', 'otp'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'password' ? 'Password' : 'OTP'}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Password tab ── */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                placeholder="you@example.com or +919876543210"
                className="w-full rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── OTP tab ── */}
        {tab === 'otp' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email or Phone
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={identifier}
                  onChange={e => handleIdentifierChange(e.target.value)}
                  placeholder="you@example.com or +919876543210"
                  className="flex-1 rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={!identifier || sending || isLoading}
                  className="whitespace-nowrap rounded-md border-2 border-blue-600 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? 'Sending…' : showOtp ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>
              {!isEmail && identifier && (
                <p className="mt-1 text-xs text-gray-400">
                  Include country code — e.g. +91 for India
                </p>
              )}
              {sendError && <p className="mt-1 text-xs text-red-600">{sendError}</p>}
            </div>

            {showOtp && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpInput}
                  onChange={e => handleOtpChange(e.target.value)}
                  maxLength={6}
                  disabled={otpConfirming || isLoading}
                  placeholder={otpConfirming || isLoading ? 'Verifying…' : 'Enter 6-digit OTP'}
                  autoFocus
                  className="w-full rounded-md border-2 border-blue-300 px-3 py-2.5 text-sm tracking-widest text-gray-900 focus:border-blue-600 focus:outline-none disabled:bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {isEmail ? 'Check your inbox' : 'Sent via SMS'}
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>

      {/* Invisible reCAPTCHA — Firebase mounts here for phone OTP, do not remove */}
      <div id="recaptcha-container" />
    </>
  );
}
