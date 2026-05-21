'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin/Owner Top Navigation Bar - Dark theme to distinguish from Painter */}
      <nav className="bg-slate-900 shadow-md p-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="font-bold text-xl tracking-wide">
            WallPainting <span className="text-blue-400">APP</span>
          </h1>
          
          {/* Owner specific navigation links */}
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
            <Link href="/owner/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/owner/jobs" className="hover:text-white transition-colors">
              Manage Jobs
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">
            Welcome, <strong>{user?.name || 'Owner'}</strong>
          </span>
          <button 
            onClick={handleLogout}
            className="text-sm bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Page Content */}
      <main className="max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}