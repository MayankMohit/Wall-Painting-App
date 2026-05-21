'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

// Data structure matching GET /api/jobs for a painter
interface Job {
  _id: string;
  jobNumber: string;
  jobName: string;
  location: string;
  status: 'active' | 'completed';
  mySubmissions: number;
}

export default function PainterDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Tracks if the component is currently visible

    const fetchJobs = async () => {
      // 1. Force loading state to true whenever this runs
      setIsLoading(true); 

      // 2. Simulate the API delay (or eventually use real await fetch('/api/jobs'))
      await new Promise(resolve => setTimeout(resolve, 800));

      // 3. ONLY update the state if the user hasn't clicked away
      if (isMounted) {
        setJobs([
          {
            _id: 'job_1042',
            jobNumber: '#1042',
            jobName: 'Tech Park Block A - Exterior',
            location: '123 Main St, Tech Park',
            status: 'active',
            mySubmissions: 4,
          },
          {
            _id: 'job_1088',
            jobNumber: '#1088',
            jobName: 'Corporate Blvd - Main Lobby',
            location: '456 Corporate Blvd',
            status: 'active',
            mySubmissions: 0,
          },
        ]);
        setIsLoading(false);
      }
    };

    fetchJobs();

    // Cleanup: If the component unmounts, just flip the flag.
    // This stops React from trying to update state on a page that isn't there!
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <header className="border-b pb-6">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0] || 'Painter'}!
        </h2>
        <p className="text-gray-500 mt-2">Here are the jobs currently assigned to you.</p>
      </header>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500 font-medium">Loading your assignments...</span>
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-sm font-bold text-blue-600">{job.jobNumber}</span>
                    <h3 className="font-bold text-lg text-gray-900 mt-1">{job.jobName}</h3>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    {job.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    📍 {job.location}
                  </p>
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    🖼️ {job.mySubmissions} Submissions uploaded
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Link 
                  href={`/painter/jobs/${job._id}`}
                  className="w-1/2 text-center bg-gray-50 text-gray-700 py-2 rounded-md font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  View Details
                </Link>
                
              </div>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="col-span-full bg-gray-50 p-10 text-center rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">You don't have any active jobs assigned right now.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}