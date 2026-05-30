'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface DashboardStats {
  activeJobs: number;
  completedJobs: number;
  invoicedJobs: number;
}

interface Job {
  _id: string;
  companyName: string;
  description: string;
  status: 'active' | 'completed' | 'invoiced';
}

export default function OwnerDashboard() {
  // Pulling the logged-in user from your Zustand store to personalize the UI
  const user = useAuthStore((state) => state.user);
  
  const [stats, setStats] = useState<DashboardStats>({ activeJobs: 0, completedJobs: 0, invoicedJobs: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Grab the exact token key defined in your persistAuth function
        const token = localStorage.getItem('wallpainter_token');
        
        if (!token) throw new Error('Authentication token missing. Please log in again.');

        const res = await fetch('/api/jobs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to fetch jobs');
        }
        
        const json = await res.json();
        
        // Safely extract the jobs array from your backend's pagination object
        const jobs: Job[] = json?.data?.jobs || json?.jobs || [];

        if (isMounted) {
          // Calculate the pipeline stats dynamically
          const active = jobs.filter(j => j.status === 'active').length;
          const completed = jobs.filter(j => j.status === 'completed').length;
          const invoiced = jobs.filter(j => j.status === 'invoiced').length;

          setStats({ activeJobs: active, completedJobs: completed, invoicedJobs: invoiced });
          setRecentJobs(jobs.slice(0, 5)); // Show the 5 most recent jobs
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();

    return () => { isMounted = false; };
  }, []); // Only runs once on mount

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
          <h1 className="text-3xl font-bold text-gray-900">
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Owner Dashboard'}
          </h1>
          <p className="text-gray-500 mt-2">Here is what is happening across your projects today.</p>
        </div>
        <Link 
          href="/owner/jobs/new"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Create New Job
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative shadow-sm">
          {error}
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Jobs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-lg text-indigo-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Jobs</p>
            <p className="text-3xl font-black text-gray-900">{stats.activeJobs}</p>
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-400"></div>
          <div className="bg-emerald-100 p-4 rounded-lg text-emerald-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Completed</p>
            <p className="text-3xl font-black text-gray-900">{stats.completedJobs}</p>
          </div>
        </div>

        {/* Invoiced Jobs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-amber-100 p-4 rounded-lg text-amber-600">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Invoiced</p>
            <p className="text-3xl font-black text-gray-900">{stats.invoicedJobs}</p>
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
        
        {recentJobs.length === 0 && !error && (
          <div className="p-10 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">No jobs found.</p>
            <p className="text-sm">Create your first job to get started!</p>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {recentJobs.map((job) => (
            <div key={job._id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    job.status === 'active' ? 'bg-indigo-100 text-indigo-700' :
                    job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {job.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{job.companyName}</h3>
                <p className="text-sm text-gray-500 truncate max-w-md">{job.description}</p>
              </div>
              
              <Link 
                href={`/owner/jobs/${job._id}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors bg-white shadow-sm whitespace-nowrap"
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