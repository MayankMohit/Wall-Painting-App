'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Refresh, Users, Briefcase, Activity, Server, ArrowRight, Check, X, Alert } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/Avatar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatsResponse {
  users:       Record<string, Record<string, number>>;
  jobs:        Record<string, number>;
  submissions: Record<string, number>;
  storage:     { totalBytes: number };
  queues: {
    fileGen:      Record<string, number>;
    notify:       Record<string, number>;
    assetCleanup: Record<string, number>;
  };
}

interface ServiceCheck {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    mongo: ServiceCheck;
    redis: ServiceCheck;
  };
}

interface PendingOwner {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeaders(body?: boolean) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body) h['Content-Type'] = 'application/json';
  return h;
}

function fmtGB(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return '0 GB';
}

function sumValues(obj: Record<string, number>) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function sumRole(users: Record<string, Record<string, number>>, role: string) {
  return sumValues(users[role] ?? {});
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  href: string;
  accent?: string;
  warn?: boolean;
}

function StatTile({ icon, label, value, sub, href, accent = 'var(--accent)', warn }: StatTileProps) {
  return (
    <Link
      href={href}
      className="block no-underline bg-(--surface) border border-(--border) rounded-(--r-md) p-4 lg:p-5 shadow-(--shadow-sm) group transition-[border-color] hover:border-(--border-2)"
      style={{ borderTop: `3px solid ${warn ? 'var(--rejected)' : accent}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <ArrowRight size={14} style={{ color: 'var(--ink-4)' }} className="mt-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="font-(--mono) text-[28px] lg:text-[32px] font-bold tracking-[-0.025em] leading-none text-(--ink)">
        {value}
      </div>
      <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em] mt-1">{label}</div>
      <div className="text-[12px] text-(--ink-3) mt-1.5">{sub}</div>
    </Link>
  );
}

// ── Queue row ─────────────────────────────────────────────────────────────────

function QueueRow({ name, counts }: { name: string; counts: Record<string, number> }) {
  const active  = counts.active  ?? 0;
  const waiting = counts.waiting ?? 0;
  const failed  = counts.failed  ?? 0;
  const total   = active + waiting;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-(--border) last:border-0">
      <div className="font-(--mono) text-[12px] font-semibold text-(--ink) w-28 shrink-0">{name}</div>
      <div className="flex items-center gap-2 flex-1">
        <div
          className="h-1.5 rounded-full flex-1 overflow-hidden"
          style={{ background: 'var(--paper-2)' }}
        >
          {active > 0 && (
            <div
              className="h-full rounded-full animate-pulse"
              style={{ width: `${Math.min(100, (active / Math.max(total, 1)) * 100)}%`, background: 'var(--accent)' }}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {active > 0 && (
          <span className="font-(--mono) text-[11px] font-bold" style={{ color: 'var(--accent-deep)' }}>
            {active} active
          </span>
        )}
        {waiting > 0 && (
          <span className="font-(--mono) text-[11px] text-(--ink-3)">{waiting} waiting</span>
        )}
        {active === 0 && waiting === 0 && (
          <span className="font-(--mono) text-[11px] text-(--ink-4)">idle</span>
        )}
        {failed > 0 && (
          <span
            className="font-(--mono) text-[11px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}
          >
            {failed} failed
          </span>
        )}
      </div>
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em]">{title}</div>
      {count != null && count > 0 && (
        <span
          className="font-(--mono) text-[10px] font-bold h-4.5 min-w-4.5 px-1 rounded-full inline-flex items-center justify-center"
          style={{ background: 'var(--pending-soft)', color: 'var(--pending)' }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats,         setStats]         = useState<StatsResponse | null>(null);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [pending,       setPending]       = useState<PendingOwner[]>([]);
  const [pendingLoading,setPendingLoading]= useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId,   setRejectingId]   = useState<string | null>(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [health,        setHealth]        = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res  = await fetch('/api/admin/stats', { headers: authHeaders() });
      const json = await res.json();
      if (res.ok && json.data) setStats(json.data);
      else setToast({ msg: 'Failed to load stats', ok: false });
    } catch {
      setToast({ msg: 'Could not reach server', ok: false });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res  = await fetch('/api/health');
      const json = await res.json();
      setHealth(json as HealthResponse);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res  = await fetch('/api/admin/users?role=owner&status=inactive', { headers: authHeaders() });
      const json = await res.json();
      if (res.ok) setPending(json.data?.users ?? json.users ?? []);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); loadPending(); loadHealth(); }, [loadStats, loadPending, loadHealth]);

  const handleApprove = async (owner: PendingOwner) => {
    setActionLoading(owner._id);
    setPending((p) => p.filter((o) => o._id !== owner._id));
    try {
      const res = await fetch(`/api/admin/users/${owner._id}/approve`, { method: 'PATCH', headers: authHeaders(true) });
      if (!res.ok) throw new Error();
      setToast({ msg: `${owner.name} approved`, ok: true });
    } catch {
      setPending((p) => [owner, ...p]);
      setToast({ msg: `Failed to approve`, ok: false });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (owner: PendingOwner) => {
    setActionLoading(owner._id);
    setPending((p) => p.filter((o) => o._id !== owner._id));
    setRejectingId(null);
    try {
      const res = await fetch(`/api/admin/users/${owner._id}/reject`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: `${owner.name} rejected`, ok: true });
    } catch {
      setPending((p) => [owner, ...p]);
      setToast({ msg: `Failed to reject`, ok: false });
    } finally {
      setActionLoading(null);
      setRejectReason('');
    }
  };

  // ── derived values ─────────────────────────────────────────────────────────
  const totalUsers   = stats ? Object.values(stats.users).reduce((a, b) => a + sumValues(b), 0) : null;
  const painters     = stats ? sumRole(stats.users, 'painter') : 0;
  const owners       = stats ? sumRole(stats.users, 'owner')   : 0;
  const activeJobs   = stats?.jobs.active ?? null;
  const totalSubs    = stats ? sumValues(stats.submissions) : null;
  const pendingSubs  = stats?.submissions.pending ?? 0;
  const storageBytes = stats?.storage.totalBytes ?? 0;
  const totalFailed  = stats
    ? (stats.queues.fileGen.failed ?? 0) + (stats.queues.notify.failed ?? 0) + (stats.queues.assetCleanup.failed ?? 0)
    : 0;

  const operational = totalFailed === 0;

  const TILES: StatTileProps[] = [
    {
      icon: <Users size={18} weight={1.6} />,
      label: 'Total users',
      value: statsLoading ? '—' : (totalUsers ?? 0),
      sub: statsLoading ? '' : `${painters} painters · ${owners} owners`,
      href: '/admin/users',
      accent: 'var(--info,oklch(0.5 0.14 240))',
    },
    {
      icon: <Briefcase size={18} weight={1.6} />,
      label: 'Active jobs',
      value: statsLoading ? '—' : (activeJobs ?? 0),
      sub: statsLoading ? '' : `${(stats?.jobs.completed ?? 0) + (stats?.jobs.invoiced ?? 0)} completed all time`,
      href: '/admin/jobs',
      accent: 'var(--accent)',
    },
    {
      icon: <Activity size={18} weight={1.6} />,
      label: 'Submissions',
      value: statsLoading ? '—' : (totalSubs ?? 0),
      sub: statsLoading ? '' : `${pendingSubs} pending approval`,
      href: '/admin/jobs',
      accent: 'var(--approved)',
    },
    {
      icon: <Server size={18} weight={1.6} />,
      label: 'Generated files',
      value: statsLoading ? '—' : fmtGB(storageBytes),
      sub: 'stored in Cloudflare R2',
      href: '/admin/storage',
      accent: 'oklch(0.55 0.14 30)',
      warn: false,
    },
  ];

  const hasQueues = stats && (
    Object.values(stats.queues.fileGen).some(Boolean) ||
    Object.values(stats.queues.notify).some(Boolean)
  );

  return (
    <div className="bg-(--paper) min-h-screen">

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-4 z-50 px-4 py-3 rounded-(--r-md) text-[13px] font-semibold text-white shadow-lg"
          style={{ background: toast.ok ? 'var(--approved)' : 'var(--rejected)' }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border) px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[22px] font-bold tracking-[-0.025em] text-(--ink)">System</div>
            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
              {(['mongo', 'redis'] as const).map((svc) => {
                const s = health?.services[svc];
                const ok = s?.ok ?? null;
                return (
                  <div key={svc} className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: ok === null ? 'var(--ink-4)' : ok ? 'oklch(0.65 0.18 145)' : 'var(--rejected)' }}
                    />
                    <span className="text-[11px] text-(--ink-3) capitalize">{svc}</span>
                  </div>
                );
              })}
              <div className="w-px h-3 bg-(--border)" />
              <div className="text-[11px] text-(--ink-3)">
                {statsLoading ? 'Loading…' : operational ? 'Queues nominal' : `${totalFailed} failed`}
              </div>
            </div>
          </div>
          <button
            onClick={() => { loadStats(); loadPending(); loadHealth(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-(--border-2) text-(--ink-2) cursor-pointer hover:border-(--border-3) transition-[border-color]"
          >
            <Refresh size={16} weight={1.8} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-2.5">
          {TILES.map((t) => (
            <StatTile key={t.label} {...t} />
          ))}
        </div>

        {/* Queue — only if something is happening */}
        {!statsLoading && stats && hasQueues && (
          <div className="px-4 mt-5">
            <SectionLabel title="Background queues" />
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) px-4 shadow-(--shadow-sm)">
              <QueueRow name="fileGen"  counts={stats.queues.fileGen} />
              <QueueRow name="notify"   counts={stats.queues.notify} />
            </div>
            <div className="mt-2 text-right">
              <Link href="/admin/background-jobs" className="text-[12px] font-semibold no-underline" style={{ color: 'var(--accent-deep)' }}>
                View all queues →
              </Link>
            </div>
          </div>
        )}

        {/* Pending approvals */}
        <div className="px-4 mt-5">
          <SectionLabel title="Pending owner approvals" count={pending.length} />
          {pendingLoading ? (
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-8 text-center animate-pulse text-[13px] text-(--ink-4)">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-6 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ background: 'var(--approved-soft)', color: 'var(--approved)' }}>
                <Check size={18} weight={2.4} />
              </div>
              <div className="text-[14px] font-semibold text-(--ink)">All caught up</div>
              <div className="text-[12px] text-(--ink-3) mt-1">No pending registrations.</div>
            </div>
          ) : (
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm)">
              {pending.map((owner, i) => (
                <div key={owner._id}>
                  <div className={`px-4 py-3 flex items-center gap-3 ${i < pending.length - 1 || rejectingId === owner._id ? 'border-b border-(--border)' : ''}`}>
                    <Avatar name={owner.name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-(--ink) truncate">{owner.name}</div>
                      <div className="font-(--mono) text-[11px] text-(--ink-3) truncate">{owner.email}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(owner)}
                        disabled={actionLoading === owner._id}
                        className="h-8 px-3 rounded-full text-[12px] font-semibold text-white cursor-pointer disabled:opacity-40"
                        style={{ background: 'var(--approved)' }}
                      >
                        {actionLoading === owner._id ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => rejectingId === owner._id ? setRejectingId(null) : (setRejectingId(owner._id), setRejectReason(''))}
                        disabled={actionLoading === owner._id}
                        className="h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer border disabled:opacity-40"
                        style={{ borderColor: 'var(--rejected)', color: 'var(--rejected)', background: 'var(--rejected-soft)' }}
                      >
                        {rejectingId === owner._id ? 'Cancel' : 'Reject'}
                      </button>
                    </div>
                  </div>
                  {rejectingId === owner._id && (
                    <div className="px-4 py-3 border-b border-(--border)" style={{ background: 'var(--rejected-soft)' }}>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="Rejection reason (optional)"
                        autoFocus
                        className="w-full resize-none rounded-(--r) border border-(--border-2) bg-(--surface) px-3 py-2 text-[13px] text-(--ink) focus:outline-none focus:border-(--ink)"
                      />
                      <button
                        onClick={() => handleReject(owner)}
                        disabled={actionLoading === owner._id}
                        className="mt-2 w-full h-9 rounded-full text-[13px] font-semibold text-white cursor-pointer disabled:opacity-40"
                        style={{ background: 'var(--rejected)' }}
                      >
                        {actionLoading === owner._id ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>

      {/* ── Desktop ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        {/* Page header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-(--border)">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.025em] text-(--ink)">System Overview</h1>
            <p className="text-[13px] text-(--ink-3) mt-1">
              {statsLoading
                ? 'Fetching metrics…'
                : totalFailed > 0
                  ? `${totalFailed} background task${totalFailed !== 1 ? 's' : ''} failed — check Task Queue`
                  : 'All services nominal'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Per-service health chips */}
            {(['mongo', 'redis'] as const).map((svc) => {
              const s = health?.services[svc];
              const ok = s?.ok ?? null;
              const label = svc === 'mongo' ? 'MongoDB' : 'Redis';
              return (
                <div
                  key={svc}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-full border"
                  style={{
                    borderColor: ok === null ? 'var(--border-2)' : ok ? 'oklch(0.8 0.1 145)' : 'oklch(0.8 0.1 25)',
                    background:  ok === null ? 'var(--paper-2)'  : ok ? 'var(--approved-soft)' : 'var(--rejected-soft)',
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: ok === null ? 'var(--ink-4)' : ok ? 'oklch(0.65 0.18 145)' : 'var(--rejected)' }}
                  />
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: ok === null ? 'var(--ink-3)' : ok ? 'var(--approved)' : 'var(--rejected)' }}
                  >
                    {label}
                  </span>
                  {s?.ok && (
                    <span className="font-(--mono) text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {s.latencyMs}ms
                    </span>
                  )}
                </div>
              );
            })}
            {/* Queue status pill */}
            <div
              className="flex items-center gap-2 h-9 px-3.5 rounded-full border"
              style={{
                borderColor: operational ? 'oklch(0.8 0.1 145)' : 'oklch(0.8 0.1 25)',
                background:  operational ? 'var(--approved-soft)' : 'var(--rejected-soft)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: operational ? 'oklch(0.65 0.18 145)' : 'var(--rejected)' }}
              />
              <span
                className="text-[12px] font-semibold"
                style={{ color: operational ? 'var(--approved)' : 'var(--rejected)' }}
              >
                {operational ? 'Queues' : 'Degraded'}
              </span>
            </div>
            <button
              onClick={() => { loadStats(); loadPending(); loadHealth(); }}
              className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-(--border-2) bg-(--surface) text-[13px] font-semibold text-(--ink-2) cursor-pointer hover:border-(--border-3) transition-[border-color]"
            >
              <Refresh size={14} weight={2} /> Refresh
            </button>
          </div>
        </div>

        <div className="px-8 pt-6 pb-10">
          {/* Stat tiles */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {TILES.map((t) => (
              <StatTile key={t.label} {...t} />
            ))}
          </div>

          {/* Two-column section */}
          <div className="grid grid-cols-3 gap-6">

            {/* Pending approvals — wider */}
            <div className="col-span-2">
              <SectionLabel title="Pending owner approvals" count={pending.length} />
              {pendingLoading ? (
                <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-10 text-center animate-pulse text-[13px] text-(--ink-4)">Loading…</div>
              ) : pending.length === 0 ? (
                <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-8 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--approved-soft)', color: 'var(--approved)' }}>
                    <Check size={18} weight={2.4} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-(--ink)">All caught up</div>
                    <div className="text-[12px] text-(--ink-3) mt-0.5">No pending owner registrations — new ones will appear here.</div>
                  </div>
                </div>
              ) : (
                <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm)">
                  {/* Table header */}
                  <div
                    className="grid gap-4 px-5 py-2.5 border-b border-(--border) bg-(--paper-2) text-[10px] font-bold uppercase tracking-[.05em] text-(--ink-3)"
                    style={{ gridTemplateColumns: '1fr 1.4fr 1fr auto' }}
                  >
                    <div>Name</div><div>Email</div><div>Registered</div><div />
                  </div>
                  {pending.map((owner, i) => (
                    <div key={owner._id}>
                      <div
                        className={`grid gap-4 px-5 py-3.5 items-center ${i < pending.length - 1 || rejectingId === owner._id ? 'border-b border-(--border)' : ''}`}
                        style={{ gridTemplateColumns: '1fr 1.4fr 1fr auto' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={owner.name} size={32} />
                          <div className="text-[14px] font-semibold text-(--ink) truncate">{owner.name}</div>
                        </div>
                        <div className="font-(--mono) text-[12px] text-(--ink-3) truncate">{owner.email}</div>
                        <div className="text-[12px] text-(--ink-3)">
                          {owner.createdAt
                            ? new Date(owner.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(owner)}
                            disabled={actionLoading === owner._id}
                            className="h-8 px-3.5 rounded-full text-[12px] font-semibold text-white cursor-pointer disabled:opacity-40"
                            style={{ background: 'var(--approved)' }}
                          >
                            {actionLoading === owner._id ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectingId === owner._id ? setRejectingId(null) : (setRejectingId(owner._id), setRejectReason(''))}
                            disabled={actionLoading === owner._id}
                            className="h-8 px-3.5 rounded-full text-[12px] font-semibold cursor-pointer border disabled:opacity-40"
                            style={{ borderColor: 'var(--rejected)', color: 'var(--rejected)', background: 'var(--rejected-soft)' }}
                          >
                            {rejectingId === owner._id ? 'Cancel' : 'Reject'}
                          </button>
                        </div>
                      </div>
                      {rejectingId === owner._id && (
                        <div className="px-5 pb-4 border-b border-(--border)" style={{ background: 'var(--rejected-soft)' }}>
                          <div className="text-[11px] font-semibold text-(--rejected) mb-1.5">Rejection reason (optional)</div>
                          <div className="flex gap-3">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              rows={2}
                              placeholder="e.g. Incomplete business information"
                              autoFocus
                              className="flex-1 resize-none rounded-(--r) border border-(--border-2) bg-(--surface) px-3 py-2 text-[13px] text-(--ink) focus:outline-none focus:border-(--ink)"
                            />
                            <button
                              onClick={() => handleReject(owner)}
                              disabled={actionLoading === owner._id}
                              className="h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer self-end disabled:opacity-40"
                              style={{ background: 'var(--rejected)' }}
                            >
                              {actionLoading === owner._id ? '…' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: quick links + queue */}
            <div className="space-y-5">

              {/* Quick navigation */}
              <div>
                <SectionLabel title="Navigate" />
                <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm)">
                  {[
                    { label: 'User directory',  sub: `${totalUsers ?? '…'} total`,  href: '/admin/users',           Icon: Users },
                    { label: 'Jobs monitor',    sub: `${activeJobs ?? '…'} active`, href: '/admin/jobs',            Icon: Briefcase },
                    { label: 'Task queue',      sub: totalFailed > 0 ? `${totalFailed} failed` : 'All queues',      href: '/admin/background-jobs', Icon: Activity, warn: totalFailed > 0 },
                    { label: 'Storage',         sub: fmtGB(storageBytes),            href: '/admin/storage',         Icon: Server },
                  ].map(({ label, sub, href, Icon, warn }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-4 py-3 border-b border-(--border) last:border-0 no-underline text-inherit hover:bg-(--paper-2) transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: warn ? 'var(--rejected-soft)' : 'var(--paper-2)' }}>
                        <Icon size={16} weight={1.6} style={{ color: warn ? 'var(--rejected)' : 'var(--ink-2)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-(--ink)" style={{ color: warn ? 'var(--rejected)' : undefined }}>{label}</div>
                        <div className="font-(--mono) text-[11px] text-(--ink-3)">{sub}</div>
                      </div>
                      <ArrowRight size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Queue health */}
              {stats && (
                <div>
                  <SectionLabel title="Queue health" />
                  <div className="bg-(--surface) border border-(--border) rounded-(--r-md) px-4 shadow-(--shadow-sm)">
                    <QueueRow name="fileGen"      counts={stats.queues.fileGen}      />
                    <QueueRow name="notify"       counts={stats.queues.notify}       />
                    <QueueRow name="assetCleanup" counts={stats.queues.assetCleanup} />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
