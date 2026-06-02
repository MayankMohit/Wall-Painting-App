'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function PainterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('wallpainter_token');
    }
    router.push('/login');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/painter/dashboard' },
    { name: 'Profile', href: '/painter/profile' }, // Simplified to Profile as requested
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left side: Logo & Links */}
            <div className="flex items-center gap-8">
              <Link href="/painter/dashboard" className="flex items-center gap-1">
                <span className="text-2xl font-black text-indigo-600 tracking-tight">Wall</span>
                <span className="text-2xl font-black text-gray-900 tracking-tight">Painter</span>
              </Link>
              
              <nav className="hidden md:flex space-x-2">
                {navLinks.map((link) => {
                  const isActive = pathname.includes(link.href);
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right side: User Info & Logout */}
            <div className="flex items-center gap-6">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              </button>
              
              <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
                <span className="text-sm font-bold text-gray-700">
                  {user?.name || 'Painter'}
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}