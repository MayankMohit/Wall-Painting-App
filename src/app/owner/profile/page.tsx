'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import EmailSection from '@/components/common/EmailSection';

export default function OwnerProfilePage() {
  const { user, checkAuth } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    // ---------------------------------------------------------
    // API TESTING PLACEHOLDER: GET /api/owner/profile
    // ---------------------------------------------------------
    const fetchProfile = async () => {
      await new Promise(resolve => setTimeout(resolve, 600)); 
      
      if (isMounted) {
        setProfileData({
          name: user?.name || 'Admin User',
          email: user?.email || 'admin@wallpainter.com',
          companyName: 'Premier Painting Co.',
          phone: '+1 (555) 999-0000',
          plan: 'Enterprise',
          stats: { totalJobs: 42, activePainters: 15 }
        });
      }
    };
    
    fetchProfile();
    return () => { isMounted = false; };
  }, [user]);

  if (!profileData) return <div className="p-10 text-center text-gray-500 animate-pulse">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 border-b border-gray-200 pb-4">Company Profile</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-indigo-600"></div>
        
        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md absolute -top-12 flex items-center justify-center text-3xl font-black text-indigo-600">
            {profileData.companyName.charAt(0)}
          </div>
          
          <div className="pt-16 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profileData.companyName}</h2>
              <p className="text-gray-500 font-medium">Managed by {profileData.name}</p>
            </div>
            <span className="bg-indigo-100 text-indigo-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {profileData.plan} Plan
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Details */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Email Address</p>
                  <p className="text-gray-900 font-medium">{profileData.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Business Phone</p>
                  <p className="text-gray-900 font-medium">{profileData.phone}</p>
                </div>
              </div>
            </div>

            {/* Lifetime Stats */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">System Statistics</h3>
              <div className="flex gap-4">
                <div className="bg-gray-50 p-4 rounded-lg flex-1 text-center border border-gray-200">
                  <div className="text-3xl font-black text-gray-900">{profileData.stats.totalJobs}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase mt-1">Lifetime Jobs</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg flex-1 text-center border border-indigo-100">
                  <div className="text-3xl font-black text-indigo-600">{profileData.stats.activePainters}</div>
                  <div className="text-xs text-indigo-800 font-bold uppercase mt-1">Total Staff</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mock Settings Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
              Edit Company Details
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
              Manage Billing
            </button>
          </div>
        </div>
      </div>

      {user && <EmailSection user={user} onEmailUpdated={checkAuth} />}
    </div>
  );
}