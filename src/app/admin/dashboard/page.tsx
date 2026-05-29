'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface SystemStats {
  users: { total: number; activeToday: number; suspended: number };
  jobs: { total: number; active: number; completed: number };
  queue: { pendingTasks: number; failedTasks: number; workersActive: number };
  storage: { usedGB: number; totalGB: number; percentFull: number };
  serverHealth: 'optimal' | 'degraded' | 'critical';
}

interface PendingOwner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Pending owners state ──────────────────────────────────────────────────
  const [pending, setPending] = useState<PendingOwner[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // ── Toast auto-dismiss ────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Fetch system stats (placeholder) ─────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const fetch_ = async () => {
      setStatsLoading(true);
      await new Promise(r => setTimeout(r, 800));
      if (mounted) {
        setStats({
          users: { total: 1245, activeToday: 312, suspended: 14 },
          jobs: { total: 3890, active: 142, completed: 3748 },
          queue: { pendingTasks: 24, failedTasks: 2, workersActive: 4 },
          storage: { usedGB: 412, totalGB: 1000, percentFull: 41.2 },
          serverHealth: 'optimal',
        });
        setStatsLoading(false);
      }
    };
    fetch_();
    return () => { mounted = false; };
  }, []);

  // ── Fetch pending owners ──────────────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch('/api/users?role=owner&status=inactive', { headers: authHeaders() });
      const json = await res.json();
      if (res.ok) setPending((json.data ?? json).users ?? []);
    } catch {
      setToast({ message: 'Failed to load pending owners', type: 'error' });
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // ── Approve ───────────────────────────────────────────────────────────────
  async function handleApprove(owner: PendingOwner) {
    setActionLoading(owner._id);
    // Optimistic remove
    setPending(prev => prev.filter(o => o._id !== owner._id));
    try {
      const res = await fetch(`/api/admin/users/${owner._id}/approve`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      setToast({ message: `${owner.name} approved successfully`, type: 'success' });
    } catch {
      // Rollback
      setPending(prev => [owner, ...prev]);
      setToast({ message: `Failed to approve ${owner.name}`, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  function openReject(id: string) {
    setRejectingId(id);
    setRejectReason('');
  }

  async function handleReject(owner: PendingOwner) {
    setActionLoading(owner._id);
    setPending(prev => prev.filter(o => o._id !== owner._id));
    setRejectingId(null);
    try {
      const res = await fetch(`/api/admin/users/${owner._id}/reject`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setToast({ message: `${owner.name} rejected`, type: 'success' });
    } catch {
      setPending(prev => [owner, ...prev]);
      setToast({ message: `Failed to reject ${owner.name}`, type: 'error' });
    } finally {
      setActionLoading(null);
      setRejectReason('');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-500"></div>
        <span className="ml-3 font-medium text-slate-500">Loading system metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Platform Overview</h1>
          <p className="mt-2 text-slate-500">Real-time system health, queue depth, and storage metrics.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-700">System Optimal</span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Total Users</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">{stats?.users.total.toLocaleString()}</div>
            <Link href="/admin/users" className="text-sm font-bold text-teal-600 hover:underline">Manage →</Link>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-500">
            <span className="text-emerald-600">{stats?.users.activeToday} active today</span> •{' '}
            <span className="text-red-500">{stats?.users.suspended} suspended</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Global Jobs</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">{stats?.jobs.total.toLocaleString()}</div>
            <Link href="/admin/jobs" className="text-sm font-bold text-teal-600 hover:underline">View All →</Link>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-500">
            <span className="text-blue-600">{stats?.jobs.active} currently active</span>
          </p>
        </div>

        <div className={`rounded-xl p-6 shadow-sm border ${stats?.queue.failedTasks && stats.queue.failedTasks > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Background Tasks</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">{stats?.queue.pendingTasks}</div>
            <Link href="/admin/background-jobs" className="text-sm font-bold text-teal-600 hover:underline">Inspect →</Link>
          </div>
          <p className="mt-4 flex justify-between text-xs font-medium">
            <span className="text-slate-500">{stats?.queue.workersActive} workers active</span>
            {stats?.queue.failedTasks && stats.queue.failedTasks > 0 && (
              <span className="font-bold text-red-600">{stats.queue.failedTasks} failed</span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Total Storage</h3>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-black text-slate-900">
              {stats?.storage.usedGB}<span className="ml-1 text-lg text-slate-400">GB</span>
            </div>
            <Link href="/admin/storage" className="text-sm font-bold text-teal-600 hover:underline">Details →</Link>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${stats?.storage.percentFull && stats.storage.percentFull > 80 ? 'bg-red-500' : 'bg-teal-500'}`}
              style={{ width: `${stats?.storage.percentFull}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-medium text-slate-500">{stats?.storage.percentFull}% capacity</p>
        </div>
      </div>

      {/* ── Pending Owner Approvals ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-black tracking-tight text-slate-900">Pending Owner Approvals</h2>
          {!pendingLoading && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pending.length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-500'}`}>
              {pending.length}
            </span>
          )}
        </div>

        {pendingLoading ? (
          <div className="flex items-center gap-3 py-8 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <span className="text-sm">Loading pending registrations…</span>
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 py-12 text-center">
            <p className="font-semibold text-slate-500">No pending owner registrations</p>
            <p className="mt-1 text-sm text-slate-400">All caught up — new registrations will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Owner</th>
                  <th className="p-4 hidden sm:table-cell">Phone</th>
                  <th className="p-4 hidden md:table-cell">Registered</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((owner) => (
                  <React.Fragment key={owner._id}>
                    <tr className="transition-colors hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{owner.name}</div>
                        <div className="text-sm text-slate-500">{owner.email}</div>
                      </td>
                      <td className="p-4 hidden text-sm text-slate-600 sm:table-cell">
                        {owner.phone ?? '—'}
                      </td>
                      <td className="p-4 hidden text-sm text-slate-500 md:table-cell">
                        {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(owner)}
                            disabled={actionLoading === owner._id}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectingId === owner._id ? setRejectingId(null) : openReject(owner._id)}
                            disabled={actionLoading === owner._id}
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rejectingId === owner._id ? 'Cancel' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline reject form */}
                    {rejectingId === owner._id && (
                      <tr>
                        <td colSpan={4} className="border-t border-red-100 bg-red-50 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                              <label className="mb-1 block text-xs font-semibold text-red-700">
                                Rejection reason <span className="font-normal text-red-400">(optional)</span>
                              </label>
                              <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                rows={2}
                                placeholder="e.g. Incomplete business information provided"
                                autoFocus
                                className="w-full resize-none rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
                              />
                            </div>
                            <button
                              onClick={() => handleReject(owner)}
                              disabled={actionLoading === owner._id}
                              className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Confirm Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
