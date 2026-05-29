'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Jobs', href: '/admin/jobs' },
    { name: 'Task Queue', href: '/admin/background-jobs' },
    { name: 'Storage', href: '/admin/storage' },
    { name: 'Audit Logs', href: '/admin/logs' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Global Navigation Bar for Admins */}
      <nav className="bg-slate-900 text-slate-100 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">

            {/* Left Side: Logo & Main Links */}
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-black tracking-tight text-white">
                  WallPainter <span className="text-teal-400 font-medium text-sm border-l-2 border-slate-700 ml-2 pl-2">System Admin</span>
                </span>
              </div>

              <div className="hidden lg:flex space-x-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${pathname.includes(link.href)
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Side: Profile & Logout */}
            {/* Right Side: Profile & Logout */}
            <div className="flex items-center gap-4">
              <Link
                href="/admin/profile"
                className="text-sm font-medium text-slate-400 hidden sm:flex items-center gap-2 hover:text-teal-400 transition-colors px-3 py-2 rounded-md hover:bg-slate-800"
              >
                <span className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xs">
                  {user?.name?.charAt(0) || 'A'}
                </span>
                {user?.name || 'SuperAdmin'}
              </Link>
              <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
              <button
                onClick={handleLogout}
                className="text-sm font-bold text-slate-300 hover:text-red-400 transition-colors px-3 py-2 rounded-md hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}