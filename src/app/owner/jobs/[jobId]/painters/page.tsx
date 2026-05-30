'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface AssignedPainter {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  submissionCount: number;
}

export default function JobPaintersPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [painters, setPainters] = useState<AssignedPainter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allSystemPainters, setAllSystemPainters] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const fetchAssignedPainters = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}/painters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load painters');
      
      const json = await res.json();
      setPainters(json?.data || json || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedPainters();
  }, [jobId]);

  // ==========================================
  // REAL API CALL: DELETE (Remove Painter)
  // ==========================================
  const handleRemovePainter = async (painterId: string, painterName: string) => {
    if (!confirm(`Are you sure you want to remove ${painterName} from this project?`)) return;
    
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}/painters/${painterId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to remove painter');
      }

      // Optimistically update UI
      setPainters(painters.filter(p => p._id !== painterId));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // ==========================================
  // REAL API CALL: POST (Add Painter)
  // ==========================================
  const handleOpenAddModal = async () => {
    setIsAddModalOpen(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      // Fetch all system painters (using the secure route we built earlier)
      const res = await fetch('/api/painters', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setAllSystemPainters(json?.data || json || []);
    } catch (err) {
      console.error("Failed to load global painters", err);
    }
  };

  const handleAddPainter = async (painterId: string) => {
    setIsAdding(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}/painters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ painterId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to add painter');
      }

      // Refresh the list to show the newly added painter with their stats
      await fetchAssignedPainters();
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  // Filter out painters that are already assigned to the job
  const assignedPainterIds = new Set(painters.map(p => p._id));
  const unassignedPainters = allSystemPainters.filter(p => !assignedPainterIds.has(p._id));

  return (
    <div className="space-y-6 mt-6 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Assigned Team</h2>
          <p className="text-sm text-gray-500 mt-1">Manage the painters working on this location.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors text-sm border border-indigo-200 shadow-sm"
        >
          + Assign Another Painter
        </button>
      </div>

      {/* Add Painter Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Assign Painter</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-2 overflow-y-auto flex-1">
              {allSystemPainters.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading available painters...</div>
              ) : unassignedPainters.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">All available painters are already assigned to this job.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {unassignedPainters.map(p => (
                    <div key={p._id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.email}</p>
                      </div>
                      <button 
                        onClick={() => handleAddPainter(p._id)}
                        disabled={isAdding}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                      >
                        {isAdding ? 'Adding...' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}

      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <div className="text-gray-500 font-medium">Loading team data...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {painters.map((painter) => (
            <div key={painter._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              
              <Link 
                href={`/owner/jobs/${jobId}/painters/${painter._id}`}
                className="p-6 border-b border-gray-100 flex gap-4 items-center bg-gray-50/50 hover:bg-indigo-50 transition-colors group"
              >
                <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl flex-shrink-0 border-2 border-white shadow-sm">
                  {painter.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-700 flex items-center justify-between">
                    {painter.name}
                    <span className="text-indigo-600 opacity-0 group-hover:opacity-100 text-sm font-bold">View Submissions →</span>
                  </h3>
                  <div className="text-sm text-gray-500 flex flex-col mt-0.5">
                    <span>✉️ {painter.email}</span>
                    {painter.phone && <span>📞 {painter.phone}</span>}
                  </div>
                </div>
              </Link>

              <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between px-6">
                <div>
                  <div className="text-xl font-black text-gray-900">{painter.submissionCount}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Total Submissions</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 mt-auto flex justify-between items-center px-6">
                {painter.phone ? (
                  <a href={`tel:${painter.phone}`} className="text-xs font-bold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm">Call Painter</a>
                ) : <span className="text-xs text-gray-400">No phone</span>}
                
                <button 
                  onClick={() => handleRemovePainter(painter._id, painter.name)}
                  className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline px-2 py-1 rounded"
                >
                  Remove from Job
                </button>
              </div>
            </div>
          ))}

          {painters.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">No painters assigned yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}