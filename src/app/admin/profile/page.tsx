'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AdminProfilePage() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAdminProfile = async () => {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/profile
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      if (isMounted) {
        setProfileData({
          name: user?.name || 'SuperAdmin',
          email: user?.email || 'admin@wallpainter.com',
          role: 'Root Administrator',
          mfaEnabled: true,
          lastPasswordChange: '45 days ago',
          activeApiKeys: 2
        });
        setIsLoading(false);
      }
    };
    
    fetchAdminProfile();
    return () => { isMounted = false; };
  }, [user]);

  if (isLoading) return <div className="py-20 text-center text-slate-500 animate-pulse">Loading secure profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Administrator Settings</h1>
        <p className="text-slate-500 mt-1">Manage your superuser account, security preferences, and API access.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Personal Information</h2>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue={profileData.name}
                    className="w-full p-2.5 rounded-lg border-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Root Email</label>
                  <input
                    type="email"
                    defaultValue={profileData.email}
                    className="w-full p-2.5 rounded-lg border-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 font-medium"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">System Role Level</label>
                <input
                  type="text"
                  value={profileData.role}
                  disabled
                  className="w-full p-2.5 rounded-lg border-2 border-slate-100 bg-slate-50 text-slate-500 font-mono text-sm cursor-not-allowed"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-teal-700 transition-colors">
                  Update Profile
                </button>
              </div>
            </div>
          </div>

          {/* Developer / API Keys */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-bold text-slate-900">Developer API Keys</h2>
               <button className="text-teal-600 text-sm font-bold hover:text-teal-800">+ Generate New Key</button>
             </div>
             
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-slate-900">Production Integration</div>
                  <div className="text-xs font-mono text-slate-500 mt-1">sk_live_••••••••••••••••8f92</div>
                </div>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
             </div>
          </div>
        </div>

        {/* Sidebar Security */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-4">Security Status</h3>
            
            <ul className="space-y-4">
              <li className="flex justify-between items-center border-b border-slate-700 pb-4">
                <div>
                  <span className="block text-sm font-bold">Two-Factor Auth</span>
                  <span className="text-xs text-slate-400">Authenticator App</span>
                </div>
                {profileData.mfaEnabled ? (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded font-bold uppercase">Enabled</span>
                ) : (
                  <button className="bg-teal-600 text-white text-xs px-3 py-1.5 rounded font-bold">Enable</button>
                )}
              </li>
              
              <li className="flex justify-between items-center pt-2">
                <div>
                  <span className="block text-sm font-bold">Password</span>
                  <span className="text-xs text-slate-400">Last changed {profileData.lastPasswordChange}</span>
                </div>
                <button className="text-slate-300 hover:text-white text-xs font-bold underline">Change</button>
              </li>
            </ul>
          </div>
        </div>
        
      </div>
    </div>
  );
}