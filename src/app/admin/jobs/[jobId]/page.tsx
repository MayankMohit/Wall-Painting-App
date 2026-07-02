'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Users } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/Avatar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PainterStat {
  _id: string;
  name: string;
  phone?: string;
  stats: { submitted: number; approved: number; pending: number };
}

interface JobDetail {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  createdAt: string;
  startDate?: string;
  endDate?: string | null;
  ownerId: string;
  stats: { submitted: number; approved: number; pending: number };
  painters: PainterStat[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { Authorization: `Bearer ${token}` };
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: 'var(--approved-soft)', color: 'var(--approved)', label: 'Active'    },
  completed: { bg: 'var(--pending-soft)',  color: 'var(--pending)',  label: 'Completed' },
  invoiced:  { bg: 'var(--paper-2)',       color: 'var(--ink-3)',    label: 'Invoiced'  },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.completed;
  return (
    <span className="inline-flex items-center h-[20px] px-2 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4 shadow-(--shadow-sm)" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="font-(--mono) text-[26px] font-bold tracking-[-0.025em] leading-none text-(--ink)">{value}</div>
      <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em] mt-1.5">{label}</div>
    </div>
  );
}

function MetaRow({ label, value, mono = false, last = false }: { label: string; value: React.ReactNode; mono?: boolean; last?: boolean }) {
  return (
    <div className={`px-[18px] py-3 flex items-center gap-3 ${last ? '' : 'border-b border-(--border)'}`}>
      <div className="flex-1 text-[13px] text-(--ink-3)">{label}</div>
      <div className={`text-[13px] font-semibold text-(--ink) text-right ${mono ? 'font-(--mono)' : ''}`}>{value}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);

  const [job,       setJob]       = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res  = await fetch(`/api/jobs/${jobId}`, { headers: authHeaders() });
        const json = await res.json();
        if (res.ok) setJob(json.data ?? json);
        else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="m-6 p-4 rounded-(--r-md) text-[13px] font-medium" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
        Job not found.
      </div>
    );
  }

  return (
    <div className="bg-(--paper) min-h-screen pb-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border) flex items-center gap-3 h-14 px-4 lg:h-auto lg:px-8 lg:py-5">
        <Link href="/admin/jobs" className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors no-underline shrink-0">
          <ArrowLeft size={19} />
        </Link>
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-[17px] lg:text-[22px] font-bold text-(--ink) tracking-[-0.02em] truncate">{job.companyName}</h1>
          <StatusChip status={job.status} />
        </div>
      </div>

      <div className="px-4 pt-4 lg:px-8 lg:pt-6 max-w-3xl space-y-5">

        {job.description && (
          <p className="text-[13px] text-(--ink-2) leading-[1.5]">{job.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
          <StatTile label="Submitted" value={job.stats?.submitted ?? 0} accent="var(--info,oklch(0.5 0.14 240))" />
          <StatTile label="Approved"  value={job.stats?.approved ?? 0}  accent="var(--approved)" />
          <StatTile label="Pending"   value={job.stats?.pending ?? 0}   accent="var(--accent)" />
        </div>

        {/* Details */}
        <div>
          <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-2.5">Details</div>
          <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
            <MetaRow label="Owner" value={
              <Link href={`/admin/users/${job.ownerId}`} className="inline-flex items-center gap-1 text-(--accent-deep) no-underline hover:underline">
                View owner <ArrowRight size={12} />
              </Link>
            } />
            <MetaRow label="Painters" value={String(job.painters?.length ?? 0)} mono />
            <MetaRow label="Created"  value={fmtDate(job.createdAt)} />
            <MetaRow label="Started"  value={fmtDate(job.startDate)} />
            <MetaRow label="Ended"    value={fmtDate(job.endDate)} />
            <MetaRow label="Job ID"   value={job._id.slice(-8)} mono last />
          </div>
        </div>

        {/* Painters */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em]">Painters</div>
            {(job.painters?.length ?? 0) > 0 && (
              <span className="font-(--mono) text-[10px] font-bold h-4.5 min-w-4.5 px-1 rounded-full inline-flex items-center justify-center" style={{ background: 'var(--paper-2)', color: 'var(--ink-3)' }}>
                {job.painters.length}
              </span>
            )}
          </div>
          {(job.painters?.length ?? 0) === 0 ? (
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-6 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ background: 'var(--paper-2)', color: 'var(--ink-3)' }}>
                <Users size={18} weight={1.6} />
              </div>
              <div className="text-[13px] text-(--ink-3)">No painters assigned to this job.</div>
            </div>
          ) : (
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm)">
              {job.painters.map((p, i) => (
                <div key={p._id} className={`px-4 py-3 flex items-center gap-3 ${i < job.painters.length - 1 ? 'border-b border-(--border)' : ''}`}>
                  <Avatar name={p.name} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</div>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="font-(--mono) text-[11px] text-(--ink-3) no-underline hover:text-(--accent-deep)">{p.phone}</a>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 font-(--mono) text-[11px]">
                    <span className="text-(--ink-3)">{p.stats?.submitted ?? 0} sent</span>
                    <span style={{ color: 'var(--approved)' }}>{p.stats?.approved ?? 0} ok</span>
                    <span style={{ color: (p.stats?.pending ?? 0) > 0 ? 'var(--accent-deep)' : 'var(--ink-4)', fontWeight: (p.stats?.pending ?? 0) > 0 ? 700 : 400 }}>
                      {p.stats?.pending ?? 0} pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
