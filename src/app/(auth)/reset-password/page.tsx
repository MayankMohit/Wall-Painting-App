'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: 
      // When the backend API gets done, we can test it right here.
      // The backend will need both the new password AND the token from the URL.
      // e.g., await fetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      // ---------------------------------------------------------
      
      // Simulating network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      // Wait 2 seconds so they can read the success message, then redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err) {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Create New Password</h2>
          <p className="text-sm text-gray-500 mt-2">
            Please enter your new password below.
          </p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="text-green-600 mb-2">
               <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Password Updated!</h3>
            <p className="text-sm text-gray-500 mt-1">Redirecting you to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border border-gray-300 p-3 text-gray-900 focus:border-blue-600 focus:ring-blue-600 outline-none disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white rounded-md py-3 px-4 font-bold transition-colors ${
                isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
              Cancel and return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}