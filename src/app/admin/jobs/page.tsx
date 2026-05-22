'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GlobalJob {
  _id: string;
  jobNumber: string;
  jobName: string;
  ownerCompany: string;
  ownerEmail: string;
  status: 'active' | 'completed';
  stats: {
    painters: number;
    photos: number;
  };
  createdAt: string;
}

export default function AdminGlobalJobsPage() {
  const [jobs, setJobs] = useState<GlobalJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchGlobalJobs = async () => {
      setIsLoading(true);
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/jobs
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isMounted) {
        setJobs([
          { _id: 'job_1042', jobNumber: '#1042', jobName: 'Tech Park Block A', ownerCompany: 'Premier Painting Co.', ownerEmail: 'owner@premier.com', status: 'active', stats: { painters: 2, photos: 16 }, createdAt: 'Oct 12, 2024' },
          { _id: 'job_1088', jobNumber: '#1088', jobName: 'Corporate Blvd Lobby', ownerCompany: 'Premier Painting Co.', ownerEmail: 'owner@premier.com', status: 'active', stats: { painters: 1, photos: 5 }, createdAt: 'Oct 15, 2024' },
          { _id: 'job_1090', jobNumber: '#1090', jobName: 'City Center Mall L1', ownerCompany: 'City Colors LLC', ownerEmail: 'hello@citycolors.com', status: 'active', stats: { painters: 3, photos: 24 }, createdAt: 'Oct 18, 2024' },
          { _id: 'job_0995', jobNumber: '#0995', jobName: 'Riverside Apartments', ownerCompany: 'City Colors LLC', ownerEmail: 'hello@citycolors.com', status: 'completed', stats: { painters: 4, photos: 45 }, createdAt: 'Aug 02, 2024' }
        ]);
        setIsLoading(false);
      }
    };
    fetchGlobalJobs();
    return () => { isMounted = false; };
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.jobName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.ownerCompany.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return job.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Jobs Monitor</h1>
          <p className="text-slate-500 mt-1">Cross-organization monitoring of active and completed client contracts.</p>
        </div>
        <input 
          type="text" 
          placeholder="Filter by job or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 p-2.5 rounded-lg border-2 border-slate-200 outline-none focus:border-teal-500 text-sm"
        />
      </div>

      <div className="flex gap-2">
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f as any)}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
              statusFilter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 animate-pulse">Querying project logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">Project</th>
                  <th className="p-4">Owner Account</th>
                  <th className="p-4 text-center">Active Team</th>
                  <th className="p-4 text-center">Photos</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{job.jobName}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{job.jobNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{job.ownerCompany}</div>
                      <div className="text-xs text-slate-500">{job.ownerEmail}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700">{job.stats.painters}</td>
                    <td className="p-4 text-center font-bold text-slate-700">{job.stats.photos}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}