'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface PainterSubmission {
  _id: string;
  photoNo: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

interface PainterJobDetails {
  name: string;
  email: string;
  phone: string;
  submissions: PainterSubmission[];
}

export default function SpecificPainterJobPage({ params }: { params: Promise<{ jobId: string, pid: string }> }) {
  const resolvedParams = use(params);
  const { jobId, pid } = resolvedParams;

  const [details, setDetails] = useState<PainterJobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPainterDetails = async () => {
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/jobs/:jobId/painters/:pid
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 600));

      if (isMounted) {
        setDetails({
          name: 'Alex Johnson',
          email: 'alex@wallpainter.com',
          phone: '+1 (555) 123-4567',
          submissions: [
            { _id: 'sub_101', photoNo: 'Wall A-12', status: 'pending', submittedAt: '2 hours ago' },
            { _id: 'sub_099', photoNo: 'Main Lobby Ceiling', status: 'approved', submittedAt: '1 day ago' },
            { _id: 'sub_090', photoNo: 'East Corridor', status: 'approved', submittedAt: '2 days ago' },
          ]
        });
        setIsLoading(false);
      }
    };

    fetchPainterDetails();
    return () => { isMounted = false; };
  }, [jobId, pid]);

  if (isLoading) return <div className="py-20 text-center text-gray-500 animate-pulse">Loading painter records...</div>;

  return (
    <div className="space-y-6 mt-6">
      
      {/* Navigation & Header */}
      <div>
        <Link href={`/owner/jobs/${jobId}/painters`} className="text-indigo-600 hover:underline text-sm font-medium">
          ← Back to Team Roster
        </Link>
        <div className="mt-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-2xl border-2 border-white shadow-sm">
              {details?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{details?.name}</h2>
              <p className="text-gray-500 text-sm mt-1">{details?.email} • {details?.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Submissions</div>
            <div className="text-2xl font-black text-gray-900">{details?.submissions.length}</div>
          </div>
        </div>
      </div>

      {/* Submissions List for this specific Painter */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Upload History for this Job</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {details?.submissions.map((sub) => (
            <div key={sub._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900">{sub.photoNo}</h4>
                <p className="text-sm text-gray-500 mt-1">{sub.submittedAt}</p>
              </div>
              
              <div className="flex items-center gap-4">
                {sub.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Pending</span>}
                {sub.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Approved</span>}
                {sub.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Rejected</span>}

                <Link 
                  href={`/owner/jobs/${jobId}/submissions/${sub._id}`}
                  className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded transition-colors"
                >
                  View File →
                </Link>
              </div>
            </div>
          ))}
          
          {details?.submissions.length === 0 && (
            <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">This painter hasn't submitted any photos for this job yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}