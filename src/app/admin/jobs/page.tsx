'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Briefcase, ArrowRight } from '@/components/admin/icons';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GlobalJob {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  stats: { submitted: number; approved: number; pending: number };
  createdAt: string;
  painters?: unknown[];
}

type StatusFilter = 'all' | 'active' | 'completed' | 'invoiced';

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { Authorization: `Bearer ${token}` };
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: 'var(--approved-soft)',  color: 'var(--approved)',    label: 'Active'    },
  completed: { bg: 'var(--pending-soft)',   color: 'var(--pending)',     label: 'Completed' },
  invoiced:  { bg: 'var(--paper-2)',        color: 'var(--ink-3)',       label: 'Invoiced'  },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.completed;
  return (
    <span className="inline-flex items-center h-[18px] px-[7px] rounded-full text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer transition-[background,border-color,color] duration-100 whitespace-nowrap"
      style={{
        background:  on ? 'var(--ink)' : 'var(--surface)',
        borderColor: on ? 'var(--ink)' : 'var(--border-2)',
        color:       on ? '#fff'       : 'var(--ink-2)',
      }}
    >
      {label}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminJobsPage() {
  const [jobs,      setJobs]      = useState<GlobalJob[]>([]);
  const [total,     setTotal]     = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [status,    setStatus]    = useState<StatusFilter>('all');
  const [q,         setQ]         = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (debouncedQ) params.set('q', debouncedQ);
      const res  = await fetch(`/api/jobs?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (res.ok) {
        setJobs(json.data?.jobs ?? json.jobs ?? []);
        setTotal(json.data?.total ?? json.total ?? 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [status, debouncedQ]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'active',    label: 'Active'    },
    { key: 'completed', label: 'Completed' },
    { key: 'invoiced',  label: 'Invoiced'  },
  ];

  return (
    <div className="bg-(--paper) min-h-screen">

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border)">
          <div className="px-4 pt-3 pb-2">
            <div className="text-[20px] font-bold tracking-[-0.025em] text-(--ink)">
              Jobs <span className="font-(--mono) text-[16px] font-normal text-(--ink-3)">{total}</span>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="h-11 bg-(--surface) border border-(--border-2) rounded-(--r) flex items-center gap-2.5 px-3.5">
              <Search size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
              <input
                type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search company or description"
                className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
              />
            </div>
          </div>
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
            {FILTERS.map(({ key, label }) => <Chip key={key} label={label} on={status === key} onClick={() => setStatus(key)} />)}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-(--ink-3)">No jobs found.</div>
        ) : (
          <div className="px-4 py-3 flex flex-col gap-2">
            {jobs.map((job) => (
              <Link key={job._id} href={`/admin/jobs/${job._id}`} className="block no-underline text-inherit bg-(--surface) border border-(--border) rounded-(--r-md) p-4 shadow-(--shadow-sm) active:bg-(--paper-2) transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-2) shrink-0">
                    <Briefcase size={18} weight={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-(--ink) truncate">{job.companyName}</div>
                    {job.description && <div className="text-[12px] text-(--ink-3) mt-0.5 truncate">{job.description}</div>}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <StatusChip status={job.status} />
                      <span className="font-(--mono) text-[11px] text-(--ink-3)">
                        {(job.painters as unknown[])?.length ?? 0} painters · <span style={{ color: (job.stats?.pending ?? 0) > 0 ? 'var(--accent-deep)' : undefined, fontWeight: (job.stats?.pending ?? 0) > 0 ? 700 : undefined }}>{job.stats?.pending ?? 0}</span> pending
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-(--border)">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.025em] text-(--ink)">
              Jobs
              {!isLoading && <span className="font-(--mono) text-[18px] font-normal text-(--ink-3) ml-2">{total}</span>}
            </h1>
            <p className="text-[13px] text-(--ink-3) mt-1">Cross-organization monitoring of all painting contracts.</p>
          </div>
          <div className="w-72 h-10 bg-(--surface) border border-(--border-2) rounded-(--r) flex items-center gap-2.5 px-3.5">
            <Search size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <input
              type="text" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search company or description"
              className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
            />
          </div>
        </div>

        <div className="px-8 py-5">
          {/* Filter chips */}
          <div className="flex gap-1.5 mb-5">
            {FILTERS.map(({ key, label }) => <Chip key={key} label={label} on={status === key} onClick={() => setStatus(key)} />)}
          </div>

          {/* Table */}
          <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm)">
            <div
              className="grid gap-4 px-5 py-3 border-b border-(--border) bg-(--paper-2) text-[10px] font-bold uppercase tracking-[.05em] text-(--ink-3)"
              style={{ gridTemplateColumns: '2fr 2fr 90px 80px 80px 90px' }}
            >
              <div>Company</div>
              <div>Description</div>
              <div className="text-center">Painters</div>
              <div className="text-center">Submitted</div>
              <div className="text-center">Pending</div>
              <div>Status</div>
            </div>

            {isLoading ? (
              <div className="p-16 text-center animate-pulse text-[13px] text-(--ink-4)">Loading jobs…</div>
            ) : jobs.length === 0 ? (
              <div className="p-16 text-center text-[13px] text-(--ink-3)">No jobs match your filters.</div>
            ) : (
              jobs.map((job, i) => (
                <Link
                  key={job._id}
                  href={`/admin/jobs/${job._id}`}
                  className={`grid gap-4 px-5 py-3.5 items-center no-underline text-inherit transition-colors hover:bg-(--paper-2) ${i < jobs.length - 1 ? 'border-b border-(--border)' : ''}`}
                  style={{ gridTemplateColumns: '2fr 2fr 90px 80px 80px 90px' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[8px] bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-2) shrink-0">
                      <Briefcase size={15} weight={1.6} />
                    </div>
                    <div className="text-[14px] font-semibold text-(--ink) truncate">{job.companyName}</div>
                  </div>
                  <div className="text-[13px] text-(--ink-3) truncate">{job.description ?? '—'}</div>
                  <div className="text-center font-(--mono) text-[13px] font-semibold text-(--ink)">{(job.painters as unknown[])?.length ?? 0}</div>
                  <div className="text-center font-(--mono) text-[13px] font-semibold text-(--ink)">{job.stats?.submitted ?? 0}</div>
                  <div className="text-center font-(--mono) text-[13px] font-semibold" style={{ color: (job.stats?.pending ?? 0) > 0 ? 'var(--accent-deep)' : 'var(--ink-3)' }}>
                    {job.stats?.pending ?? 0}
                  </div>
                  <div><StatusChip status={job.status} /></div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
