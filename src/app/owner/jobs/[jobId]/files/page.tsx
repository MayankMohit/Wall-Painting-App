'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useGetJobQuery } from '@/store/api/endpoints/jobs';
import {
  useGetFilesQuery,
  useDeleteFileMutation,
  useLazyGetDownloadUrlQuery,
  type GeneratedFile,
} from '@/store/api/endpoints/files';
import { ArrowLeft, Trash, Spark, Clock, Check, Bell } from '@/components/owner/icons';

// ── helpers ───────────────────────────────────────────────────────────────────

const FILE_META = {
  excel:      { color: 'oklch(0.55 0.13 145)', label: 'Excel · Wall log',    filterLabel: 'Excel'    },
  pdf_photos: { color: 'oklch(0.55 0.18 25)',  label: 'Photos PDF',          filterLabel: 'Photo PDF' },
  pdf_file:   { color: 'oklch(0.5 0.12 240)',  label: 'Invoice-ready PDF',   filterLabel: 'File PDF'  },
} as const;

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type FileFilter = 'all' | 'excel' | 'pdf_photos' | 'pdf_file';

// ── icons ─────────────────────────────────────────────────────────────────────

function ExcelIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" /><path d="M9 13l2 3 4-6" />
    </svg>
  );
}

function PdfIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" />
      <path d="M9.5 14h1a1 1 0 0 0 0-2h-1v4" /><path d="M15 14h1.5a1.5 1.5 0 0 1 0 3H15v-3" />
    </svg>
  );
}

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v13M5 14l7 7 7-7" /><path d="M3 21h18" />
    </svg>
  );
}

function FileTypeIcon({ type, size = 18 }: { type: GeneratedFile['fileType']; size?: number }) {
  return type === 'excel' ? <ExcelIcon size={size} /> : <PdfIcon size={size} />;
}

// ── generating hero ───────────────────────────────────────────────────────────

function GeneratingHero({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-(--r-md) p-5 text-white" style={{ background: 'var(--ink)' }}>
      <div className="flex items-center gap-4">
        <div className="w-11.5 h-11.5 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,.1)', color: 'var(--accent)' }}>
          <Spark size={24} weight={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold tracking-[-0.01em]">Building your files…</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,.6)' }}>
            {done} of {total} complete
          </div>
        </div>
        <div className="text-[26px] font-bold tracking-[-0.02em]">{pct}%</div>
      </div>
      <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.12)' }}>
        <div className="h-full rounded-full transition-[width_1s_ease]" style={{ width: `${Math.max(pct, 4)}%`, background: 'var(--accent)' }} />
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>
        <Clock size={11} />
        <span>Safe to leave — you'll get a notification when ready</span>
      </div>
    </div>
  );
}

// ── per-file progress card ────────────────────────────────────────────────────

