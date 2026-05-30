'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

// Data structure perfectly matching your JobSchema
interface Job {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  submissions: any[]; 
}

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

        // This hits your backend, which automatically filters for jobs where this painter's ID is in the painters array!
        const res = await fetch('/api/jobs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to fetch jobs');
        }

        const json = await res.json();
        
        // Safely extract the jobs array from your backend's pagination object
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
      <header className="border-b border-gray-200 pb-6 mt-4">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0] || 'Painter'}!
        </h2>
        <p className="text-gray-500 mt-2">Here are the projects currently assigned to you.</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative shadow-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-500 font-medium">Loading your assignments...</span>
        </div>
      ) : (
        /* Jobs Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div 
              key={job._id} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-xl text-gray-900 truncate">{job.companyName}</h3>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                    job.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                    job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-6">
                  {job.description && (
                    <p className="text-gray-600 text-sm flex items-start gap-2">
                      <span>📍</span> 
                      <span className="line-clamp-2">{job.description}</span>
                    </p>
                  )}
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span>🖼️</span> 
                    {/* Note: This shows total submissions on the job. To get only THIS painter's submissions, we'd need a different backend query */}
                    {job.submissions?.length || 0} Total project photos
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Link 
                  href={`/painter/jobs/${job._id}`}
                  className="w-full text-center bg-blue-50 text-blue-700 py-2.5 rounded-lg font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  Enter the Job
                </Link>
              </div>
            </div>
          ))}

          {jobs.length === 0 && !error && (
            <div className="col-span-full bg-gray-50 p-12 text-center rounded-xl border border-dashed border-gray-300">
              <div className="text-4xl mb-3">🎨</div>
              <p className="text-gray-900 font-bold text-lg">No active assignments</p>
              <p className="text-gray-500 mt-1">You don't have any active jobs assigned right now. Check back later!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}