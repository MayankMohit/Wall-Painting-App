'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const loginWithInvite = useAuthStore((s) => s.loginWithInvite);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // claim exactly once per mount (StrictMode-safe)
    ran.current = true;

    (async () => {
      // The claim issues a fresh token for the invite's painter, so drop any
      // existing session first (e.g. logged in as someone else on this device).
      if (useAuthStore.getState().isAuthenticated) useAuthStore.getState().logout();

      const res = await loginWithInvite(token);
      if (res.ok) {
        router.replace(res.jobId ? `/painter/jobs/${res.jobId}` : '/painter/dashboard');
      } else {
        setError(useAuthStore.getState().error ?? 'This link is no longer valid.');
      }
    })();
  }, [token, loginWithInvite, router]);

  return (
    <div className="min-h-svh flex items-center justify-center bg-(--paper) px-6">
      <div className="w-full max-w-sm text-center">
        {!error ? (
          <>
            <div className="landing-spinner mx-auto" />
            <p className="mt-5 text-[14px] text-(--ink-3)">Opening your dashboard…</p>
          </>
        ) : (
          <div className="rounded-(--r-lg) border border-(--border) bg-(--surface) p-7 shadow-(--shadow-sm)">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </div>
            <h1 className="text-[18px] font-bold text-(--ink)">This link isn’t working</h1>
            <p className="mt-2 text-[13px] leading-normal text-(--ink-3)">{error}</p>
            <Link
              href="/login"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-(--border-2) px-5 text-[13px] font-semibold text-(--ink) no-underline"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
