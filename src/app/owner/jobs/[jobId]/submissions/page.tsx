'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface Submission {
  _id: string;
  photoNo: number;
  location: string;
  painterName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export default function JobSubmissionsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    let isMounted = true;

    const fetchSubmissionsAndPainters = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Submissions AND Team Roster simultaneously
        const [subsRes, paintersRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}/submissions`, { headers }),
          fetch(`/api/jobs/${jobId}/painters`, { headers }) // To get their names
        ]);

        if (!subsRes.ok) throw new Error('Failed to load submissions.');
        
        const subsJson = await subsRes.json();
        const paintersJson = paintersRes.ok ? await paintersRes.json() : { data: [] };

        const subsData = subsJson?.data || subsJson || [];
        const paintersData = paintersJson?.data || paintersJson || [];

        // Create a lookup dictionary for Painter Names: { "painterId1": "Alex", "painterId2": "Maria" }
        const painterMap = new Map();
        paintersData.forEach((p: any) => painterMap.set(p._id, p.name));

        if (isMounted) {
          // Map backend data to our frontend Submission interface
          const formattedSubmissions = subsData.map((sub: any) => ({
            _id: sub._id,
            photoNo: sub.photoNo,
            location: sub.location,
            painterName: painterMap.get(sub.painterId) || 'Unknown Painter',
            status: sub.status,
            submittedAt: new Date(sub.submittedAt).toLocaleDateString([], { 
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            })
          }));

          setSubmissions(formattedSubmissions);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchSubmissionsAndPainters();
    return () => { isMounted = false; };
  }, [jobId]);

  const filteredSubmissions = submissions.filter(sub => filter === 'all' || sub.status === filter);

  // Quick stats for the tabs
  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  if (error) {
    return (
      <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center shadow-sm">
        <p className="font-bold text-lg">Failed to load submissions</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900">Photo Submissions</h2>
        
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-lg w-full md:w-auto">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-2 ${
                filter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {f} 
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                filter === f ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col justify-center items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <div className="text-gray-500 font-medium">Loading submissions...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubmissions.map((sub) => (
            <div key={sub._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Photo #{sub.photoNo}</h3>
                  <p className="text-sm font-medium text-gray-900 mt-1">{sub.location}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Submitted by {sub.painterName}</p>
                </div>
                
                {/* Status Badges */}
                {sub.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Pending</span>}
                {sub.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Approved</span>}
                {sub.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Rejected</span>}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-medium">{sub.submittedAt}</span>
                <Link 
                  href={`/owner/jobs/${jobId}/submissions/${sub._id}`}
                  className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors border ${
                    sub.status === 'pending' 
                      ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {sub.status === 'pending' ? 'Review Photos →' : 'View Details'}
                </Link>
              </div>
            </div>
          ))}

          {filteredSubmissions.length === 0 && (
            <div className="col-span-full py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-gray-900 font-bold text-lg">No {filter !== 'all' ? filter : ''} submissions found.</p>
              <p className="text-gray-500 mt-1">When painters upload photos for this location, they will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}