function FileProgressCard({ file, fakeProgress }: { file: GeneratedFile; fakeProgress: number }) {
  const meta   = FILE_META[file.fileType];
  const isDone = file.status === 'ready';
  const isRun  = file.status === 'generating';

  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0"
          style={{ background: meta.color }}>
          <FileTypeIcon type={file.fileType} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-(--ink)">{meta.label}</div>
          <div className="text-[12px] text-(--ink-3) mt-0.5 truncate">{file.fileName}</div>
        </div>
        {isDone && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.03em]" style={{ color: 'var(--approved)' }}>
            <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--approved)', color: '#fff' }}>
              <Check size={10} weight={3} />
            </span>
            Done
          </span>
        )}
        {isRun && (
          <span className="font-(--mono) text-[15px] shrink-0" style={{ color: 'var(--accent-deep)' }}>
            {fakeProgress}%
          </span>
        )}
        {file.status === 'failed' && (
          <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--rejected)' }}>Failed</span>
        )}
      </div>

      {file.status !== 'failed' && (
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-2)' }}>
          <div className="h-full rounded-full" style={{
            width: `${isDone ? 100 : fakeProgress}%`,
            background: isDone ? 'var(--approved)' : meta.color,
            transition: 'width 0.9s ease',
          }} />
        </div>
      )}

      {isRun && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-(--ink-3)">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: 'var(--accent)' }} />
          Processing…
        </div>
      )}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function FilesPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);

  const [filter, setFilter]               = useState<FileFilter>('all');
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fakeProgress, setFakeProgress]   = useState<Record<string, number>>({});

  const { data: job }                      = useGetJobQuery(jobId);
  const { data: files = [], isLoading }    = useGetFilesQuery(jobId, {
    pollingInterval: 3000,
  });

  const [deleteFile]     = useDeleteFileMutation();
  const [getDownloadUrl] = useLazyGetDownloadUrlQuery();

  const hasGenerating   = files.some((f: GeneratedFile) => f.status === 'generating');
  const generatingFiles = files.filter((f: GeneratedFile) => f.status === 'generating');
  const readyFiles      = files.filter((f: GeneratedFile) => f.status === 'ready');
  const allActive       = [...generatingFiles, ...readyFiles];

  // Fake progress animation
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generatingFilesRef = useRef<GeneratedFile[]>(generatingFiles);
  generatingFilesRef.current = generatingFiles;

  useEffect(() => {
    setFakeProgress((prev) => {
      const next = { ...prev };
      for (const f of files) {
        if (f.status === 'generating' && next[f._id] === undefined) next[f._id] = 6;
        if (f.status === 'ready') next[f._id] = 100;
      }
      return next;
    });
  }, [files]);

  useEffect(() => {
    if (!hasGenerating) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setFakeProgress((prev) => {
        const next = { ...prev };
        for (const f of generatingFilesRef.current) {
          const cur = next[f._id] ?? 6;
          if (cur < 80) next[f._id] = Math.min(80, cur + Math.random() * 3.5 + 1.5);
        }
        return next;
      });
    }, 1200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hasGenerating]);

  const handleDownload = async (file: GeneratedFile) => {
    if (downloadingId) return;
    setDownloadingId(file._id);
    try {
      const res = await getDownloadUrl({ jobId, fileId: file._id }).unwrap();
      window.open(res.url, '_blank');
    } catch { /* silent */ }
    finally { setDownloadingId(null); }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    try { await deleteFile({ jobId, fileId }).unwrap(); }
    finally { setDeletingId(null); setDeleteConfirmId(null); }
  };

  const totalSize = readyFiles.reduce((sum: number, f: GeneratedFile) => sum + (f.fileSize ?? 0), 0);

  const filterCounts = {
    all:        readyFiles.length,
    excel:      readyFiles.filter((f: GeneratedFile) => f.fileType === 'excel').length,
    pdf_photos: readyFiles.filter((f: GeneratedFile) => f.fileType === 'pdf_photos').length,
    pdf_file:   readyFiles.filter((f: GeneratedFile) => f.fileType === 'pdf_file').length,
  };

  const FILTERS: { key: FileFilter; label: string }[] = [
    { key: 'all',        label: `All · ${filterCounts.all}`             },
    { key: 'excel',      label: `Excel · ${filterCounts.excel}`         },
    { key: 'pdf_photos', label: `Photo PDF · ${filterCounts.pdf_photos}` },
    { key: 'pdf_file',   label: `File PDF · ${filterCounts.pdf_file}`   },
  ];

  const displayedFiles = readyFiles.filter((f: GeneratedFile) => filter === 'all' || f.fileType === filter);

  function FilterChips({ desktop }: { desktop?: boolean }) {
    return (
      <div className={desktop ? 'flex items-center gap-1.5' : 'flex gap-1.5 overflow-x-auto scrollbar-none'}>
        {FILTERS.map(({ key, label }) => {
          const on = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full font-semibold cursor-pointer border transition-[background,color,border-color] ${desktop ? 'px-3 py-1.5 text-[12px]' : 'px-2.5 py-1.5 text-[11px]'}`}
              style={{
                background: on ? 'var(--ink)' : (desktop ? 'transparent' : 'var(--surface)'),
                color: on ? '#fff' : 'var(--ink-3)',
                borderColor: on ? 'var(--ink)' : 'var(--border-2)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--paper)">

      {/* ══ Mobile header ═══════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-(--paper) border-b border-(--border)">
        <div className="flex items-center h-14 px-4 gap-2">
          <Link href={`/owner/jobs/${jobId}`} className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors no-underline">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold text-(--ink) tracking-tight">Files</div>
            {job && (
              <div className="text-[11px] text-(--ink-3) truncate">
                {job.companyName}{totalSize > 0 ? ` · ${formatSize(totalSize)}` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-3"><FilterChips /></div>
      </div>

      {/* ══ Desktop header ══════════════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-4 px-8 pt-7 pb-5 border-b border-(--border) sticky top-0 z-10 bg-(--paper)">
        <Link href={`/owner/jobs/${jobId}`} className="w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) transition-colors no-underline shrink-0">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-bold text-(--ink) tracking-tight">Files</h1>
          {job && (
            <p className="text-[13px] text-(--ink-3) mt-0.5">
              {job.companyName}{totalSize > 0 ? ` · ${formatSize(totalSize)}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="hidden lg:block px-8 py-4"><FilterChips desktop /></div>

      {/* ══ Content ═════════════════════════════════════════════════ */}
      <div className="px-4 lg:px-8 pb-10 space-y-4">

        {/* Generating section */}
        {hasGenerating && (
          <div className="space-y-3">
            <GeneratingHero done={readyFiles.length} total={allActive.length} />
            <div className="text-[11px] font-bold tracking-wider uppercase text-(--ink-3) pt-1">Building</div>
            {generatingFiles.map((f) => (
              <FileProgressCard key={f._id} file={f} fakeProgress={Math.round(fakeProgress[f._id] ?? 6)} />
            ))}
            <div className="flex items-start gap-2.5 p-3 rounded-(--r) border border-(--border)" style={{ background: 'var(--paper-2)' }}>
              <Bell size={14} style={{ color: 'var(--ink-3)', marginTop: 1, flexShrink: 0 }} />
              <p className="text-[12px] text-(--ink-2) leading-normal">
                You can leave this page — files keep generating in the background and appear below when ready.
              </p>
            </div>
          </div>
        )}

        {/* Ready section header label */}
        {hasGenerating && displayedFiles.length > 0 && (
          <div className="text-[11px] font-bold tracking-wider uppercase text-(--ink-3) pt-1">Ready</div>
        )}

        {/* Mobile list */}
        {displayedFiles.length > 0 && (
          <div className="lg:hidden overflow-hidden rounded-(--r-md) border border-(--border)" style={{ background: 'var(--surface)' }}>
            {displayedFiles.map((f) => {
              const meta = FILE_META[f.fileType];
              return (
                <div key={f._id} className="flex items-center gap-3 px-4 py-3 border-b border-(--border) last:border-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: meta.color }}>
                    <FileTypeIcon type={f.fileType} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-(--ink) truncate">{f.fileName}</div>
                    <div className="text-[11px] text-(--ink-3) mt-0.5">
                      <span className="font-(--mono)">{formatSize(f.fileSize)}</span> · {formatDate(f.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(f)}
                    disabled={!!downloadingId}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-(--border-2) text-(--ink-2) hover:border-(--border-3) transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    {downloadingId === f._id
                      ? <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-(--ink-3) border-t-transparent animate-spin" />
                      : <DownloadIcon size={16} />}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(f._id)}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-(--border-2) hover:border-(--border-3) transition-colors cursor-pointer shrink-0"
                    style={{ color: 'var(--rejected)' }}
                  >
                    <Trash size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop table */}
        {displayedFiles.length > 0 && (
          <div className="hidden lg:block overflow-hidden rounded-(--r-md) border border-(--border)" style={{ background: 'var(--surface)' }}>
            <div
              className="grid px-5 py-3 border-b border-(--border) text-[11px] font-bold uppercase tracking-wider text-(--ink-3)"
              style={{ gridTemplateColumns: '52px 2fr 110px 160px 130px', background: 'var(--paper-2)' }}
            >
              <div /><div>Name</div><div>Size</div><div>Generated</div><div className="text-right">Actions</div>
            </div>
            {displayedFiles.map((f) => {
              const meta = FILE_META[f.fileType];
              return (
                <div
                  key={f._id}
                  className="grid items-center px-5 py-3 border-b border-(--border) last:border-0"
                  style={{ gridTemplateColumns: '52px 2fr 110px 160px 130px' }}
                >
                  <div className="w-9.5 h-9.5 rounded-lg flex items-center justify-center text-white" style={{ background: meta.color }}>
                    <FileTypeIcon type={f.fileType} size={18} />
                  </div>
                  <div className="text-[13px] font-semibold text-(--ink) truncate pr-4">{f.fileName}</div>
                  <div className="text-[13px] text-(--ink-2) font-(--mono)">{formatSize(f.fileSize)}</div>
                  <div className="text-[13px] text-(--ink-3)">{formatDate(f.createdAt)}</div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => handleDownload(f)}
                      disabled={!!downloadingId}
                      className="w-8.5 h-8.5 flex items-center justify-center rounded-full border border-(--border-2) text-(--ink-2) hover:border-(--border-3) transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {downloadingId === f._id
                        ? <span className="w-3 h-3 rounded-full border-[1.5px] border-(--ink-3) border-t-transparent animate-spin" />
                        : <DownloadIcon size={16} />}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(f._id)}
                      className="w-8.5 h-8.5 flex items-center justify-center rounded-full border border-(--border-2) hover:border-(--border-3) transition-colors cursor-pointer"
                      style={{ color: 'var(--rejected)' }}
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-(--paper-2) shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-(--paper-2) rounded" />
                    <div className="h-2.5 w-48 bg-(--paper-2) rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasGenerating && displayedFiles.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-[14px] bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-3) mx-auto mb-4">
              <Spark size={22} weight={1.8} />
            </div>
            <div className="text-[15px] font-semibold text-(--ink) mb-1.5">No files yet</div>
            <div className="text-[13px] text-(--ink-3)">
              {filter !== 'all' ? 'No files match this filter.' : 'Generate files from the job page.'}
            </div>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="mt-3 text-[13px] font-semibold text-(--accent-deep) bg-transparent border-0 cursor-pointer">
                Show all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══ Delete confirm dialog ════════════════════════════════════ */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}
        >
          <div className="w-full max-w-sm rounded-(--r-lg) overflow-hidden shadow-(--shadow)" style={{ background: 'var(--paper)' }}>
            <div className="px-5 pt-5 pb-4">
              <div className="text-[16px] font-bold text-(--ink) mb-1.5">Delete file?</div>
              <div className="text-[14px] text-(--ink-3) leading-normal">
                This file will be permanently deleted and cannot be recovered.
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 h-10 rounded-full border border-(--border-2) text-[13px] font-semibold text-(--ink-2) bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deletingId === deleteConfirmId}
                className="flex-1 h-10 rounded-full text-[13px] font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--rejected)' }}
              >
                {deletingId === deleteConfirmId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
