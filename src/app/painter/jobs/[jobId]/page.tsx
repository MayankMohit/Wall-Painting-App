'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface JobDetail {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
}

interface Submission {
  _id: string;
  photoNo: number;
  location: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) {
    const hrs = Math.floor(diffInSeconds / 3600);
    return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
  }
  if (diffInSeconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

type FilterTab = 'All' | 'Pending' | 'Approved' | 'Rejected';

export default function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.jobId;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  useEffect(() => {
    let isMounted = true;
    const fetchJobAndSubmissions = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [jobRes, subRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}`, { headers }),
          fetch(`/api/jobs/${jobId}/submissions`, { headers }) 
        ]);

        if (!jobRes.ok || !subRes.ok) throw new Error('Failed to load data');
        const jobJson = await jobRes.json();
        const subJson = await subRes.json();

        if (isMounted) {
          setJob(jobJson?.data || jobJson);
          setSubmissions(subJson?.data || subJson || []);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) { setError(err.message); setIsLoading(false); }
      }
    };
    fetchJobAndSubmissions();
    return () => { isMounted = false; };
  }, [jobId]);

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (error || !job) return <div className="text-center p-10 text-red-600">{error || 'Not found'}</div>;

  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  const filteredSubmissions = activeFilter === 'All' ? submissions : submissions.filter(s => s.status.toLowerCase() === activeFilter.toLowerCase());
  const tabs: FilterTab[] = ['All', 'Pending', 'Approved', 'Rejected'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 mt-4 pb-12">
      
      {/* 1. Header: Back, Title, and top-right Submit Button */}
      <div className="flex justify-between items-center">
        <Link href="/painter/dashboard" className="text-gray-500 hover:text-gray-900 font-bold text-sm transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
          Back to Dashboard
        </Link>
        
        {job.status === 'active' && (
          <Link 
            href={`/painter/jobs/${jobId}/new`}
            className="flex items-center gap-2 bg-[#1f1d1b] text-white px-6 py-3 rounded-full font-black hover:bg-black transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Submit
          </Link>
        )}
      </div>

      {/* 2. Compact Dark Theme Overview Card */}
      <div className="bg-[#1f1d1b] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-[#332f2c] px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-[#EA580C] mb-3 uppercase">
              Current Job
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{job.companyName}</h1>
            <p className="text-gray-400 font-medium max-w-2xl">{job.description}</p>
          </div>
          
          <div className="flex gap-8 border-t md:border-t-0 md:border-l border-gray-700/50 pt-4 md:pt-0 md:pl-8">
            <div className="text-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Approved</div>
              <div className="text-3xl font-black text-white">{approvedCount}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending</div>
              <div className="text-3xl font-black text-white">{pendingCount}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rejected</div>
              <div className="text-3xl font-black text-white">{rejectedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Pills */}
      <div className="flex space-x-2 bg-gray-100 p-1 rounded-full w-full md:w-max overflow-x-auto border border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`whitespace-nowrap px-8 py-2 text-sm font-bold rounded-full transition-all ${
              activeFilter === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4. Submissions List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-16 text-center text-gray-400 font-medium">No {activeFilter.toLowerCase()} submissions.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSubmissions.map((sub) => (
              <Link href={`/painter/jobs/${jobId}/submissions/${sub._id}`} key={sub._id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-gray-50 transition-colors">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-300 flex items-center justify-center border border-gray-200 text-[10px] font-black text-gray-800">JPG</div>
                  <span className="text-xs font-mono text-gray-500">#{sub._id.slice(-6)}</span>
                </div>
                <div className="col-span-6 font-black text-gray-900 text-lg">{sub.location}</div>
                <div className="col-span-2 text-center text-sm font-bold text-gray-500">Photo No. {sub.photoNo}</div>
                <div className="col-span-2 text-right pr-4">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>{sub.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}