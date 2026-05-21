'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface Submission {
  _id: string;
  photoNo: string;
  painterName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export default function JobSubmissionsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    let isMounted = true;

    const fetchSubmissions = async () => {
      setIsLoading(true);
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/jobs/:jobId/submissions
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 600));

      if (isMounted) {
        setSubmissions([
          { _id: 'sub_101', photoNo: 'Wall A-12', painterName: 'Alex Johnson', status: 'pending', submittedAt: '2 hours ago' },
          { _id: 'sub_102', photoNo: 'Wall A-13', painterName: 'Maria Garcia', status: 'pending', submittedAt: '3 hours ago' },
          { _id: 'sub_099', photoNo: 'Main Lobby Ceiling', painterName: 'Alex Johnson', status: 'approved', submittedAt: '1 day ago' },
          { _id: 'sub_098', photoNo: 'Exterior North Wall', painterName: 'James Wilson', status: 'rejected', submittedAt: '2 days ago' },
        ]);
        setIsLoading(false);
      }
    };

    fetchSubmissions();
    return () => { isMounted = false; };
  }, [jobId]);

  const filteredSubmissions = submissions.filter(sub => filter === 'all' || sub.status === filter);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Photo Submissions</h2>
        
        {/* Status Filters */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                filter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500 animate-pulse">Loading submissions...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubmissions.map((sub) => (
            <div key={sub._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{sub.photoNo}</h3>
                  <p className="text-sm text-gray-500 mt-1">Submitted by {sub.painterName}</p>
                </div>
                
                {/* Status Badges */}
                {sub.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Pending Review</span>}
                {sub.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Approved</span>}
                {sub.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Rejected</span>}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-medium">{sub.submittedAt}</span>
                <Link 
                  href={`/owner/jobs/${jobId}/submissions/${sub._id}`}
                  className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${
                    sub.status === 'pending' 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sub.status === 'pending' ? 'Review Photos →' : 'View Details'}
                </Link>
              </div>
            </div>
          ))}

          {filteredSubmissions.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">No {filter !== 'all' ? filter : ''} submissions found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}