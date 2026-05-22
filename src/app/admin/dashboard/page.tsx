'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SystemStats {
  users: { total: number; activeToday: number; suspended: number };
  jobs: { total: number; active: number; completed: number };
  queue: { pendingTasks: number; failedTasks: number; workersActive: number };
  storage: { usedGB: number; totalGB: number; percentFull: number };
  serverHealth: 'optimal' | 'degraded' | 'critical';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSystemStats = async () => {
      setIsLoading(true);

      // ---------------------------------------------------------
      // API TESTING PLACEHOLDER: GET /api/admin/dashboard-stats
      // ---------------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 800));

      if (isMounted) {
        setStats({
          users: { total: 1245, activeToday: 312, suspended: 14 },
          jobs: { total: 3890, active: 142, completed: 3748 },
          queue: { pendingTasks: 24, failedTasks: 2, workersActive: 4 },
          storage: { usedGB: 412, totalGB: 1000, percentFull: 41.2 },
          serverHealth: 'optimal'
        });
        setIsLoading(false);
      }
    };

    fetchSystemStats();
    return () => { isMounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        <span className="ml-3 text-slate-500 font-medium">Loading system metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Overview</h1>
          <p className="text-slate-500 mt-2">Real-time system health, queue depth, and storage metrics.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-700 font-bold text-sm uppercase tracking-wider">System Optimal</span>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Users Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Users</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">{stats?.users.total.toLocaleString()}</div>
            <Link href="/admin/users" className="text-teal-600 hover:text-teal-700 text-sm font-bold hover:underline">Manage →</Link>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium">
            <span className="text-emerald-600">{stats?.users.activeToday} active today</span> • <span className="text-red-500">{stats?.users.suspended} suspended</span>
          </p>
        </div>

        {/* Global Jobs Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Global Jobs</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">{stats?.jobs.total.toLocaleString()}</div>
            <Link href="/admin/jobs" className="text-teal-600 hover:text-teal-700 text-sm font-bold hover:underline">View All →</Link>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium">
            <span className="text-blue-600">{stats?.jobs.active} currently active</span>
          </p>
        </div>

        {/* Queue Depth Card */}
        <div className={`p-6 rounded-xl shadow-sm border ${stats?.queue.failedTasks && stats.queue.failedTasks > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Background Tasks</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">{stats?.queue.pendingTasks}</div>
            <Link href="/admin/background-jobs" className="text-teal-600 hover:text-teal-700 text-sm font-bold hover:underline">Inspect →</Link>
          </div>
          <p className="text-xs mt-4 font-medium flex justify-between">
            <span className="text-slate-500">{stats?.queue.workersActive} workers active</span>
            {stats?.queue.failedTasks && stats.queue.failedTasks > 0 && (
              <span className="text-red-600 font-bold">{stats.queue.failedTasks} failed tasks</span>
            )}
          </p>
        </div>

        {/* Storage Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Storage</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">{stats?.storage.usedGB}<span className="text-lg text-slate-400 ml-1">GB</span></div>
            <Link href="/admin/storage" className="text-teal-600 hover:text-teal-700 text-sm font-bold hover:underline">Details →</Link>
          </div>
          {/* Progress Bar */}
          <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${stats?.storage.percentFull && stats.storage.percentFull > 80 ? 'bg-red-500' : 'bg-teal-500'}`} 
              style={{ width: `${stats?.storage.percentFull}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium text-right">{stats?.storage.percentFull}% capacity</p>
        </div>
      </div>
    </div>
  );
}