'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

// Dummy interfaces based on your workflow
interface JobDetail {
  _id: string;
  jobNumber: string;
  jobName: string;
  location: string;
  status: string;
}

interface Submission {
  _id: string;
  photoNo: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export default function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {

  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ---------------------------------------------------------
    // REAL API LOGIC (Matches Step 3 & 4 of your workflow)
    // ---------------------------------------------------------
    /*
    const fetchJobAndSubmissions = async () => {
      const token = localStorage.getItem('token');
      
      // Step 3: Open Job
      const jobRes = await fetch(`/api/jobs/${params.jobId}`, { headers: { Authorization: `Bearer ${token}` } });
      const jobData = await jobRes.json();
      
      // Step 4: See my submissions
      const subRes = await fetch(`/api/jobs/${params.jobId}/submissions`, { headers: { Authorization: `Bearer ${token}` } });
      const subData = await subRes.json();

      setJob(jobData);
      setSubmissions(subData.submissions);
      setIsLoading(false);
    };
    fetchJobAndSubmissions();
    */

    // ---------------------------------------------------------
    // DUMMY DATA FOR FRONTEND TESTING
    // ---------------------------------------------------------
    const timer = setTimeout(() => {
      setJob({
        _id: jobId,
        jobNumber: '#1042',
        jobName: 'Tech Park Block A - Exterior',
        location: '123 Main St, Tech Park',
        status: 'active',
      });

      setSubmissions([
        { _id: 'sub_1', photoNo: 'Wall A-12', status: 'pending', submittedAt: '2 hours ago' },
        { _id: 'sub_2', photoNo: 'Wall A-13', status: 'approved', submittedAt: '1 day ago' },
        { _id: 'sub_3', photoNo: 'Wall B-01', status: 'rejected', submittedAt: '2 days ago' },
      ]);
      
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/painter/dashboard" className="text-blue-600 hover:underline text-sm font-medium">
        ← Back to Dashboard
      </Link>

      {/* Job Info Header (Step 3) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{job?.jobNumber}: {job?.jobName}</h2>
            <p className="text-gray-500 mt-1">📍 {job?.location}</p>
          </div>
          {/* Link to Step 7 (Create Submission) */}
          <Link 
            href={`/painter/jobs/${jobId}/submit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Add New Submission
          </Link>
        </div>
      </div>

      {/* Submissions List (Step 4) */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">My Submissions</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {submissions.map((sub) => (
            <div key={sub._id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900">{sub.photoNo}</h4>
                <p className="text-sm text-gray-500">Submitted: {sub.submittedAt}</p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Status Badges */}
                {sub.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold uppercase">Pending</span>}
                {sub.status === 'approved' && <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold uppercase">Approved</span>}
                {sub.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-bold uppercase">Rejected</span>}

                {/* Steps 8 & 9: Edit/Resubmit Logic */}
                {(sub.status === 'pending' || sub.status === 'rejected') && (
                  <button className="text-sm text-blue-600 hover:underline font-medium border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50">
                    {sub.status === 'rejected' ? 'Fix & Resubmit' : 'Edit'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}