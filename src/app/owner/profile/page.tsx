'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import EmailSection from '@/components/common/EmailSection';
import { NotificationPreferences } from '@/components/common/NotificationPreferences';

export default function OwnerProfilePage() {
  const { user, checkAuth } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Edit Mode States ---
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        // 1. Fetch from your REAL endpoint
        const res = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error('Failed to load profile data.');
        const json = await res.json();
        const data = json?.data || json;

        if (isMounted) {
          setProfileData({
            name: data.name || user?.name || 'Admin User',
            email: data.email || user?.email || 'admin@wallpainter.com',
            companyName: data.companyName || 'Premier Painting Co.', // Fallback if not in schema yet
            phone: data.phone || 'Not Provided',
            plan: data.plan || 'Enterprise',
            stats: { 
              totalJobs: data.stats?.totalJobs ?? 0, 
              activePainters: data.stats?.activePainters ?? 0 
            }
          });

          // Seed the edit form with the fetched data
          setEditForm({
            name: data.name || user?.name || '',
            phone: data.phone || ''
          });

          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[PROFILE_FETCH_ERROR]', err);
          setError(err.message || 'An unexpected error occurred.');
          setIsLoading(false);
        }
      }
    };
    
    fetchProfile();
    return () => { isMounted = false; };
  }, [user]);

  // --- Handle Save Updates ---
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      
      // 2. Push updates to your PUT endpoint
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // Optimistically update the UI to match the new saved data
      setProfileData((prev: any) => ({
        ...prev,
        name: editForm.name,
        phone: editForm.phone
      }));
      
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-600 font-bold max-w-4xl mx-auto">
        <p className="bg-red-50 border border-red-200 rounded-2xl p-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center pb-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Company Profile</h1>
        
        {/* Toggle Edit Mode Button */}
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-full transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsEditing(false);
                setEditForm({ name: profileData.name, phone: profileData.phone }); // Reset to current
              }}
              disabled={isSaving}
              className="text-sm font-bold text-gray-500 hover:text-gray-900 px-4 py-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="text-sm font-bold bg-[#1c1b19] hover:bg-black text-white px-5 py-2 rounded-full transition-colors shadow-md disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden transition-all">
        {/* Banner */}
        <div className="h-32 bg-gray-900"></div>
        
        <div className="px-6 pb-8 relative">
          {/* Avatar Identifier Badge */}
          <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md absolute -top-12 flex items-center justify-center text-3xl font-black text-gray-900 select-none">
            {profileData.companyName.charAt(0).toUpperCase()}
          </div>
          
          <div className="pt-16 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{profileData.companyName}</h2>
              <div className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                Managed by:{' '}
                {isEditing ? (
                  <input 
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="border-b-2 border-gray-900 outline-none bg-gray-50 px-2 py-0.5 rounded-md text-gray-900 font-bold max-w-50"
                    placeholder="Your Name"
                    disabled={isSaving}
                  />
                ) : (
                  <span className="text-gray-900 font-bold">{profileData.name}</span>
                )}
              </div>
            </div>
            <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider">
              {profileData.plan} Plan
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-6">
            {/* Contact Details Column */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Email Address</p>
                  <p className="text-gray-900 font-medium break-all">{profileData.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Business Phone</p>
                  {isEditing ? (
                     <input 
                       value={editForm.phone}
                       onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                       className="border-b-2 border-gray-900 outline-none bg-gray-50 px-2 py-1 rounded-md w-full max-w-50 font-medium text-gray-900"
                       placeholder="+1 (555) 000-0000"
                       disabled={isSaving}
                     />
                  ) : (
                    <p className="text-gray-900 font-medium">{profileData.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lifetime Stats Column */}
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">System Statistics</h3>
              <div className="flex gap-4">
                <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl flex-1 text-center shadow-sm">
                  <div className="text-3xl font-black text-gray-900 font-mono">
                    {profileData.stats.totalJobs.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider mt-1">Lifetime Jobs</div>
                </div>
                
                <div className="bg-[#fcfbf9] border border-[#e8e6df] p-5 rounded-2xl flex-1 text-center shadow-sm">
                  <div className="text-3xl font-black text-[#8c8471] font-mono">
                    {profileData.stats.activePainters.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-[#8c8471] font-black uppercase tracking-wider mt-1">Total Staff</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
              Manage Billing
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>

      {/* Security Credentials Section */}
      {user && <EmailSection user={user} onEmailUpdated={checkAuth} />}

      {/* Preferences Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">Notification Settings</h2>
        <NotificationPreferences />
      </div>
    </div>
  );
}