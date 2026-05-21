'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Data structure matching GET /api/jobs for the owner
interface JobSummary {
  _id: string;
  jobNumber: string;
  jobName: string;
  location: string;
  status: 'active' | 'completed';
  stats: {
    paintersAssigned: number;
    pendingReviews: number;
    approvedPhotos: number;
  };
  createdAt: string;
}

export default function OwnerJobsListPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    let isMounted = true;

    const fetchJobs = async () => {
      setIsLoading(true);

      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/jobs (Admin View)
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 700));

      if (isMounted) {
        setJobs([
          {
            _id: 'job_1042',
            jobNumber: '#1042',
            jobName: 'Tech Park Block A - Exterior',
            location: '123 Main St, Tech Park',
            status: 'active',
            stats: { paintersAssigned: 2, pendingReviews: 3, approvedPhotos: 12 },
            createdAt: 'Oct 12, 2024'
          },
          {
            _id: 'job_1088',
            jobNumber: '#1088',
            jobName: 'Corporate Blvd - Main Lobby',
            location: '456 Corporate Blvd',
            status: 'active',
            stats: { paintersAssigned: 1, pendingReviews: 5, approvedPhotos: 0 },
            createdAt: 'Oct 15, 2024'
          },
          {
            _id: 'job_1090',
            jobNumber: '#1090',
            jobName: 'City Center Mall - Level 1',
            location: '890 Center Mall',
            status: 'active',
            stats: { paintersAssigned: 3, pendingReviews: 0, approvedPhotos: 24 },
            createdAt: 'Oct 18, 2024'
          },
          {
            _id: 'job_0995',
            jobNumber: '#0995',
            jobName: 'Riverside Apartments - Phase 1',
            location: '100 River Road',
            status: 'completed',
            stats: { paintersAssigned: 4, pendingReviews: 0, approvedPhotos: 45 },
            createdAt: 'Aug 02, 2024'
          }
        ]);
        setIsLoading(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
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

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'completed'].map((f) => (
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
              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <span className="text-sm font-bold text-indigo-600">{job.jobNumber}</span>
                  <h3 className="font-bold text-xl text-gray-900 mt-1">{job.jobName}</h3>
                  <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                    📍 {job.location}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {job.status}
                </span>
              </div>

              {/* Stats Row */}
              <div className="bg-gray-50 p-4 grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-100">
                <div className="text-center px-2">
                  <div className="text-lg font-black text-gray-900">{job.stats.paintersAssigned}</div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Painters</div>
                </div>
                <div className="text-center px-2 relative">
                  {job.stats.pendingReviews > 0 && (
                    <span className="absolute top-0 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  )}
                  <div className={`text-lg font-black ${job.stats.pendingReviews > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {job.stats.pendingReviews}
                  </div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Pending</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-lg font-black text-gray-900">{job.stats.approvedPhotos}</div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Approved</div>
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