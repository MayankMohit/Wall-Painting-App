'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Data structure perfectly matching your Mongoose JobSchema
interface Job {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  painters: string[];
  submissions: string[];
  createdAt: string;
}

export default function OwnerJobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'invoiced'>('all');

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
        
        // Extract the jobs array from your backend's pagination object
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

  // Filter logic
  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Jobs</h1>
          <p className="text-gray-500 mt-1">Manage projects, painters, and review photo submissions.</p>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'completed', 'invoiced'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${
              filter === f 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        /* Jobs Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <div key={job._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              
              {/* Card Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-xl text-gray-900 truncate">{job.companyName}</h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                    {job.description || 'No description provided.'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${
                  job.status === 'active' ? 'bg-indigo-100 text-indigo-800' : 
                  job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {job.status}
                </span>
              </div>

              {/* Stats Row */}
              <div className="bg-gray-50 p-4 grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-100">
                <div className="text-center px-2">
                  <div className="text-lg font-black text-gray-900">{job.painters?.length || 0}</div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Assigned Painters</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-lg font-black text-gray-900">{job.submissions?.length || 0}</div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Total Submissions</div>
                </div>
              </div>

              {/* Footer Action */}
              <div className="p-4 bg-white mt-auto">
                <Link 
                  href={`/owner/jobs/${job._id}`}
                  className="block w-full text-center bg-indigo-50 text-indigo-700 py-2.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                >
                  Manage Job Details →
                </Link>
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">No jobs found matching this filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}