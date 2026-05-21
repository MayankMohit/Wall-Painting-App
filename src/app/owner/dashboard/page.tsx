'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  activeJobs: number;
  pendingReviews: number;
  activePainters: number;
}

interface RecentJob {
  _id: string;
  jobNumber: string;
  jobName: string;
  pendingCount: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setIsLoading(true);

      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/owner/dashboard
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 600));

      if (isMounted) {
        setStats({
          activeJobs: 12,
          pendingReviews: 8,
          activePainters: 5,
        });

        setRecentJobs([
          { _id: 'job_1042', jobNumber: '#1042', jobName: 'Tech Park Block A - Exterior', pendingCount: 3 },
          { _id: 'job_1088', jobNumber: '#1088', jobName: 'Corporate Blvd - Main Lobby', pendingCount: 5 },
          { _id: 'job_1090', jobNumber: '#1090', jobName: 'City Center Mall - Level 1', pendingCount: 0 },
        ]);
        
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    return () => { isMounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-500 font-medium">Loading command center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-500 mt-2">Here is what is happening across your projects today.</p>
        </div>
        <Link 
          href="/owner/jobs/new"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Create New Job
        </Link>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-lg text-indigo-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Jobs</p>
            <p className="text-3xl font-black text-gray-900">{stats?.activeJobs}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-200 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-yellow-400"></div>
          <div className="bg-yellow-100 p-4 rounded-lg text-yellow-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pending Reviews</p>
            <p className="text-3xl font-black text-gray-900">{stats?.pendingReviews}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-lg text-emerald-600">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Painters</p>
            <p className="text-3xl font-black text-gray-900">{stats?.activePainters}</p>
          </div>
        </div>
      </div>

      {/* Jobs Needing Attention */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Jobs</h2>
          <Link href="/owner/jobs" className="text-indigo-600 text-sm font-bold hover:underline">
            View All Jobs →
          </Link>
        </div>
        
        <div className="divide-y divide-gray-200">
          {recentJobs.map((job) => (
            <div key={job._id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-bold text-indigo-600">{job.jobNumber}</span>
                  {job.pendingCount > 0 && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                      {job.pendingCount} Pending Photos
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{job.jobName}</h3>
              </div>
              
              <Link 
                href={`/owner/jobs/${job._id}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors bg-white shadow-sm"
              >
                Manage Job
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}