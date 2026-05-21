'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface JobOverview {
  jobName: string;
  location: string;
  status: string;
  createdAt: string;
  stats: {
    totalPainters: number;
    pendingReviews: number;
    approvedPhotos: number;
    rejectedPhotos: number;
  };
}

export default function JobOverviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [jobData, setJobData] = useState<JobOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchJobOverview = async () => {
      setIsLoading(true);
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/jobs/:jobId/overview
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isMounted) {
        setJobData({
          jobName: 'Tech Park Block A - Exterior',
          location: '123 Main St, Tech Park',
          status: 'active',
          createdAt: 'Oct 12, 2024',
          stats: {
            totalPainters: 2,
            pendingReviews: 3,
            approvedPhotos: 12,
            rejectedPhotos: 1,
          }
        });
        setIsLoading(false);
      }
    };

    fetchJobOverview();
    return () => { isMounted = false; };
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* High-Level Info Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{jobData?.jobName}</h2>
          <p className="text-gray-500 flex items-center gap-2 mt-1">
            📍 {jobData?.location}
          </p>
        </div>
        <div className="text-right">
          <span className="bg-green-100 text-green-800 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
            {jobData?.status} Project
          </span>
          <p className="text-xs text-gray-400 mt-2 font-medium">Created: {jobData?.createdAt}</p>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-black text-gray-900">{jobData?.stats.totalPainters}</div>
          <div className="text-sm font-bold text-gray-500 mt-1">Assigned Painters</div>
          <Link href={`/owner/jobs/${jobId}/painters`} className="text-indigo-600 text-xs font-bold mt-2 inline-block hover:underline">
            Manage Team →
          </Link>
        </div>

        <div className="bg-yellow-50 p-5 rounded-xl shadow-sm border border-yellow-200 text-center relative">
          {jobData?.stats.pendingReviews && jobData.stats.pendingReviews > 0 ? (
            <span className="absolute top-3 right-3 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
          ) : null}
          <div className="text-3xl font-black text-yellow-700">{jobData?.stats.pendingReviews}</div>
          <div className="text-sm font-bold text-yellow-700 mt-1">Pending Review</div>
          <Link href={`/owner/jobs/${jobId}/submissions`} className="text-yellow-700 text-xs font-bold mt-2 inline-block hover:underline">
            Review Now →
          </Link>
        </div>

        <div className="bg-emerald-50 p-5 rounded-xl shadow-sm border border-emerald-200 text-center">
          <div className="text-3xl font-black text-emerald-700">{jobData?.stats.approvedPhotos}</div>
          <div className="text-sm font-bold text-emerald-700 mt-1">Approved Photos</div>
          <Link href={`/owner/jobs/${jobId}/submissions`} className="text-emerald-700 text-xs font-bold mt-2 inline-block hover:underline">
            View Gallery →
          </Link>
        </div>

        <div className="bg-red-50 p-5 rounded-xl shadow-sm border border-red-200 text-center">
          <div className="text-3xl font-black text-red-700">{jobData?.stats.rejectedPhotos}</div>
          <div className="text-sm font-bold text-red-700 mt-1">Rejected Photos</div>
          <span className="text-red-500 text-xs font-medium mt-2 inline-block">
            Waiting on painter fixes
          </span>
        </div>

      </div>
    </div>
  );
}