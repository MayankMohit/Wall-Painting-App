'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

// Data structure matching GET /api/jobs for an Owner
interface OwnerJob {
  _id: string;
  jobNumber: string;
  jobName: string;
  status: 'active' | 'completed';
  paintersAssigned: number;
  pendingSubmissions: number;
}

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<OwnerJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ---------------------------------------------------------
    // DUMMY DATA FOR FRONTEND TESTING
    // ---------------------------------------------------------
    const timer = setTimeout(() => {
      setJobs([
        {
          _id: 'job_1042',
          jobNumber: '#1042',
          jobName: 'Tech Park Block A - Exterior',
          status: 'active',
          paintersAssigned: 3,
          pendingSubmissions: 5, // Requires owner approval!
        },
        {
          _id: 'job_1088',
          jobNumber: '#1088',
          jobName: 'Corporate Blvd - Main Lobby',
          status: 'completed',
          paintersAssigned: 1,
          pendingSubmissions: 0,
        },
      ]);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <header className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Owner Overview
          </h2>
          <p className="text-slate-500 mt-2">Manage your projects and review painter submissions.</p>
        </div>
        
        {/* Link to create a new job */}
        <Link 
          href="/owner/jobs/new" 
          className="bg-slate-900 text-white px-5 py-2.5 rounded-md font-medium hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Create New Job
        </Link>
      </header>

      {/* High-Level Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium">Active Jobs</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">12</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium">Pending Approvals</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">5</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium">Total Painters</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">8</div>
        </div>
      </div>

      {/* Jobs List */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Projects</h3>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Job ID & Name</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Painters</th>
                  <th className="p-4 font-medium">Submissions</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{job.jobNumber}</div>
                      <div className="text-sm text-slate-500">{job.jobName}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                        job.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{job.paintersAssigned} assigned</td>
                    <td className="p-4">
                      {job.pendingSubmissions > 0 ? (
                        <span className="flex items-center gap-1.5 text-amber-600 font-medium text-sm">
                          <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></span>
                          {job.pendingSubmissions} to review
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">Up to date</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/owner/jobs/${job._id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-slate-200 px-3 py-1.5 rounded bg-white hover:bg-slate-50"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}