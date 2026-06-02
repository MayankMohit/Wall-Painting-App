'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Painter {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

export default function PaintersDirectoryPage() {
  const [painters, setPainters] = useState<Painter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search so we don't spam the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;

    const fetchPainters = async () => {
      setIsLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('Authentication token missing. Please log in.');

        const queryParam = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : '';
        const res = await fetch(`/api/users${queryParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch painters');

        const json = await res.json();
        const data = json?.data?.users || json?.users || [];

        if (isMounted) {
          setPainters(data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchPainters();
    return () => { isMounted = false; };
  }, [debouncedSearch]);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painters Directory</h1>
          <p className="text-gray-500 mt-1">Manage your team and view contact information.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-600 focus:ring-0 text-sm font-medium outline-none transition-colors"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative shadow-sm">
          {error}
        </div>
      )}

      {/* Painters Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 p-4 border-b border-gray-200 bg-[#f9f9f8] text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">PAINTER INFO</div>
          <div className="col-span-3">PHONE</div>
          <div className="col-span-3">JOINED</div>
          <div className="col-span-2 text-right">STATUS</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : painters.length > 0 ? (
            painters.map((painter) => (
              <div key={painter._id} className="grid grid-cols-12 p-4 items-center hover:bg-gray-50 transition-colors">
                
                {/* Painter Info (Avatar + Name + Email) */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#9CA3AF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {painter.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-base truncate">{painter.name}</div>
                    <div className="text-xs text-gray-500 truncate">{painter.email}</div>
                  </div>
                </div>

                {/* Phone */}
                <div className="col-span-3 font-mono text-gray-600 text-sm">
                  {painter.phone || 'No phone'}
                </div>

                {/* Joined Date */}
                <div className="col-span-3 text-sm text-gray-500 font-medium">
                  {new Date(painter.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                {/* Status Badge */}
                <div className="col-span-2 text-right">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    painter.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    painter.status === 'suspended' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {painter.status}
                  </span>
                </div>

              </div>
            ))
          ) : (
            <div className="p-16 text-center text-gray-500 font-medium">
              <div className="text-4xl mb-3">🎨</div>
              <p className="text-gray-900 font-bold text-lg">No painters found.</p>
              <p className="text-gray-500 mt-1">Try adjusting your search or add a new painter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}