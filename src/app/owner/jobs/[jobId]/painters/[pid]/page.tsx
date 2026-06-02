'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface Submission {
  _id: string;
  location: string;
  photoNo: number;
  sizes: [number, number][];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

interface PainterData {
  job: { companyName: string };
  painter: { name: string };
  stats: {
    pending: number;
    approved: number;
    rejected: number;
  };
  submissions: Submission[];
}

// Helper: Calculate total area from sizes array [[w,h], [w,h]]
const calculateArea = (sizes: [number, number][]) => {
  return sizes.reduce((total, [w, h]) => total + (w * h), 0).toFixed(1);
};

// Helper: Format relative time
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function PainterReviewQueuePage({ params }: { params: Promise<{ jobId: string, pid: string }> }) {
  const resolvedParams = use(params);
  const { jobId, pid } = resolvedParams;

  const [data, setData] = useState<PainterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchPainterData = async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing.');

        const res = await fetch(`/api/jobs/${jobId}/painters/${pid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load painter data');
        const json = await res.json();
        
        if (isMounted) {
          setData(json.data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchPainterData();
    return () => { isMounted = false; };
  }, [jobId, pid]);

  if (isLoading) return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (error || !data) return <div className="text-red-500 p-6 text-center">{error || 'Data not found'}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 mt-4 pb-12">
      
      {/* Back Button */}
      <div className="mb-2">
        <Link href={`/owner/jobs/${jobId}`} className="text-gray-500 hover:text-gray-900 text-sm font-bold transition-colors">
          ← Back to Command Center
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">{data.painter.name}</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">
          {data.job.companyName} · review queue
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PENDING */}
        <div className="bg-white p-5 rounded-2xl border-y border-r border-gray-200 border-l-4 border-l-[#EA580C] shadow-sm flex flex-col justify-between h-32">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">PENDING</div>
          <div className="text-5xl font-black text-[#EA580C]">{data.stats.pending}</div>
          <div className="text-xs font-bold text-gray-400 mt-2 hover:text-[#EA580C] cursor-pointer flex items-center gap-1 transition-colors w-max">
            Open <span className="text-[10px]">❯</span>
          </div>
        </div>

        {/* APPROVED */}
        <div className="bg-white p-5 rounded-2xl border-y border-r border-gray-200 border-l-4 border-l-emerald-600 shadow-sm flex flex-col justify-between h-32">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">APPROVED</div>
          <div className="text-5xl font-black text-emerald-600">{data.stats.approved}</div>
          <div className="text-xs font-bold text-gray-400 mt-2 hover:text-emerald-600 cursor-pointer flex items-center gap-1 transition-colors w-max">
            Open <span className="text-[10px]">❯</span>
          </div>
        </div>

        {/* REJECTED */}
        <div className="bg-white p-5 rounded-2xl border-y border-r border-gray-200 border-l-4 border-l-red-600 shadow-sm flex flex-col justify-between h-32">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">REJECTED</div>
          <div className="text-5xl font-black text-red-600">{data.stats.rejected}</div>
          <div className="text-xs font-bold text-gray-400 mt-2 hover:text-red-600 cursor-pointer flex items-center gap-1 transition-colors w-max">
            Open <span className="text-[10px]">❯</span>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">All submissions</h2>
        
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-widest bg-[#f9f9f8]">
            <div className="col-span-2">ID</div>
            <div className="col-span-4">LOCATION</div>
            <div className="col-span-2">PHOTO NO.</div>
            <div className="col-span-2">AREA</div>
            <div className="col-span-2">STATUS</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {data.submissions.map((sub) => (
              <Link 
                href={`/owner/jobs/${jobId}/submissions/${sub._id}`} 
                key={sub._id} 
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors group cursor-pointer"
              >
                {/* ID with Image Placeholder */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 border border-gray-300">
                    <span className="text-[10px] font-bold text-gray-400">JPG</span>
                  </div>
                  <span className="text-sm font-mono text-gray-500">
                    #{sub._id.slice(-4)}-{sub.photoNo.toString().padStart(3, '0')}
                  </span>
                </div>

                {/* Location */}
                <div className="col-span-4 font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                  {sub.location}
                </div>

                {/* Photo No */}
                <div className="col-span-2 font-black text-gray-900 text-sm">
                  {sub.photoNo.toString().padStart(2, '0')}
                </div>

                {/* Area */}
                <div className="col-span-2 font-mono text-gray-500 text-sm">
                  {calculateArea(sub.sizes)} ft²
                </div>

                {/* Status & Time */}
                <div className="col-span-2 flex items-center justify-between pr-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-[#F3E8E3] text-[#A68A7E]' // Exact beige/brown from your mockup
                  }`}>
                    • {sub.status}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {getRelativeTime(sub.submittedAt)}
                  </span>
                </div>
              </Link>
            ))}

            {data.submissions.length === 0 && (
              <div className="p-10 text-center text-gray-500 font-medium">No submissions yet from this painter.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}