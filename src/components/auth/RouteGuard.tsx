'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

type Role = 'painter' | 'owner' | 'admin';

const HOME: Record<Role, string> = {
  admin  : '/admin/dashboard',
  owner  : '/owner/jobs',
  painter: '/painter/dashboard',
};

// Client-side gate for the role-scoped route groups. The edge proxy already
// bounces visitors with no auth cookie before the shell renders; this layer
// verifies the actual token against /api/users/me (via checkAuth) and enforces
// the role — so an expired/revoked token goes back to login, and a user
// opening another role's URL lands on their own home instead of a broken shell.
export function RouteGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('wallpainter_token');
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!useAuthStore.getState().isAuthenticated) {
        await useAuthStore.getState().checkAuth();
      }
      if (cancelled) return;
      const { isAuthenticated, user } = useAuthStore.getState();
      if (!isAuthenticated || !user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      } else if (user.role !== role) {
        router.replace(HOME[user.role]);
      } else {
        setAllowed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [role, router, pathname]);

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-(--paper)">
        <div className="w-7 h-7 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
