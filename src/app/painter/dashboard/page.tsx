'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface Submission {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Job {
  _id: string;
  companyName: string;
  status: 'active' | 'completed' | 'invoiced';
  updatedAt: string;
  painters: any[]; 
  submissions: Submission[]; 
}

// Helper to format "Last edited" time
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) {
    const hrs = Math.floor(diffInSeconds / 3600);
    return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
  }
  if (diffInSeconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function PainterDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchJobs = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing. Please log in.');

        const res = await fetch('/api/jobs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to fetch jobs');
        }

        const json = await res.json();
        const fetchedJobs: Job[] = json?.data?.jobs || json?.jobs || [];

        if (isMounted) {
          setJobs(fetchedJobs);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchJobs();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <header className="border-b border-gray-200 pb-6 mt-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Jobs</h1>
          <p className="text-gray-500 mt-1 font-medium">Welcome back, {user?.name?.split(' ')[0] || 'Painter'}. Here are your active assignments.</p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm text-sm font-medium">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-gray-500 font-medium">Loading your assignments...</span>
        </div>
      ) : (
        
        /* Jobs Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            // Calculate pending submissions for this specific job
            // Note: If your API doesn't populate submissions yet, this will default to 0.
            const pendingCount = job.submissions?.filter(s => s.status === 'pending').length || 0;
            const paintersCount = job.painters?.length || 1;

            return (
              <Link 
                href={`/painter/jobs/${job._id}`}
                key={job._id} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col justify-between h-full cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="font-black text-xl text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {job.companyName}
                    </h3>
                    {job.status !== 'active' && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest bg-gray-100 text-gray-600 shrink-0">
                        {job.status}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 font-medium mb-6">
                    Last edited {getRelativeTime(job.updatedAt)}
                  </p>
                  
                  <div className="space-y-3">
                    {/* Team Size */}
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 shrink-0 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                      </div>
                      {paintersCount} {paintersCount === 1 ? 'Painter' : 'Painters'} assigned
                    </div>

                    {/* Pending Status */}
                    <div className="flex items-center gap-3 text-sm font-medium">
                      {pendingCount > 0 ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0 text-orange-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </div>
                          <span className="text-[#EA580C]">{pendingCount} pending submissions</span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0 text-emerald-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                          </div>
                          <span className="text-emerald-600 font-bold">All clear</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {jobs.length === 0 && !error && (
            <div className="col-span-full bg-white p-16 text-center rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-5xl mb-4">🙌</div>
              <p className="text-gray-900 font-black text-xl tracking-tight">No active assignments</p>
              <p className="text-gray-500 mt-2 font-medium">You don't have any jobs assigned right now. Enjoy the break!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}