'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';

function getRedirectPath(role: string, status: string): string {
  if (role === 'owner') return status !== 'active' ? '/pending-approval' : '/owner/jobs';
  return `/${role}/dashboard`;
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wallpainter_token');
    if (!token) { setChecking(false); return; }
    checkAuth().finally(() => setChecking(false));
  }, [checkAuth]);

  useEffect(() => {
    if (!checking && isAuthenticated && user) {
      router.replace(getRedirectPath(user.role, user.status));
    }
  }, [checking, isAuthenticated, user, router]);

  if (checking) {
    return (
      <div className="landing-bg min-h-svh flex items-center justify-center">
        <div className="landing-spinner" />
      </div>
    );
  }

  return (
    <main className="landing-bg min-h-svh relative overflow-hidden">

      {/* Diagonal grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(135deg, transparent 0 80px, rgba(255,255,255,.03) 80px 81px)' }}
      />

      {/* ── MOBILE layout ─────────────────────────────────────────── */}
      <div className="lg:hidden relative z-10 flex flex-col min-h-svh w-full max-w-97.5 mx-auto sm:max-w-105">
        <div className="flex-1 px-8 pt-30">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden shadow-[0_8px_30px_oklch(0.62_0.14_300/0.45)]"
          >
            <Image src="/app-icon.png" alt="Wallo" width={64} height={64} className="object-cover block" priority />
          </div>
          <div className="text-white mt-9 text-[56px] font-bold tracking-[-0.04em] leading-[0.95]">
            Wallo<span className="text-(--accent)">.</span>
          </div>
          <p className="mt-3.5 max-w-70 text-[17px] leading-[1.35] text-white/65">
            The job site tool for painting contractors. Log walls, track approvals, ship invoices.
          </p>
        </div>
        <div className="px-6 pb-14 flex flex-col gap-2.5">
          <Button href="/register" variant="accent" size="lg" full>Get started</Button>
          <Button href="/login" variant="ghost" size="lg" full className="text-white/70">
            I have an account
          </Button>
          <p className="text-center mt-2 text-[11px] text-white/40 tracking-[.04em]">
            v3.1 · BUILT FOR THE TRADES
          </p>
        </div>
      </div>

      {/* ── DESKTOP layout ────────────────────────────────────────── */}
      <div className="hidden lg:flex relative z-10 min-h-svh items-center justify-center px-16">

        {/* Glow anchored to the left where the tagline lives */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 680px 520px at 32% 50%, oklch(0.55 0.1 270 / .09) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-16 w-full max-w-300 mx-auto">

          {/* Left — logo lockup + tagline */}
          <div className="flex-1 flex flex-col gap-5">

            {/* Inline logo lockup */}
            <div className="flex items-center gap-3.25">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-[0_8px_28px_oklch(0.62_0.14_300/0.46)]">
                <Image src="/app-icon.png" alt="Wallo" width={48} height={48} className="object-cover block" priority />
              </div>
              <span className="text-[46px] font-bold tracking-[-0.04em] leading-none text-white">
                Wallo<span className="text-(--accent)">.</span>
              </span>
            </div>

            <p className="m-0 text-[62px] font-bold tracking-[-0.03em] leading-[1.06] text-white">
              The job site tool for painting contractors.
            </p>
          </div>

          {/* Separator */}
          <div className="w-px h-35 shrink-0 bg-white/12 self-center" />

          {/* Right — CTAs */}
          <div className="w-75 shrink-0 flex flex-col gap-2.5">
            <Button href="/register" variant="accent" size="lg" full>Get started</Button>
            <Button href="/login" variant="ghost" size="lg" full className="text-white/70">
              I have an account
            </Button>
          </div>

        </div>
      </div>

    </main>
  );
}
