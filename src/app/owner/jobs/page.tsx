'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useGetJobsQuery, useGetJobStatsQuery } from '@/store/api/endpoints/jobs';
import { useOwnerStore, type JobFilter } from '@/store/ownerStore';
import { JobStatusPill } from '@/components/owner/JobStatusPill';
import { JobTypeBadge } from '@/components/dashboards/JobTypeBadge';
import { Building, ArrowRight, Search, Plus, X } from '@/components/owner/icons';
import { SkeletonRow, SkeletonCard, TABLE_COLS } from '@/components/owner/JobsSkeletons';
import { JobsEmptyState, JobsEmptySearch } from '@/components/owner/JobsEmptyState';

const FILTER_LABELS: Record<JobFilter, string> = {
  active: 'Active',
  completed: 'Completed',
  invoiced: 'Invoiced',
};

export default function OwnerJobsPage() {
  const jobsFilter = useOwnerStore((s) => s.jobsFilter);
  const setJobsFilter = useOwnerStore((s) => s.setJobsFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const { data: jobs, isLoading, isError } = useGetJobsQuery(jobsFilter);
  const { data: stats } = useGetJobStatsQuery();

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => j.companyName.toLowerCase().includes(q));
  }, [jobs, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;
  const totalJobs = stats ? stats.active + stats.completed + stats.invoiced : null;

  return (
    <div className="min-h-screen">

      {/* ══ Mobile top bar ═══════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-(--paper) border-b border-(--border)">
        <div className="flex items-center gap-2 px-4 h-14">
          <h1 className="flex-1 text-[22px] font-bold tracking-[-0.025em] text-(--ink)">Jobs</h1>
          <button
            onClick={() => { setMobileSearchOpen((v) => !v); if (mobileSearchOpen) setSearchQuery(''); }}
            className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors"
          >
            {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <Link
            href="/owner/jobs/new"
            className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors"
          >
            <Plus size={20} />
          </Link>
        </div>
        {mobileSearchOpen && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 h-10 px-3 bg-(--surface) border border-(--border-2) rounded-(--r) focus-within:border-(--border-3) transition-[border-color]">
              <Search size={15} style={{ color: 'var(--ink-3)' }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company name"
                className="flex-1 text-[14px] text-(--ink) bg-transparent outline-none placeholder:text-(--ink-4)"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-(--ink-4) hover:text-(--ink-3)">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ Desktop header ═══════════════════════════════════════════ */}
      <div className="hidden lg:flex items-start gap-4 px-8 pt-8 pb-5">
        <div className="mr-auto">
          <h1 className="text-[26px] font-bold tracking-[-0.025em] text-(--ink) leading-tight">Jobs</h1>
          {totalJobs !== null && stats && (
            <p className="text-[13px] text-(--ink-3) mt-0.5">
              <span className="font-(--mono)">{totalJobs}</span> jobs
              {' · '}
              <span className="font-(--mono)">{stats[jobsFilter]}</span> {FILTER_LABELS[jobsFilter].toLowerCase()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 h-9 w-60 px-3 bg-(--surface) border border-(--border-2) rounded-full focus-within:border-(--border-3) transition-[border-color] mt-1">
          <Search size={14} style={{ color: 'var(--ink-3)' }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs"
            className="flex-1 text-[13px] text-(--ink) bg-transparent outline-none placeholder:text-(--ink-4)"
          />
          {hasSearch && (
            <button onClick={() => setSearchQuery('')} className="text-(--ink-4) hover:text-(--ink-3)">
              <X size={13} />
            </button>
          )}
        </div>

        <Link
          href="/owner/jobs/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-white text-[13px] font-semibold no-underline transition-opacity hover:opacity-88 mt-1"
          style={{ background: 'var(--ink)' }}
        >
          <Plus size={14} weight={2.2} />
          New job
        </Link>
      </div>

      {/* ══ Filter pills ═════════════════════════════════════════════ */}
      <div className="flex gap-2 px-4 lg:px-8 pb-4 overflow-x-auto no-scrollbar">
        {(['active', 'completed', 'invoiced'] as const).map((f) => {
          const on = jobsFilter === f;
          return (
            <button
              key={f}
              onClick={() => setJobsFilter(f)}
              className={[
                'inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap border cursor-pointer transition-[background,color,border-color] duration-100',
                on
                  ? 'bg-(--ink) text-white border-(--ink)'
                  : 'bg-(--surface) text-(--ink-2) border-(--border) hover:border-(--border-2)',
              ].join(' ')}
            >
              {FILTER_LABELS[f]}
              {stats !== undefined && (
                <span
                  className="font-(--mono) text-[11px] font-bold tabular-nums"
                  style={{ color: on ? 'rgba(255,255,255,0.5)' : 'var(--ink-4)' }}
                >
                  · {stats[f]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ Error state ══════════════════════════════════════════════ */}
      {isError && (
        <div className="mx-4 lg:mx-8 mb-4 px-4 py-3 rounded-(--r) text-[13px] font-medium"
          style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
          Failed to load jobs. Please refresh the page.
        </div>
      )}

      {/* ══ Desktop table ════════════════════════════════════════════ */}
      <div className="hidden lg:block mx-8 bg-(--surface) rounded-(--r-md) border border-(--border) overflow-hidden mb-8">
        <div
          className={`grid ${TABLE_COLS} items-center px-5 py-2.5 border-b border-(--border)`}
          style={{ background: 'oklch(0.972 0.005 75)' }}
        >
          {['JOB', 'SUBMITTED', 'APPROVED', 'PENDING', 'STATUS', ''].map((h, i) => (
            <div
              key={i}
              className={`text-[11px] font-semibold tracking-[.05em] uppercase text-(--ink-4) ${i >= 1 && i <= 3 ? 'text-center' : ''}`}
            >
              {h}
            </div>
          ))}
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : hasSearch && filtered.length === 0 ? (
          <JobsEmptySearch query={searchQuery} />
        ) : filtered.length === 0 ? (
          <JobsEmptyState filter={jobsFilter} />
        ) : (
          filtered.map((job) => {
            const pending = job.stats?.pending ?? 0;
            return (
              <Link
                key={job._id}
                href={`/owner/jobs/${job._id}`}
                className={`grid ${TABLE_COLS} items-center px-5 py-3.5 border-b border-(--border) last:border-0 hover:bg-(--paper) transition-colors no-underline group`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-(--r) bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-2) shrink-0">
                    <Building size={18} weight={1.6} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-(--ink) leading-tight truncate">
                      {job.companyName}
                    </div>
                    {job.description && (
                      <div className="text-[12px] text-(--ink-3) truncate mt-0.5 max-w-xs">
                        {job.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-[15px] font-semibold text-(--ink) font-(--mono) tabular-nums">
                  {job.stats?.submitted ?? 0}
                </div>

                <div
                  className="text-center text-[15px] font-semibold font-(--mono) tabular-nums"
                  style={{ color: 'var(--approved)' }}
                >
                  {job.stats?.approved ?? 0}
                </div>

                <div
                  className="text-center text-[15px] font-semibold font-(--mono) tabular-nums"
                  style={{ color: pending > 0 ? 'var(--accent-deep)' : 'var(--ink-4)' }}
                >
                  {pending}
                </div>

                <div>
                  <JobStatusPill status={job.status} size="md" />
                </div>

                <div className="flex justify-end">
                  <ArrowRight size={16} style={{ color: 'var(--ink-4)' }} className="group-hover:text-(--ink-3)" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* ══ Mobile cards ═════════════════════════════════════════════ */}
      <div className="lg:hidden px-4 pb-8 flex flex-col gap-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : hasSearch && filtered.length === 0 ? (
          <JobsEmptySearch query={searchQuery} />
        ) : filtered.length === 0 ? (
          <JobsEmptyState filter={jobsFilter} />
        ) : (
          filtered.map((job) => {
            const pending = job.stats?.pending ?? 0;
            return (
              <Link
                key={job._id}
                href={`/owner/jobs/${job._id}`}
                className="block no-underline bg-(--surface) rounded-(--r-md) border border-(--border) p-3.5 shadow-(--shadow-sm) active:scale-[0.99] transition-[border-color,transform] duration-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[10px] shrink-0 bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-2)">
                    <Building size={22} weight={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold leading-[1.2] text-(--ink) tracking-[-0.01em]">
                      {job.companyName}
                    </div>
                    {job.description && (
                      <div className="text-[12px] text-(--ink-3) mt-1 leading-[1.35] line-clamp-1">
                        {job.description}
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <JobStatusPill status={job.status} />
                      <JobTypeBadge type={job.type} />
                      {pending > 0 && (
                        <span
                          className="inline-flex items-center h-[18px] px-[9px] rounded-full text-[11px] font-bold"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent-deep)' }}
                        >
                          <span className="font-(--mono)">{pending}</span>&nbsp;pending
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={16} className="shrink-0 self-center" style={{ color: 'var(--ink-4)' }} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
