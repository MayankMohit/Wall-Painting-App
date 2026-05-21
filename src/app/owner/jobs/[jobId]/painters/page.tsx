'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

// Data structure matching GET /api/jobs/:jobId/painters
interface AssignedPainter {
  _id: string;
  name: string;
  email: string;
  phone: string;
  stats: {
    submitted: number;
    approved: number;
    rejected: number;
  };
  assignedAt: string;
}

export default function JobPaintersPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [painters, setPainters] = useState<AssignedPainter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAssignedPainters = async () => {
      setIsLoading(true);
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/jobs/:jobId/painters
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isMounted) {
        setPainters([
          {
            _id: 'p_1',
            name: 'Alex Johnson',
            email: 'alex@wallpainter.com',
            phone: '+1 (555) 123-4567',
            stats: { submitted: 14, approved: 10, rejected: 1 },
            assignedAt: 'Oct 12, 2024'
          },
          {
            _id: 'p_2',
            name: 'Maria Garcia',
            email: 'maria@wallpainter.com',
            phone: '+1 (555) 987-6543',
            stats: { submitted: 2, approved: 2, rejected: 0 },
            assignedAt: 'Oct 14, 2024'
          }
        ]);
        setIsLoading(false);
      }
    };

    fetchAssignedPainters();
    return () => { isMounted = false; };
  }, [jobId]);

  const handleRemovePainter = (painterId: string, painterName: string) => {
    if (confirm(`Are you sure you want to remove ${painterName} from this job?`)) {
      console.log(`DELETE /api/jobs/${jobId}/painters/${painterId}`);
      setPainters(painters.filter(p => p._id !== painterId));
    }
  };

  return (
    <div className="space-y-6 mt-6">
      
      {/* Tab Header & Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Assigned Team</h2>
          <p className="text-sm text-gray-500 mt-1">Manage the painters working on this location.</p>
        </div>
        <button className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors text-sm border border-indigo-200">
          + Assign Another Painter
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500 animate-pulse">Loading team data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {painters.map((painter) => (
            <div key={painter._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
              
              {/* FIXED: Card Header is now a Link pointing to [pid] */}
              <Link 
                href={`/owner/jobs/${jobId}/painters/${painter._id}`}
                className="p-6 border-b border-gray-100 flex gap-4 items-center bg-gray-50/50 hover:bg-indigo-50 transition-colors group cursor-pointer"
              >
                <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl flex-shrink-0 border-2 border-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {painter.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-700 transition-colors flex items-center justify-between">
                    {painter.name}
                    <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">View History →</span>
                  </h3>
                  <div className="text-sm text-gray-500 flex flex-col mt-0.5">
                    <span>✉️ {painter.email}</span>
                    <span>📞 {painter.phone}</span>
                  </div>
                </div>
              </Link>

              {/* Stats for this specific job */}
              <div className="p-4 bg-white grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                <div className="text-center px-2">
                  <div className="text-xl font-black text-gray-900">{painter.stats.submitted}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Photos</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-xl font-black text-emerald-600">{painter.stats.approved}</div>
                  <div className="text-xs font-bold text-emerald-600/70 uppercase tracking-wide mt-1">Approved</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-xl font-black text-red-600">{painter.stats.rejected}</div>
                  <div className="text-xs font-bold text-red-600/70 uppercase tracking-wide mt-1">Rejected</div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-gray-50 mt-auto flex justify-between items-center">
                <span className="text-xs text-gray-400 font-medium">Assigned: {painter.assignedAt}</span>
                <button 
                  onClick={() => handleRemovePainter(painter._id, painter.name)}
                  className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline px-2 py-1 rounded transition-colors"
                >
                  Remove from Job
                </button>
              </div>
              
            </div>
          ))}

          {painters.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">No painters are currently assigned to this job.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}