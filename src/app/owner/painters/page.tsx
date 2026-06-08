'use client';

import { useState, useMemo, useEffect } from 'react';
import { useGetPaintersQuery } from '@/store/api/endpoints/painters';
import { useGetJobsQuery } from '@/store/api/endpoints/jobs';
import { Search, X } from '@/components/owner/icons';

type PainterFilter = 'all' | 'active';

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: 'var(--ink-2)' }}
    >
      {initials}
    </div>
  );
}

function IdlePill() {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-[.02em]"
      style={{ background: 'var(--paper-2)', color: 'var(--ink-3)', border: '1px solid var(--border-2)' }}
    >
      idle
    </span>
  );
}

function SkeletonMobileRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-(--border) animate-pulse">
      <div className="w-10 h-10 rounded-full bg-(--paper-2) shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 bg-(--paper-2) rounded" />
        <div className="h-2.5 w-40 bg-(--paper-2) rounded" />
        <div className="h-2.5 w-16 bg-(--paper-2) rounded" />
      </div>
    </div>
  );
}

function SkeletonDesktopRow() {
  return (
    <div
      className="grid items-center px-5 py-3.5 border-b border-(--border) animate-pulse last:border-0"
      style={{ gridTemplateColumns: '2.2fr 1.6fr' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-(--paper-2) shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-(--paper-2) rounded" />
          <div className="h-2.5 w-40 bg-(--paper-2) rounded" />
        </div>
      </div>
      <div className="h-3 w-20 bg-(--paper-2) rounded" />
    </div>
  );
}

export default function PaintersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<PainterFilter>('all');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useGetPaintersQuery({ q: debouncedSearch, page });
  const { data: activeJobs } = useGetJobsQuery('active');

  const { activePainterIds, painterJobNames } = useMemo(() => {
    if (!activeJobs) return { activePainterIds: new Set<string>(), painterJobNames: new Map<string, string[]>() };
    const ids = new Set<string>();
    const names = new Map<string, string[]>();
    for (const job of activeJobs) {
      for (const pid of job.painters) {
        ids.add(pid);
        if (!names.has(pid)) names.set(pid, []);
        names.get(pid)!.push(job.companyName);
      }
    }
    return { activePainterIds: ids, painterJobNames: names };
  }, [activeJobs]);

  const painters = data?.users ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const activeCount = activePainterIds.size;

  const displayed = filter === 'active'
    ? painters.filter((p) => activePainterIds.has(p._id))
    : painters;

  const handleFilterChange = (f: PainterFilter) => {
    setFilter(f);
    setPage(1);
  };

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  return (
    <div className="min-h-screen">

      {/* ══ Mobile top bar ═══════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-(--paper) border-b border-(--border)">
        <div className="px-4 pt-5 pb-2">
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-(--ink)">Painters</h1>
          <p className="text-[13px] text-(--ink-3) mt-0.5">
            {total > 0 ? `${total} in directory` : 'Directory'}
            {activeCount > 0 ? ` · ${activeCount} on active jobs` : ''}
          </p>
        </div>
        {/* Search */}
        <div className="px-4 pt-1 pb-2">
          <div className="flex items-center gap-2 h-10 px-3 bg-(--surface) border border-(--border-2) rounded-(--r) focus-within:border-(--border-3) transition-[border-color]">
            <Search size={15} style={{ color: 'var(--ink-3)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or phone"
              className="flex-1 text-[14px] text-(--ink) bg-transparent outline-none placeholder:text-(--ink-4)"
            />
            {search && (
              <button onClick={clearSearch} className="text-(--ink-4) hover:text-(--ink-3)">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        {/* Filter chips */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
          {([
            { key: 'all' as PainterFilter, label: `All · ${total}` },
            { key: 'active' as PainterFilter, label: `On active jobs · ${activeCount}` },
          ]).map(({ key, label }) => {
            const on = filter === key;
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className="shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-[background,color,border-color] border"
                style={{
                  background: on ? 'var(--ink)' : 'var(--surface)',
                  color: on ? '#fff' : 'var(--ink-3)',
                  borderColor: on ? 'var(--ink)' : 'var(--border-2)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Desktop header ═══════════════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-4 px-8 pt-8 pb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-(--ink)">Painters</h1>
          <p className="text-[13px] text-(--ink-3) mt-0.5">
            {total > 0 ? `${total} in directory` : 'Directory'}
            {activeCount > 0 ? ` · ${activeCount} on active jobs` : ''}
          </p>
        </div>
        {/* Desktop search */}
        <div
          className="flex items-center gap-2 h-10 px-3 bg-(--surface) border border-(--border-2) rounded-(--r) focus-within:border-(--border-3) transition-[border-color]"
          style={{ width: 340 }}
        >
          <Search size={15} style={{ color: 'var(--ink-3)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or phone"
            className="flex-1 text-[14px] text-(--ink) bg-transparent outline-none placeholder:text-(--ink-4)"
          />
          {search && (
            <button onClick={clearSearch} className="text-(--ink-4) hover:text-(--ink-3)">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ══ Desktop filter row ══════════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-1.5 px-8 pb-4">
        <span className="text-[11px] font-bold tracking-[.05em] uppercase mr-1.5" style={{ color: 'var(--ink-3)' }}>
          Filter
        </span>
        {([
          { key: 'all' as PainterFilter, label: `All · ${total}` },
          { key: 'active' as PainterFilter, label: `On active jobs · ${activeCount}` },
        ]).map(({ key, label }) => {
          const on = filter === key;
          return (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-[background,color,border-color] border"
              style={{
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? '#fff' : 'var(--ink-3)',
                borderColor: on ? 'var(--ink)' : 'var(--border-2)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ══ Mobile list ══════════════════════════════════════════════ */}
      <div className="lg:hidden">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonMobileRow key={i} />)
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-semibold text-(--ink)">No painters found</p>
            {search && (
              <p className="text-[13px] text-(--ink-3) mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          displayed.map((p) => {
            const isIdle = !activePainterIds.has(p._id);
            const jobNames = painterJobNames.get(p._id) ?? [];
            return (
              <div
                key={p._id}
                className="flex items-center gap-3 px-4 py-3 border-b border-(--border)"
              >
                <Avatar name={p.name} size={42} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</span>
                    {isIdle && <IdlePill />}
                  </div>
                  <div
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}
                  >
                    {p.email}{p.phone ? ` · ${p.phone}` : ''}
                  </div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{ color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}
                  >
                    {jobNames.length === 0
                      ? 'No active jobs'
                      : `${jobNames.length} active job${jobNames.length > 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile pagination */}
        {!isLoading && pages > 1 && filter === 'all' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-(--border)">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-[13px] font-medium text-(--ink-3) disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
            >
              ← Prev
            </button>
            <span className="text-[12px] font-medium" style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="text-[13px] font-medium text-(--ink-3) disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ══ Desktop table ════════════════════════════════════════════ */}
      <div className="hidden lg:block px-8 pb-8">
        <div
          className="overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
          }}
        >
          {/* Table header */}
          <div
            className="grid px-5 py-3 border-b border-(--border) text-[11px] font-bold uppercase tracking-[.05em]"
            style={{ gridTemplateColumns: '2.2fr 1.6fr', background: 'var(--paper-2)', color: 'var(--ink-3)' }}
          >
            <div>Painter</div>
            <div>Active jobs</div>
          </div>

          {/* Table body */}
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonDesktopRow key={i} />)
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[15px] font-semibold text-(--ink)">No painters found</p>
              {search && (
                <p className="text-[13px] text-(--ink-3) mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            displayed.map((p, i) => {
              const isIdle = !activePainterIds.has(p._id);
              const jobNames = painterJobNames.get(p._id) ?? [];
              return (
                <div
                  key={p._id}
                  className="grid items-center px-5 py-3.5 border-b border-(--border) last:border-0"
                  style={{ gridTemplateColumns: '2.2fr 1.6fr' }}
                >
                  {/* Painter cell */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.name} size={34} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</span>
                        {isIdle && <IdlePill />}
                      </div>
                      <div
                        className="text-[11px] mt-0.5 truncate"
                        style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}
                      >
                        {p.email}{p.phone ? ` · ${p.phone}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Active jobs cell */}
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {jobNames.length === 0 ? (
                      <span className="text-[12px]" style={{ color: 'var(--ink-4)' }}>—</span>
                    ) : (
                      jobNames.map((name, k) => (
                        <span
                          key={k}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: 'var(--paper-2)', color: 'var(--ink-3)', border: '1px solid var(--border-2)' }}
                        >
                          {name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop pagination */}
        {!isLoading && pages > 1 && filter === 'all' && (
          <div className="flex items-center justify-between px-1 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-[13px] font-medium text-(--ink-3) disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
            >
              ← Previous
            </button>
            <span className="text-[12px] font-medium" style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
              Page {page} of {pages} · {total} painters
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="text-[13px] font-medium text-(--ink-3) disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
