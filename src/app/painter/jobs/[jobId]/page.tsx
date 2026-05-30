'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

// Matches your JobSchema
interface JobDetail {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
}

// Matches your SubmissionSchema
interface Submission {
  _id: string;
  photoNo: number;
  location: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export default function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchJobAndSubmissions = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Job Details AND this Painter's Submissions at the same time
        const [jobRes, subRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}`, { headers }),
          // Note: This assumes you have a GET route here that filters submissions by the logged-in painter's token
          fetch(`/api/jobs/${jobId}/submissions`, { headers }) 
        ]);

        if (!jobRes.ok) throw new Error('Failed to load job details');
        if (!subRes.ok) throw new Error('Failed to load submissions');

        const jobJson = await jobRes.json();
        const subJson = await subRes.json();

        if (isMounted) {
          setJob(jobJson?.data || jobJson);
          setSubmissions(subJson?.data || subJson || []);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchJobAndSubmissions();

    return () => { isMounted = false; };
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Loading workspace...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl shadow-sm text-center mt-6">
        <p className="font-bold text-lg mb-1">Error</p>
        <p>{error || 'Could not load project details.'}</p>
        <Link href="/painter/dashboard" className="text-blue-600 font-bold hover:underline mt-4 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Back Button */}
      <Link href="/painter/dashboard" className="text-blue-600 hover:underline text-sm font-medium">
        ← Back to Dashboard
      </Link>

      {/* Job Info Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                job.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {job.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{job.companyName}</h2>
            {job.description && (
              <p className="text-gray-500 mt-2 line-clamp-2 max-w-2xl">
                📍 {job.description}
              </p>
            )}
          </div>
          
          {/* Action Button: Only show if job is active */}
          {job.status === 'active' && (
            <Link 
              href={`/painter/jobs/${jobId}/new`}
              className="w-full md:w-auto text-center bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
            >
              + Add New Submission
            </Link>
          )}
        </div>
      </div>

      {/* Submissions List */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">My Submissions</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {submissions.map((sub) => (
            <div key={sub._id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">Photo #{sub.photoNo} - {sub.location}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted: {new Date(sub.submittedAt).toLocaleDateString()} at {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Status Badges */}
                {sub.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">Pending</span>}
                {sub.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">Approved</span>}
                {sub.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">Rejected</span>}

                {/* Edit / Fix Action */}
                {(sub.status === 'pending' || sub.status === 'rejected') && (
                  <Link 
                    href={`/painter/jobs/${jobId}/submissions/${sub._id}`}
                    className={`text-sm font-bold px-4 py-1.5 rounded transition-colors whitespace-nowrap text-center flex-1 sm:flex-none ${
                      sub.status === 'rejected' 
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' 
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    {sub.status === 'rejected' ? 'Fix & Resubmit' : 'Edit Details'}
                  </Link>
                )}
                
                {/* View Action for Approved */}
                {sub.status === 'approved' && (
                  <Link 
                    href={`/painter/jobs/${jobId}/submissions/${sub._id}`}
                    className="text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-1.5 rounded transition-colors whitespace-nowrap text-center flex-1 sm:flex-none"
                  >
                    View Record
                  </Link>
                )}
              </div>
            </div>
          ))}

          {submissions.length === 0 && !error && (
            <div className="bg-gray-50 py-12 text-center rounded-xl border border-dashed border-gray-300">
              <div className="text-4xl mb-3">📸</div>
              <p className="text-gray-900 font-bold text-lg">No photos submitted yet.</p>
              <p className="text-gray-500 mt-1">Click the button above to upload your first submission for this job.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}