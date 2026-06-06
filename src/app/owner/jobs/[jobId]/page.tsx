'use client';

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

interface PainterStat {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  stats: { submitted: number; approved: number; pending: number; };
}

interface JobDetails {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  createdAt: string;
  endDate?: string;
  stats: { submitted: number; approved: number; pending: number; };
  painters: PainterStat[];
}

export default function JobOverviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [jobData, setJobData] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown & Modal States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddPainterModalOpen, setIsAddPainterModalOpen] = useState(false);

  // Add Painter States
  const [availablePainters, setAvailablePainters] = useState<any[]>([]);
  const [searchPainter, setSearchPainter] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // For Generate Files Modal
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<('excel' | 'pdf_photos' | 'pdf_file')[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Form for Editing Job (Name & Description Only)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { companyName: '', description: '' }
  });

  // ─── FETCH JOB DATA ─────────────────────────────────────────────────────────
  const fetchJobOverview = async () => {
    try {
      const token = localStorage.getItem('wallpainter_token');
      if (!token) throw new Error('Authentication token missing.');

      const res = await fetch(`/api/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to load job details');
      const json = await res.json();

      setJobData(json?.data || json);
      reset({
        companyName: (json?.data || json).companyName,
        description: (json?.data || json).description || ''
      });
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchJobOverview(); }, [jobId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  const handleUpdateJob = async (data?: any, newPainterIds?: string[]) => {
    try {
      const token = localStorage.getItem('wallpainter_token');
      const currentPainterIds = jobData?.painters.map(p => p._id) || [];

      const payload = {
        ...(data && { companyName: data.companyName, description: data.description }),
        painterIds: newPainterIds || currentPainterIds
      };

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update job');

      setIsEditModalOpen(false);
      setIsAddPainterModalOpen(false);
      fetchJobOverview(); // Refresh data to get updated stats and lists
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteJob = async () => {
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete job');
      router.push('/owner/jobs');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openAddPainterModal = async () => {
    setIsAddPainterModalOpen(true);
    setIsAdding(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setAvailablePainters(json?.data?.users || json?.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddPainter = (painterId: string) => {
    const currentPainterIds = jobData?.painters.map(p => p._id) || [];
    if (!currentPainterIds.includes(painterId)) {
      handleUpdateJob(null, [...currentPainterIds, painterId]);
    }
  };


  // ─── RENDER ───────────────────────────────────────────────────────────────
  if (isLoading) return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (error || !jobData) return <div className="text-red-500 p-6 text-center">{error || 'Data not found'}</div>;

  // Filter out painters that are already on the job for the Add Painter modal
  const currentPainterIds = jobData.painters.map(p => p._id);
  const unassignedPainters = availablePainters.filter(p => !currentPainterIds.includes(p._id) &&
    (p.name.toLowerCase().includes(searchPainter.toLowerCase()) || (p.phone && p.phone.includes(searchPainter)))
  );

  return (
    <div className="space-y-8 mt-2 pb-12">
      <div className="mb-4">
        <Link href="/owner/jobs" className="text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">
          ← Back to All Jobs
        </Link>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-200 pb-6 relative">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{jobData.companyName}</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-2xl font-medium">
            {jobData.description || 'No job description provided.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href={`/owner/jobs/${jobId}/files`} className="flex-1 md:flex-none px-5 py-2.5 rounded-full border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-center shadow-sm">
            📄 Files
          </Link>
          <button
            onClick={() => setIsGenModalOpen(true)} // Opens the modal
            className="flex-1 md:flex-none px-5 py-2.5 rounded-full bg-[#EA580C] text-white font-bold hover:bg-[#C2410C] transition-colors shadow-sm"
          >
            ✨ Generate files
          </button>

          {/* 3-Dot Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors border-2 border-transparent"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"></path></svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 overflow-hidden">
                <button
                  onClick={() => { setIsMenuOpen(false); setIsEditModalOpen(true); }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  Edit job
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  Delete job
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: Painters List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-900">Painters <span className="text-gray-400 font-medium">· {jobData.painters?.length || 0}</span></h2>
            <button
              onClick={openAddPainterModal}
              className="px-4 py-2 rounded-full border-2 border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              + Add painter
            </button>
          </div>

          <div className="bg-[#fcfcfb] rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-widest bg-[#f4f4f2]">
              <div className="col-span-5">PAINTER</div>
              <div className="col-span-2 text-center">SUBMITTED</div>
              <div className="col-span-2 text-center">APPROVED</div>
              <div className="col-span-3 text-center">PENDING</div>
            </div>

            <div className="divide-y divide-gray-100 bg-white">
              {jobData.painters?.map((painter) => (
                <Link href={`/owner/jobs/${jobId}/painters/${painter._id}`} key={painter._id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors group cursor-pointer">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#9CA3AF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {painter.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors text-sm">{painter.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{painter.phone || 'No phone'}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center font-black text-gray-900 text-base">{painter.stats.submitted}</div>
                  <div className="col-span-2 text-center font-black text-emerald-600 text-base">{painter.stats.approved}</div>
                  <div className="col-span-3 flex justify-center items-center gap-2">
                    <span className="font-black text-[#EA580C] text-base">{painter.stats.pending}</span>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </Link>
              ))}
              {(!jobData.painters || jobData.painters.length === 0) && (
                <div className="p-10 text-center text-gray-500 font-medium">No painters assigned to this job yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Job Stats */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Job stats</h2>
          <div className="space-y-3">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">SUBMITTED</div>
              <div className="text-5xl font-black text-gray-900">{jobData.stats?.submitted || 0}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">APPROVED</div>
              <div className="text-5xl font-black text-emerald-600">{jobData.stats?.approved || 0}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">PENDING</div>
              <div className="text-5xl font-black text-[#EA580C]">{jobData.stats?.pending || 0}</div>
            </div>
          </div>
          <div className="bg-[#fcfcfb] p-5 rounded-2xl border border-gray-200 shadow-sm mt-4 text-sm font-medium">
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Started</span>
              <span className="text-gray-900 font-mono font-bold">{new Date(jobData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-gray-100 mt-1">
              <span className="text-gray-500">Target end</span>
              <span className="text-gray-900 font-mono font-bold">{jobData.endDate ? new Date(jobData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}

      {/* Edit Job Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-900">Edit Job Settings</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="edit-job-form" onSubmit={handleSubmit((data) => handleUpdateJob(data))} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                  <input {...register('companyName', { required: true })} className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                  <textarea {...register('description')} rows={5} className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-full transition-colors">Cancel</button>
              <button type="submit" form="edit-job-form" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-full transition-colors disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Painter Modal */}
      {isAddPainterModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-900">Add Painter</h2>
              <button onClick={() => setIsAddPainterModalOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <div className="p-4 border-b border-gray-100 relative">
              <input
                type="text"
                placeholder="Search painters by name or phone..."
                value={searchPainter}
                onChange={(e) => setSearchPainter(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm font-medium focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
              />
            </div>

            <div className="overflow-y-auto p-4 space-y-2 flex-1 bg-gray-50">
              {isAdding ? (
                <div className="text-center py-8 text-gray-500 font-medium text-sm">Loading painters...</div>
              ) : unassignedPainters.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-medium text-sm">No available painters found.</div>
              ) : (
                unassignedPainters.map(p => (
                  <div key={p._id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.phone}</p>
                    </div>
                    <button
                      onClick={() => handleAddPainter(p._id)}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Delete Job?</h2>
            <p className="text-sm text-gray-500 mb-8 font-medium">This action cannot be undone. All submissions, files, and photos associated with this job will be permanently destroyed.</p>

            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDeleteJob} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">Delete Job</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Files Modal */}
      {isGenModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-6">
            <h2 className="text-xl font-black text-gray-900">Select files to generate</h2>

            <div className="space-y-3">
              {(['excel', 'pdf_photos', 'pdf_file'] as const).map((type) => (
                <label key={type} className="flex items-center text-gray-700 gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTypes([...selectedTypes, type]);
                      else setSelectedTypes(selectedTypes.filter(t => t !== type));
                    }}
                  />
                  <span className="text-sm font-bold capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsGenModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-600">Cancel</button>
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    const token = localStorage.getItem('wallpainter_token');
                    const res = await fetch(`/api/jobs/${jobId}/files/generate`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        types: selectedTypes,
                        ownerInput: { companyName: jobData?.companyName }
                      })
                    });

                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      throw new Error(errorData.message || 'Failed to start generation');
                    }

                    // Success! Close modal, clear selection, and alert (NO REDIRECT)
                    setIsGenModalOpen(false);
                    setSelectedTypes([]);
                    alert("Files generation started! Head over to the 'Files' tab to download them.");

                  } catch (err: any) {
                    alert(err.message);
                    console.error(err);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                className="flex-1 flex justify-center items-center py-3 bg-[#EA580C] text-white font-bold rounded-xl transition disabled:opacity-50"
                disabled={selectedTypes.length === 0 || isGenerating}
              >
                {isGenerating ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                ) : (
                  'Start Generation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}