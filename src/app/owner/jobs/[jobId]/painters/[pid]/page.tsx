'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface PainterSubmission {
  _id: string;
  photoNo: number;
  location: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

interface PainterJobDetails {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  submissions: PainterSubmission[];
}

export default function SpecificPainterJobPage({ params }: { params: Promise<{ jobId: string, pid: string }> }) {
  const resolvedParams = use(params);
  // Using pid from your folder structure, which maps to painterId in the API
  const { jobId, pid } = resolvedParams;

  const [details, setDetails] = useState<PainterJobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchPainterAndSubmissions = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        // 1. We fetch BOTH the submissions and the job's painter list at the same time
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [subsRes, paintersRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}/painters/${pid}/submissions`, { headers }), // Your new API route
          fetch(`/api/jobs/${jobId}/painters`, { headers })                     // Getting painter details
        ]);

        if (!subsRes.ok || !paintersRes.ok) {
          throw new Error('Failed to load painter history');
        }

        const subsJson = await subsRes.json();
        const paintersJson = await paintersRes.json();

        // 2. Find this specific painter from the job's roster to get their Name/Email
        const roster = paintersJson?.data || paintersJson || [];
        const currentPainter = roster.find((p: any) => p._id === pid);

        if (isMounted) {
          if (!currentPainter) {
            setError('This painter is not assigned to this job.');
          } else {
            setDetails({
              _id: currentPainter._id,
              name: currentPainter.name,
              email: currentPainter.email,
              phone: currentPainter.phone,
              submissions: subsJson?.data || subsJson || [] // The submissions from your API
            });
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchPainterAndSubmissions();
    return () => { isMounted = false; };
  }, [jobId, pid]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <div className="text-gray-500 font-medium">Loading painter records...</div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl shadow-sm text-center">
        <p className="font-bold text-lg mb-1">Error</p>
        <p>{error}</p>
        <Link href={`/owner/jobs/${jobId}/painters`} className="text-indigo-600 font-bold hover:underline mt-4 inline-block">
          ← Back to Team Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      
      {/* Navigation & Header */}
      <div>
        <Link href={`/owner/jobs/${jobId}/painters`} className="text-indigo-600 hover:underline text-sm font-medium">
          ← Back to Team Roster
        </Link>
        <div className="mt-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-2xl border-2 border-white shadow-sm shrink-0">
              {details.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{details.name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {details.email} {details.phone && `• ${details.phone}`}
              </p>
            </div>
          </div>
          <div className="text-left md:text-right w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Submissions</div>
            <div className="text-3xl font-black text-gray-900">{details.submissions.length}</div>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Upload History for this Job</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {details.submissions.map((sub) => (
            <div key={sub._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition-shadow">
              <div>
                <h4 className="font-bold text-gray-900">Photo #{sub.photoNo} - {sub.location}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {sub.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Pending</span>}
                {sub.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Approved</span>}
                {sub.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Rejected</span>}

                <Link 
                  href={`/owner/jobs/${jobId}/submissions/${sub._id}`}
                  className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded transition-colors whitespace-nowrap border border-transparent hover:border-indigo-100"
                >
                  View File →
                </Link>
              </div>
            </div>
          ))}
          
          {details.submissions.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">This painter has not submitted any photos for this job yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}