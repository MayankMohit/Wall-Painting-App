'use client';

import { useEffect, useState, use } from 'react';

// Matches your JobSchema
interface JobOverview {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  createdAt: string;
  painters: any[]; 
  submissions: any[];
}

export default function JobOverviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [jobData, setJobData] = useState<JobOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchJobOverview = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        const headers = { 'Authorization': `Bearer ${token}` };

        // --- THE FIX: Fetch Job Data AND Submissions simultaneously ---
        const [jobRes, subsRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}`, { headers }),
          fetch(`/api/jobs/${jobId}/submissions`, { headers })
        ]);

        if (!jobRes.ok) {
          const errData = await jobRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load job details');
        }

        const jobJson = await jobRes.json();
        const subsJson = subsRes.ok ? await subsRes.json() : { data: [] };

        const data = jobJson?.data || jobJson;
        const subsData = subsJson?.data || subsJson || [];

        if (isMounted) {
          // Merge the real submissions array into our job data state
          setJobData({
            ...data,
            submissions: subsData
          });
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchJobOverview();
    return () => { isMounted = false; };
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 font-medium">Loading project details...</p>
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl shadow-sm text-center">
        <p className="font-bold text-lg mb-1">Error Loading Job</p>
        <p>{error || 'Could not find this job.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      
      {/* High-Level Info Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{jobData.companyName}</h2>
          <p className="text-gray-500 mt-2 max-w-2xl">
            {jobData.description || 'No description provided for this project.'}
          </p>
        </div>
        <div className="text-left md:text-right">
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${
            jobData.status === 'active' ? 'bg-indigo-100 text-indigo-800' : 
            jobData.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
            'bg-amber-100 text-amber-800'
          }`}>
            {jobData.status} Project
          </span>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Created: {new Date(jobData.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg text-indigo-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            {/* Handled safely just in case painters isn't populated */}
            <div className="text-3xl font-black text-gray-900">{jobData.painters?.length || 0}</div>
            <div className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">Assigned Painters</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="bg-emerald-50 p-4 rounded-lg text-emerald-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{jobData.submissions?.length || 0}</div>
            <div className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">Total Submissions</div>
          </div>
        </div>
      </div>
      
    </div>
  );
}