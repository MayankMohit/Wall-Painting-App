'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function PainterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Navigation Bar for Painters */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Left Side: Logo & Main Links */}
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-black text-blue-600 tracking-tight">
                  Wall<span className="text-gray-900">Painter</span>
                </span>
              </div>
              
              <div className="hidden sm:flex space-x-2">
                <Link 
                  href="/painter/dashboard" 
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                    pathname.includes('/dashboard') || pathname.includes('/jobs')
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/painter/profile" 
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                    pathname.includes('/profile') 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  My Profile
                </Link>
              </div>
            </div>

            {/* Right Side: Logout */}
            <div className="flex items-center">
              <button 
                onClick={handleLogout}
                className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors px-4 py-2 rounded-md hover:bg-red-50 border border-transparent hover:border-red-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area - Renders the specific page underneath the navbar */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}