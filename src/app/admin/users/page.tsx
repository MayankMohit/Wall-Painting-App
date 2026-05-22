'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'painter';
  status: 'active' | 'suspended';
  joinedAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'owner' | 'painter' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setIsLoading(true);
      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/users
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 600));

      if (isMounted) {
        setUsers([
          { _id: 'u_901', name: 'SuperAdmin', email: 'admin@wallpainter.com', role: 'admin', status: 'active', joinedAt: 'Jan 10, 2024' },
          { _id: 'u_105', name: 'Premier Painting Co.', email: 'owner@premier.com', role: 'owner', status: 'active', joinedAt: 'Mar 15, 2024' },
          { _id: 'u_106', name: 'City Colors LLC', email: 'hello@citycolors.com', role: 'owner', status: 'suspended', joinedAt: 'Apr 02, 2024' },
          { _id: 'u_201', name: 'Alex Johnson', email: 'alex@wallpainter.com', role: 'painter', status: 'active', joinedAt: 'Oct 12, 2024' },
          { _id: 'u_202', name: 'Maria Garcia', email: 'maria@wallpainter.com', role: 'painter', status: 'active', joinedAt: 'Oct 14, 2024' },
          { _id: 'u_205', name: 'James Wilson', email: 'james@wallpainter.com', role: 'painter', status: 'active', joinedAt: 'Oct 18, 2024' },
        ]);
        setIsLoading(false);
      }
    };

    fetchUsers();
    return () => { isMounted = false; };
  }, []);

  // Filter and Search Logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'suspended') return user.status === 'suspended';
    return user.role === filter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Global Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Directory</h1>
          <p className="text-slate-500 mt-1">Manage platform access, roles, and account statuses.</p>
        </div>
        <div className="w-full sm:w-72 relative">
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm text-slate-900"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      {/* Role Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'admin', 'owner', 'painter', 'suspended'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${
              filter === f 
                ? f === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-slate-900 text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 animate-pulse">Loading directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 hidden sm:table-cell">Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{user.name}</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                        user.role === 'admin' ? 'bg-teal-100 text-teal-800' :
                        user.role === 'owner' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.status === 'active' ? (
                        <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm font-bold text-red-600">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span> Suspended
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-500 font-medium hidden sm:table-cell">
                      {user.joinedAt}
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/admin/users/${user._id}`}
                        className="text-teal-600 font-bold text-sm hover:text-teal-800 hover:underline px-3 py-2 rounded-md transition-colors"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-slate-500 font-medium">
                No users found matching your search or filter.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}