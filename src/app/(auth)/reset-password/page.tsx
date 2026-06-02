'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = (json.data ?? json).error;
        setError((typeof e === 'string' ? e : e?.message) ?? 'Failed to reset password. The link may have expired.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div>
          <p className="font-bold text-gray-900">Password updated!</p>
          <p className="mt-1 text-sm text-gray-500">Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
          New Password
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={submitting}
          placeholder="Min. 8 characters"
          className="w-full rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none disabled:bg-gray-100"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
          Confirm New Password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          disabled={submitting}
          placeholder="••••••••"
          className="w-full rounded-md border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none disabled:bg-gray-100"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {submitting ? 'Updating…' : 'Reset Password'}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-gray-500 hover:text-gray-800 hover:underline">
          Cancel — back to Login
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create New Password</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your new password below.</p>
      </div>

      {/* Suspense required by Next.js for useSearchParams in client components */}
      <Suspense fallback={
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
