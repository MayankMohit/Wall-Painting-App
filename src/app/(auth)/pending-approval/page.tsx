'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_CONTACT_EMAIL ?? 'admin@wallpainter.com';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, logout, checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect active owners (or non-owners who land here) to their dashboard
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'owner') {
      router.replace(`/${user.role}/dashboard`);
      return;
    }
    if (user.status === 'active') {
      router.replace('/owner/dashboard');
    }
  }, [user, router]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  // Waiting for checkAuth to resolve
  if (!isAuthenticated || !user) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const isSuspended = user.status === 'suspended';

  return (
    <div className="space-y-6 text-center">
      {/* Icon */}
      <div className="flex justify-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${isSuspended ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <span className="text-3xl">{isSuspended ? '✕' : '⏳'}</span>
        </div>
      </div>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isSuspended ? 'Registration Rejected' : 'Account Under Review'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {isSuspended
            ? 'Your registration was not approved.'
            : 'Your account is pending approval by an admin.'}
        </p>
      </div>

      {/* Detail message */}
      <div className={`rounded-md border px-4 py-4 text-sm text-left ${isSuspended ? 'border-red-200 bg-red-50 text-red-700' : 'border-yellow-200 bg-yellow-50 text-yellow-800'}`}>
        {isSuspended ? (
          <>
            <p className="font-medium">What happened?</p>
            <p className="mt-1">
              Your owner account registration was reviewed and rejected. If you believe this is a
              mistake, please contact us at{' '}
              <a href={`mailto:${ADMIN_EMAIL}`} className="font-medium underline">
                {ADMIN_EMAIL}
              </a>{' '}
              to appeal.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">What happens next?</p>
            <p className="mt-1">
              An admin will review your account details. You will receive an email at{' '}
              <span className="font-medium">{user.email}</span> once your account is approved.
            </p>
          </>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="w-full rounded-md border-2 border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        Sign out
      </button>
    </div>
  );
}
