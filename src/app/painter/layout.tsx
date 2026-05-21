'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PainterLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <Link href="/painter/dashboard" className="font-bold text-xl text-blue-600 hover:opacity-80 transition-opacity">
          WallPainting APP
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:inline-block">
            Welcome, <strong>{user?.name || 'Painter'}</strong>
          </span>
          <button 
            onClick={handleLogout}
            className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Page Content */}
      <main className="max-w-4xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}