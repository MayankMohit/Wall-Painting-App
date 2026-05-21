'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function PainterProfilePage() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // ---------------------------------------------------------
    // API TESTING PLACEHOLDER: 
    // When the backend API gets done, we test the GET /api/profile here
    // ---------------------------------------------------------
    const fetchProfile = async () => {
      await new Promise(resolve => setTimeout(resolve, 600)); // Network delay
      
      setProfileData({
        name: user?.name || 'Test Painter',
        email: user?.email || 'painter@test.com',
        phone: '+1 (555) 123-4567',
        joined: 'March 2024',
        stats: { completedJobs: 14, pendingApprovals: 3 }
      });
    };
    fetchProfile();
  }, [user]);

  if (!profileData) return <div className="p-10 text-center animate-pulse">Loading profile...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Background */}
        <div className="h-32 bg-blue-600"></div>
        
        <div className="px-6 pb-6 relative">
          {/* Avatar Fake Image */}
          <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md absolute -top-12 flex items-center justify-center text-3xl font-bold text-blue-600">
            {profileData.name.charAt(0)}
          </div>
          
          <div className="pt-16">
            <h2 className="text-2xl font-bold text-gray-900">{profileData.name}</h2>
            <p className="text-gray-500">Professional Painter</p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Info</h3>
              <div className="space-y-3">
                <p className="text-gray-900"><span className="text-gray-500 w-20 inline-block">Email:</span> {profileData.email}</p>
                <p className="text-gray-900"><span className="text-gray-500 w-20 inline-block">Phone:</span> {profileData.phone}</p>
                <p className="text-gray-900"><span className="text-gray-500 w-20 inline-block">Joined:</span> {profileData.joined}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Performance</h3>
              <div className="flex gap-4">
                <div className="bg-blue-50 p-4 rounded-lg flex-1 text-center border border-blue-100">
                  <div className="text-2xl font-bold text-blue-600">{profileData.stats.completedJobs}</div>
                  <div className="text-xs text-blue-800 font-medium mt-1">Completed</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg flex-1 text-center border border-yellow-100">
                  <div className="text-2xl font-bold text-yellow-600">{profileData.stats.pendingApprovals}</div>
                  <div className="text-xs text-yellow-800 font-medium mt-1">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}