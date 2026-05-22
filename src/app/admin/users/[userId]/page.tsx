'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserDetail {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'painter';
  status: 'active' | 'suspended';
  joinedAt: string;
  lastLogin: string;
  stats: {
    totalActions: number;
    associatedJobs: number;
  };
}

export default function AdminUserManagePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;
  const router = useRouter();

  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: '' });

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/users/:userId
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 600));

      if (isMounted) {
        const mockUser: UserDetail = {
          _id: userId,
          name: 'Alex Johnson',
          email: 'alex@wallpainter.com',
          role: 'painter',
          status: 'active',
          joinedAt: 'Oct 12, 2024',
          lastLogin: '2 hours ago',
          stats: { totalActions: 142, associatedJobs: 3 }
        };
        
        setUserData(mockUser);
        setFormData({ name: mockUser.name, email: mockUser.email, role: mockUser.role });
        setIsLoading(false);
      }
    };

    fetchUser();
    return () => { isMounted = false; };
  }, [userId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: PUT /api/admin/users/:userId
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('User profile updated successfully!');
      
      if (userData) {
        setUserData({ ...userData, ...formData as any });
      }
    } catch (error) {
      alert("Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const action = userData?.status === 'active' ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: PUT /api/admin/users/:userId/status
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newStatus = userData?.status === 'active' ? 'suspended' : 'active';
      setUserData(prev => prev ? { ...prev, status: newStatus } : null);
      
      alert(`User account has been ${newStatus}.`);
    } catch (error) {
      alert("Failed to change account status.");
    }
  };

  if (isLoading) return <div className="py-20 text-center text-slate-500 animate-pulse">Loading user profile...</div>;
  if (!userData) return <div className="py-20 text-center text-red-500 font-bold">User not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Navigation & Header */}
      <div>
        <Link href="/admin/users" className="text-teal-600 hover:underline text-sm font-medium flex items-center gap-1 w-fit">
          ← Back to Directory
        </Link>
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manage User</h1>
            <p className="text-slate-500 mt-1 font-mono text-xs">ID: {userId}</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
             {userData.status === 'active' ? (
                <span className="bg-emerald-100 text-emerald-800 text-sm px-4 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-2 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Account
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 text-sm px-4 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-2 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Suspended
                </span>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        
        {/* Left Column: Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Profile Details</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={isSaving}
                    className="w-full p-2.5 rounded-lg border-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 disabled:bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={isSaving}
                    className="w-full p-2.5 rounded-lg border-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 disabled:bg-slate-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                  disabled={isSaving}
                  className="w-full p-2.5 rounded-lg border-2 border-slate-200 focus:border-teal-500 outline-none text-slate-900 bg-white disabled:bg-slate-50"
                >
                  <option value="painter">Painter (App User)</option>
                  <option value="owner">Owner (Business Client)</option>
                  <option value="admin">Admin (System Access)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-teal-700 transition-colors disabled:bg-slate-400"
                >
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Stats & Danger Zone */}
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Account Metadata</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-slate-500 font-medium">Joined Date</span>
                <span className="text-slate-900 font-bold">{userData.joinedAt}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500 font-medium">Last Login</span>
                <span className="text-slate-900 font-bold">{userData.lastLogin}</span>
              </li>
              <li className="flex justify-between pt-3 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Platform Actions</span>
                <span className="text-slate-900 font-bold">{userData.stats.totalActions}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500 font-medium">Associated Jobs</span>
                <span className="text-slate-900 font-bold">{userData.stats.associatedJobs}</span>
              </li>
            </ul>
          </div>

          {/* Danger Zone */}
          <div className="bg-white p-6 rounded-xl border-2 border-red-100 shadow-sm">
            <h3 className="text-sm font-black text-red-600 uppercase tracking-wider mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Danger Zone
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">
              {userData.status === 'active' 
                ? 'Suspending this account will immediately revoke their login access and halt all active jobs associated with them.' 
                : 'Activating this account will restore their login access and resume their permissions.'}
            </p>
            
            <button 
              onClick={handleToggleStatus}
              className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors border-2 ${
                userData.status === 'active' 
                  ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300' 
                  : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700'
              }`}
            >
              {userData.status === 'active' ? 'Suspend Account' : 'Restore Account Access'}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}