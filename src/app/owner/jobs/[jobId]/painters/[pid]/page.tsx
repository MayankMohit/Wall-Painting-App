'use client';

import { useState, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGetPainterQueueQuery, useGetJobQuery, useRemovePainterFromJobMutation } from '@/store/api/endpoints/jobs';
import { useGetSubmissionsQuery } from '@/store/api/endpoints/submissions';
import { StatusPill } from '@/components/jobs/shared/StatusPill';
import { PhotoThumb } from '@/components/jobs/detail/PhotoThumb';
import { SubmissionRow } from '@/components/jobs/detail/SubmissionRow';
import { relativeTime } from '@/components/jobs/shared/submissionHelpers';
import { ArrowLeft, ArrowRight, Trash, X } from '@/components/owner/icons';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

// ── helpers ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35), background: 'var(--ink-2)' }}
    >
      {initials}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function PainterQueuePage({
  params,
}: {
  params: Promise<{ jobId: string; pid: string }>;
}) {
  const { jobId, pid } = use(params);
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('all');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: queue, isLoading: qLoading, isError: qError } = useGetPainterQueueQuery({ jobId, painterId: pid });
  const { data: job } = useGetJobQuery(jobId);
  const { data: allSubs = [], isLoading: sLoading } = useGetSubmissionsQuery(jobId);
  const [removePainter, { isLoading: removing }] = useRemovePainterFromJobMutation();

  // Phone from job detail (already in cache if coming from job detail page)
  const painterPhone = useMemo(
    () => job?.painters.find((p) => p._id === pid)?.phone,
    [job, pid],
  );

  const painterSubs = useMemo(
    () => allSubs.filter((s) => s.painterId === pid),
    [allSubs, pid],
  );

  const filtered = useMemo(
    () => filter === 'all' ? painterSubs : painterSubs.filter((s) => s.status === filter),
    [painterSubs, filter],
  );

  const isLoading = qLoading || sLoading;

  const handleCopyPhone = () => {
    if (!painterPhone) return;
    navigator.clipboard.writeText(painterPhone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleRemove = async () => {
    await removePainter({ jobId, painterId: pid }).unwrap();
    router.push(`/owner/jobs/${jobId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
      </div>
    );
  }

  if (qError || !queue) {
    return (
      <div className="m-6 px-4 py-3 rounded-(--r) text-[13px] font-medium"
        style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
        Failed to load painter data.
      </div>
    );
  }

  const { stats } = queue;
  const total = stats.pending + stats.approved + stats.rejected;

  const FILTER_TABS: { key: Filter; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: total },
    { key: 'pending',  label: 'Pending',  count: stats.pending },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.rejected },
  ];

  const STAT_TILES = [
    { key: 'pending'  as Filter, label: 'Pending',  value: stats.pending,  color: 'var(--accent-deep)', accent: 'var(--accent)'   },
    { key: 'approved' as Filter, label: 'Approved', value: stats.approved, color: 'var(--approved)',    accent: 'var(--approved)' },
    { key: 'rejected' as Filter, label: 'Rejected', value: stats.rejected, color: stats.rejected > 0 ? 'var(--rejected)' : 'var(--ink-3)', accent: stats.rejected > 0 ? 'var(--rejected)' : 'var(--border-3)' },
  ];

  return (
    <>
      {/* ══ Mobile top bar ════════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-(--paper) border-b border-(--border)">
        <div className="flex items-center h-14 px-4 gap-2">
          <Link href={`/owner/jobs/${jobId}`} className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors no-underline">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-(--ink) truncate leading-tight">{queue.painter.name}</div>
            <div className="text-[11px] text-(--ink-3) truncate">{queue.job.companyName}</div>
          </div>
        </div>
      </div>

      {/* ══ Desktop header ════════════════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-4 px-8 pt-7 pb-5 border-b border-(--border) sticky top-0 z-10 bg-(--paper)">
        <Link href={`/owner/jobs/${jobId}`} className="w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) transition-colors no-underline shrink-0">
          <ArrowLeft size={17} />
        </Link>
        <div className="mr-auto min-w-0">
          <h1 className="text-[22px] font-bold text-(--ink) tracking-tight leading-tight truncate">
            {queue.painter.name}
          </h1>
          <p className="text-[13px] text-(--ink-3) mt-0.5">
            {queue.job.companyName} · review queue
          </p>
        </div>
        <button
          onClick={() => setRemoveOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer transition-colors hover:opacity-88"
          style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}
        >
          <Trash size={14} />
          Remove painter
        </button>
      </div>

      {/* ══ Mobile body ═══════════════════════════════════════════════ */}
      <div className="lg:hidden px-4 pt-4 pb-8">

        {/* Painter header card */}
        <div className="flex items-center gap-3 p-3.5 bg-(--surface) border border-(--border) rounded-(--r-md) shadow-(--shadow-sm)">
          <Avatar name={queue.painter.name} size={46} />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-(--ink) truncate">{queue.painter.name}</div>

            {/* Phone + copy */}
            {painterPhone ? (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-[11px] text-(--ink-3) font-(--mono)">{painterPhone}</span>
                <button
                  onClick={handleCopyPhone}
                  className="h-4.5 px-1.5 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                  style={{
                    background: copied ? 'var(--approved-soft)' : 'var(--paper-2)',
                    color: copied ? 'var(--approved)' : 'var(--ink-3)',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : null}

            <div className="text-[11px] text-(--ink-3) font-(--mono) mt-0.5">
              {total} submission{total !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={() => setRemoveOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer transition-colors hover:opacity-80"
            style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}
          >
            <Trash size={15} />
          </button>
        </div>

        {/* Stat tiles */}
        <div className="mt-3 flex gap-2">
          {STAT_TILES.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-(--r-md) bg-(--surface) border border-(--border) cursor-pointer transition-[border-color] hover:border-(--border-2)"
              style={{ borderTop: `3px solid ${t.accent}` }}
            >
              <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: t.color, letterSpacing: '-0.02em' }}>
                {t.value}
              </span>
              <span className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.06em]">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex gap-1.5">
          {FILTER_TABS.map((t) => {
            const on = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-full border cursor-pointer transition-[background,border-color] duration-100"
                style={{
                  background: on ? 'var(--ink)' : 'var(--surface)',
                  borderColor: on ? 'var(--ink)' : 'var(--border-2)',
                }}
              >
                <span className="text-[12px] font-semibold" style={{ color: on ? '#fff' : 'var(--ink-2)' }}>
                  {t.label}
                </span>
                <span className="text-[10px] font-bold" style={{ color: on ? 'rgba(255,255,255,.6)' : 'var(--ink-4)' }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Submission cards */}
        <div className="mt-3 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-(--ink-3)">
              No {filter === 'all' ? '' : filter + ' '}submissions.
            </div>
          ) : (
            filtered.map((sub) => (
              <SubmissionRow
                key={sub._id}
                sub={sub}
                href={`/owner/jobs/${jobId}/submissions/${sub._id}`}
              />
            ))
          )}
        </div>
      </div>

      {/* ══ Desktop content ═══════════════════════════════════════════ */}
      <div className="hidden lg:block px-8 pt-7 pb-10">

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          {STAT_TILES.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(filter === t.key ? 'all' : t.key)}
              className="flex flex-col p-4 bg-(--surface) border border-(--border) rounded-(--r-md) text-left cursor-pointer hover:border-(--border-2) transition-[border-color]"
              style={{ borderLeft: `4px solid ${t.accent}` }}
            >
              <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-wider">{t.label}</div>
              <div className="font-(--mono) text-[36px] mt-1 leading-none tabular-nums" style={{ color: t.color, letterSpacing: '-0.02em' }}>
                {t.value}
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold" style={{ color: t.color }}>
                {filter === t.key ? 'Filtered' : 'Filter'}
                <ArrowRight size={11} />
              </div>
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-4">
          {FILTER_TABS.map((t) => {
            const on = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full border text-[13px] font-semibold cursor-pointer transition-[background,border-color] duration-100"
                style={{
                  background: on ? 'var(--ink)' : 'var(--surface)',
                  borderColor: on ? 'var(--ink)' : 'var(--border)',
                  color: on ? '#fff' : 'var(--ink-2)',
                }}
              >
                {t.label}
                <span className="font-(--mono) text-[11px]" style={{ color: on ? 'rgba(255,255,255,.5)' : 'var(--ink-4)' }}>
                  · {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Submission cards */}
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-(--ink-3)">
              No {filter === 'all' ? '' : filter + ' '}submissions.
            </div>
          ) : (
            filtered.map((sub) => (
              <SubmissionRow
                key={sub._id}
                sub={sub}
                href={`/owner/jobs/${jobId}/submissions/${sub._id}`}
              />
            ))
          )}
        </div>
      </div>

      {/* ══ Remove painter modal ══════════════════════════════════════ */}
      {removeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setRemoveOpen(false); }}
        >
          <div className="w-full max-w-sm bg-(--paper) rounded-(--r-lg) overflow-hidden shadow-(--shadow)">
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
              <div className="text-[16px] font-bold text-(--ink)">Remove painter</div>
              <button onClick={() => setRemoveOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) cursor-pointer">
                <X size={17} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <p className="text-[14px] text-(--ink) leading-normal">
                <span className="font-semibold">{queue.painter.name}</span> will be removed from{' '}
                <span className="font-semibold">{queue.job.companyName}</span>.
              </p>
              <p className="text-[13px] text-(--ink-3) leading-normal">
                All their submissions and photos on this job will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setRemoveOpen(false)}
                className="flex-1 h-10 rounded-full text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 h-10 rounded-full text-[13px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-88 disabled:opacity-50"
                style={{ background: 'var(--rejected)' }}
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
