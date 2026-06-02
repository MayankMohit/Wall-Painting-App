'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase-client';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser, isLoading, error, clearError } = useAuthStore();

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'painter' | 'owner'>('painter');

  // Phone verification
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneConfirming, setPhoneConfirming] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Email verification (owner only)
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSessionId, setEmailSessionId] = useState<string | null>(null);
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailConfirming, setEmailConfirming] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => { clearError(); }, [clearError]);


  // ── Reset helpers ─────────────────────────────────────────────────────────

  function resetPhoneVerification() {
    setPhoneVerified(false);
    setFirebaseIdToken(null);
    setConfirmationResult(null);
    setShowPhoneOtp(false);
    setPhoneOtpInput('');
    setPhoneError(null);
  }

  function resetEmailVerification() {
    setEmailVerified(false);
    setEmailSessionId(null);
    setShowEmailOtp(false);
    setEmailOtpInput('');
    setEmailError(null);
  }

  // ── Field change handlers ─────────────────────────────────────────────────

  function handlePhoneChange(val: string) {
    setPhone(val);
    if (phoneVerified || confirmationResult) resetPhoneVerification();
  }

  function handleEmailChange(val: string) {
    setEmail(val);
    if (emailVerified || emailSessionId) resetEmailVerification();
  }

  function handleRoleChange(val: 'painter' | 'owner') {
    setRole(val);
    if (val === 'painter') resetEmailVerification();
  }

  // ── Phone OTP flow ────────────────────────────────────────────────────────

  async function handleSendPhoneOtp() {
    setPhoneError(null);
    setPhoneSending(true);
    try {
      if (!recaptchaRef.current) {
        const container = document.getElementById('recaptcha-container');
        if (container) container.innerHTML = '';
        recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });
        await recaptchaRef.current.render();
      }
      const result = await signInWithPhoneNumber(firebaseAuth, phone, recaptchaRef.current);
      setConfirmationResult(result);
      setShowPhoneOtp(true);
    } catch (e: unknown) {
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('invalid-phone-number')) {
        setPhoneError('Invalid phone number. Use E.164 format e.g. +919876543210');
      } else if (msg.includes('too-many-requests')) {
        setPhoneError('Too many attempts. Please wait before trying again.');
      } else {
        setPhoneError('Failed to send OTP. Check the phone number and try again.');
      }
    } finally {
      setPhoneSending(false);
    }
  }

  async function confirmPhoneOtp(otp: string) {
    if (!confirmationResult) return;
    setPhoneConfirming(true);
    setPhoneError(null);
    try {
      const credential = await confirmationResult.confirm(otp);
      const token = await credential.user.getIdToken();
      setFirebaseIdToken(token);
      setPhoneVerified(true);
      setShowPhoneOtp(false);
    } catch {
      setPhoneError('Incorrect OTP. Please try again.');
      setPhoneOtpInput('');
    } finally {
      setPhoneConfirming(false);
    }
  }

  function handlePhoneOtpChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setPhoneOtpInput(digits);
    if (digits.length === 6) confirmPhoneOtp(digits);
  }

  // ── Email OTP flow ────────────────────────────────────────────────────────

  async function handleSendEmailOtp() {
    setEmailError(null);
    setEmailSending(true);
    try {
      const res = await fetch('/api/auth/verify/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setEmailError((typeof e === 'string' ? e : e?.message) ?? 'Failed to send OTP');
        return;
      }
      setEmailSessionId((json.data ?? json).sessionId);
      setShowEmailOtp(true);
    } catch {
      setEmailError('Network error. Please try again.');
    } finally {
      setEmailSending(false);
    }
  }

  async function confirmEmailOtp(otp: string) {
    if (!emailSessionId) return;
    setEmailConfirming(true);
    setEmailError(null);
    try {
      const res = await fetch('/api/auth/verify/email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: emailSessionId, otp }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setEmailError((typeof e === 'string' ? e : e?.message) ?? 'Invalid OTP. Please try again.');
        setEmailOtpInput('');
        return;
      }
      setEmailVerified(true);
      setShowEmailOtp(false);
    } catch {
      setEmailError('Network error. Please try again.');
      setEmailOtpInput('');
    } finally {
      setEmailConfirming(false);
    }
  }

  function handleEmailOtpChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setEmailOtpInput(digits);
    if (digits.length === 6) confirmEmailOtp(digits);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseIdToken) return;

    const success = await registerUser({
      name,
      email,
      phone,
      password,
      role,
      firebaseIdToken,
      ...(role === 'owner' && {
        emailOtp: emailOtpInput,
        emailSessionId: emailSessionId!,
      }),
    });

    if (success) {
      router.push(role === 'owner' ? '/pending-approval' : '/painter/dashboard');
    }
  }

  const canSubmit = phoneVerified && (role === 'painter' || emailVerified) && !isLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
          <p className="mt-1 text-sm text-gray-500">Join WallPainter today</p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="John Doe"
              className="w-full rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Account Type</label>
            <select
              value={role}
              onChange={e => handleRoleChange(e.target.value as 'painter' | 'owner')}
              className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="painter">I am a Painter</option>
              <option value="owner">I am a Business Owner / Contractor</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email {role === 'owner' && <span className="text-gray-400">(verification required)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                required
                placeholder="you@example.com"
                className="flex-1 rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
              />
              {role === 'owner' && !emailVerified && (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={!email || emailSending}
                  className="whitespace-nowrap rounded-md border-2 border-blue-600 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {emailSending ? 'Sending…' : showEmailOtp ? 'Resend OTP' : 'Verify'}
                </button>
              )}
              {emailVerified && (
                <span className="flex items-center whitespace-nowrap text-sm font-medium text-green-600">
                  ✓ Verified
                </span>
              )}
            </div>
            {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
            {showEmailOtp && (
              <input
                type="text"
                inputMode="numeric"
                value={emailOtpInput}
                onChange={e => handleEmailOtpChange(e.target.value)}
                maxLength={6}
                disabled={emailConfirming}
                placeholder={emailConfirming ? 'Verifying…' : 'Enter 6-digit OTP from your email'}
                autoFocus
                className="mt-2 w-full rounded-md border-2 border-blue-300 px-3 py-2.5 text-sm tracking-widest text-gray-900 focus:border-blue-600 focus:outline-none disabled:bg-gray-50"
              />
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Phone Number <span className="text-gray-400">(verification required)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                required
                placeholder="+919876543210"
                className="flex-1 rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
              />
              {!phoneVerified && (
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={!phone || phoneSending || phoneConfirming}
                  className="whitespace-nowrap rounded-md border-2 border-blue-600 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phoneSending ? 'Sending…' : showPhoneOtp ? 'Resend OTP' : 'Verify'}
                </button>
              )}
              {phoneVerified && (
                <span className="flex items-center whitespace-nowrap text-sm font-medium text-green-600">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">Include country code — e.g. +91 for India</p>
            {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
            {showPhoneOtp && (
              <input
                type="text"
                inputMode="numeric"
                value={phoneOtpInput}
                onChange={e => handlePhoneOtpChange(e.target.value)}
                maxLength={6}
                disabled={phoneConfirming}
                placeholder={phoneConfirming ? 'Verifying…' : 'Enter 6-digit OTP'}
                autoFocus
                className="mt-2 w-full rounded-md border-2 border-blue-300 px-3 py-2.5 text-sm tracking-widest text-gray-900 focus:border-blue-600 focus:outline-none disabled:bg-gray-50"
              />
            )}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isLoading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {/* Invisible reCAPTCHA — Firebase mounts here, do not remove */}
      <div id="recaptcha-container" />
    </>
  );
}
