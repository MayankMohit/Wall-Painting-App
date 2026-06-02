'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Job {
  _id: string;
  companyName: string;
  status: 'active' | 'completed' | 'invoiced';
  // We expect the backend to send these new stats
  stats: {
    submitted: number;
    approved: number;
    pending: number;
  };
}

interface JobStats {
  all: number;
  active: number;
  completed: number;
  invoiced: number;
}

export default function OwnerJobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats>({ all: 0, active: 0, completed: 0, invoiced: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'invoiced'>('active'); // Default to active

  useEffect(() => {
    let isMounted = true;

    const fetchJobsAndStats = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing. Please log in.');

        const headers = { 'Authorization': `Bearer ${token}` };
        const queryParam = filter !== 'all' ? `?status=${filter}` : '';

        const [jobsRes, statsRes] = await Promise.all([
          fetch(`/api/jobs${queryParam}`, { headers }),
          fetch(`/api/jobs/stats`, { headers })
        ]);

        if (!jobsRes.ok) throw new Error('Failed to fetch jobs');

        const jobsJson = await jobsRes.json();
        const statsJson = statsRes.ok ? await statsRes.json() : null;
        
        if (isMounted) {
          setJobs(jobsJson?.data?.jobs || jobsJson?.jobs || []);
          if (statsJson?.data) setStats(statsJson.data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchJobsAndStats();
    return () => { isMounted = false; };
  }, [filter]);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Jobs</h1>
        </div>
        <Link 
          href="/owner/jobs/new"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
        >
          + Create New Job
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative shadow-sm">
          {error}
        </div>
      )}

      {/* Sub-Navbar / Filters matching Mockup Style */}
      <div className="flex flex-wrap gap-3">
        {(['all', 'active', 'completed', 'invoiced'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-sm font-bold capitalize transition-colors border ${
              filter === f 
                ? 'bg-gray-900 text-white border-gray-900' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? `All - ${stats.all}` : `${f} - ${stats[f]}`}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        /* Jobs Data Table List */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Table Header */}
          <div className="grid grid-cols-5 p-4 border-b border-gray-200 bg-[#f9f9f8] text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">JOB</div>
            <div className="text-center">SUBMITTED</div>
            <div className="text-center">APPROVED</div>
            <div className="text-center">PENDING</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <Link 
                href={`/owner/jobs/${job._id}`} 
                key={job._id} 
                className="grid grid-cols-5 p-4 items-center hover:bg-gray-50 transition-colors group cursor-pointer"
              >
                {/* Job Name */}
                <div className="col-span-2 font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors">
                  {job.companyName}
                </div>
                
                {/* Submitted */}
                <div className="text-center font-bold text-gray-900 text-lg">
                  {job.stats?.submitted || 0}
                </div>
                
                {/* Approved (Green) */}
                <div className="text-center font-bold text-emerald-600 text-lg">
                  {job.stats?.approved || 0}
                </div>
                
                {/* Pending (Orange/Red) */}
                <div className="text-center font-bold text-orange-600 text-lg">
                  {job.stats?.pending || 0}
                </div>
              </Link>
            ))}

            {jobs.length === 0 && (
              <div className="p-12 text-center text-gray-500 font-medium">
                No {filter !== 'all' ? filter : ''} jobs found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}