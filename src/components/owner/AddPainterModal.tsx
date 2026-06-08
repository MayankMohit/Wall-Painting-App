'use client';

import { useState } from 'react';
import { useGetPaintersQuery } from '@/store/api/endpoints/painters';
import { useUpdateJobMutation } from '@/store/api/endpoints/jobs';
import { Search, X, Plus } from '@/components/owner/icons';
import type { Painter } from '@/store/api/endpoints/painters';

const PER_PAGE = 5;

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
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

interface AddPainterModalProps {
  jobId: string;
  existingIds: string[];
  onClose: () => void;
}

export function AddPainterModal({ jobId, existingIds, onClose }: AddPainterModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data, isLoading } = useGetPaintersQuery();
  const [updateJob] = useUpdateJobMutation();

  const excluded = new Set([...existingIds, ...addedIds]);
  const allPainters = (data?.users ?? []).filter((p) => !excluded.has(p._id));

  const filtered = searchTerm.trim()
    ? allPainters.filter((p) => {
        const q = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q);
      })
    : allPainters;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagePainters = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleSearch = (q: string) => { setSearchTerm(q); setPage(1); };

  const handleAdd = async (painter: Painter) => {
    setAddingId(painter._id);
    try {
      await updateJob({
        jobId,
        body: { painterIds: [...existingIds, ...addedIds, painter._id] },
      }).unwrap();
      setAddedIds((prev) => [...prev, painter._id]);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-(--paper) rounded-(--r-lg) overflow-hidden flex flex-col max-h-[82vh] shadow-(--shadow)">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-(--border)">
          <div className="flex-1">
            <div className="text-[16px] font-bold text-(--ink) tracking-[-0.01em]">Add painter</div>
            {addedIds.length > 0 && (
              <div className="text-[12px] text-(--ink-3) mt-0.5">
                <span className="font-(--mono) font-semibold text-(--approved)">{addedIds.length}</span> added this session
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-(--border)">
          <div className="flex items-center gap-2 h-10 px-3 bg-(--surface) border border-(--border-2) rounded-(--r) focus-within:border-(--border-3) transition-[border-color]">
            <Search size={15} style={{ color: 'var(--ink-3)' }} />
            <input
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or phone"
              autoFocus
              className="flex-1 text-[14px] text-(--ink) bg-transparent outline-none placeholder:text-(--ink-4)"
            />
            {searchTerm && (
              <button onClick={() => handleSearch('')} className="text-(--ink-4) hover:text-(--ink-3)">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-(--border) animate-pulse">
                <div className="w-8 h-8 rounded-full bg-(--paper-2) shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 bg-(--paper-2) rounded" />
                  <div className="h-2.5 w-20 bg-(--paper-2) rounded" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-(--ink-3)">
              {searchTerm ? 'No painters match your search.' : 'All painters are already on this job.'}
            </div>
          ) : (
            pagePainters.map((p) => {
              const adding = addingId === p._id;
              return (
                <div
                  key={p._id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-(--border) last:border-0"
                >
                  <Avatar name={p.name} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</div>
                    <div className="text-[11px] text-(--ink-3) font-(--mono) mt-0.5">
                      {p.phone ?? p.email}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={adding}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-(--r) text-[12px] font-semibold text-(--ink) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {adding ? (
                      <span className="w-3 h-3 rounded-full border-[1.5px] border-(--ink-3) border-t-transparent animate-spin" />
                    ) : (
                      <Plus size={12} weight={2.2} />
                    )}
                    Add
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-(--border) text-[12px] text-(--ink-3)">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="font-medium disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
            >
              ← Prev
            </button>
            <span className="font-(--mono) tabular-nums">{safePage} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="font-medium disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
