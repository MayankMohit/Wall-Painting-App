'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useGetJobQuery } from '@/store/api/endpoints/jobs';
import {
  useGetFilesQuery,
  useDeleteFileMutation,
  useLazyGetDownloadUrlQuery,
  useLazyGetPreviewUrlQuery,
  type GeneratedFile,
} from '@/store/api/endpoints/files';
import { ArrowLeft, Trash, Spark, Clock, Check, Bell, X } from '@/components/owner/icons';

// ── helpers ───────────────────────────────────────────────────────────────────

const FILE_META = {
  excel:          { color: 'oklch(0.55 0.13 145)', label: 'Excel · Master List',  filterLabel: 'Master Excel' },
  excel_painters: { color: 'oklch(0.48 0.16 160)', label: 'Excel · Painter-wise', filterLabel: 'Painter Excel' },
  pdf_excel:      { color: 'oklch(0.5 0.12 200)',  label: 'PDF · Master List',    filterLabel: 'Master PDF' },
  pdf_photos:     { color: 'oklch(0.55 0.18 25)',  label: 'Photos PDF',           filterLabel: 'Photo PDF' },
  pdf_file:       { color: 'oklch(0.5 0.12 240)',  label: 'Invoice-ready PDF',    filterLabel: 'File PDF'  },
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

type FileFilter = 'all' | 'excel' | 'excel_painters' | 'pdf_photos' | 'pdf_file';

const EMPTY_FILES: GeneratedFile[] = [];

// Files made in one "generate" action land within a few seconds of each other.
// Group them into batches: consecutive files (newest first) stay in the same
// batch while the gap between them is ≤ 5 min; a larger gap starts a new batch,
// which the UI renders with a small separation.
const CLUSTER_GAP_MS = 5 * 60 * 1000;

function clusterByTime(files: GeneratedFile[]): GeneratedFile[][] {
  if (files.length === 0) return [];
  const sorted = [...files].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const clusters: GeneratedFile[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].createdAt).getTime();
    const cur = new Date(sorted[i].createdAt).getTime();
    if (prev - cur <= CLUSTER_GAP_MS) clusters[clusters.length - 1].push(sorted[i]);
    else clusters.push([sorted[i]]);
  }
  return clusters;
}

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

function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.41a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24-1.5 0-2.98-.4-4.27-1.17l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24zm-3.5 4.44c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03s.87 2.36 1 2.52c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.32-.74-1.8-.19-.46-.39-.4-.54-.41-.14-.01-.3-.01-.46-.01z" />
    </svg>
  );
}

function MoreIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function FileTypeIcon({ type, size = 18 }: { type: GeneratedFile['fileType']; size?: number }) {
  return type.startsWith('excel') ? <ExcelIcon size={size} /> : <PdfIcon size={size} />;
}

// A single-line filename that scrolls (marquee) only when it overflows its
// container, so the whole name is readable on narrow phone screens without
// permanently truncating it. Short names that fit are left static.
//
// Uses the Web Animations API (not a CSS keyframe) so the scroll distance is the
// exact measured overflow in px — CSS custom properties inside @keyframes are
// unreliable on mobile browsers, which is why the pure-CSS version didn't show.
function MarqueeName({ text, className }: { text: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const el = textRef.current;
    if (!wrap || !el) return;

    let anim: Animation | null = null;
    const update = () => {
      const shift = el.scrollWidth - wrap.clientWidth;
      if (anim) { anim.cancel(); anim = null; }
      if (shift > 4) {
        const duration = Math.max(7000, (shift / 18) * 1000); // ~18px/s, min 7s
        anim = el.animate(
          [
            { transform: 'translateX(0)', offset: 0 },
            { transform: 'translateX(0)', offset: 0.18 },            // pause at start
            { transform: `translateX(${-shift}px)`, offset: 0.82 },  // scroll to end
            { transform: `translateX(${-shift}px)`, offset: 1 },     // pause at end
          ],
          { duration, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
        );
      }
    };

    update();               // measure once now (layout is ready inside an effect)
    const ro = new ResizeObserver(update); // re-measure on width/rotation changes
    ro.observe(wrap);
    ro.observe(el);
    return () => { if (anim) anim.cancel(); ro.disconnect(); };
  }, [text]);

  return (
    <div ref={wrapRef} className={`overflow-hidden ${className ?? ''}`}>
      <span ref={textRef} className="inline-block whitespace-nowrap">{text}</span>
    </div>
  );
}

function Checkbox({ on }: { on: boolean }) {
  return (
    <div
      className="w-5.5 h-5.5 rounded-md shrink-0 flex items-center justify-center transition-colors"
      style={{ background: on ? 'var(--accent)' : 'transparent', border: on ? 'none' : '1.5px solid var(--border-3)' }}
    >
      {on && <Check size={12} weight={3} style={{ color: '#fff' }} />}
    </div>
  );
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

// ── preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  url,
  fileType,
  fileName,
  onClose,
}: {
  url: string;
  fileType: string;
  fileName: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  const src = fileType.startsWith('excel')
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
    : url;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.88)' }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 h-13 shrink-0" style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{fileName}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {fileType.startsWith('excel') ? 'Excel preview via Office Online' : 'PDF preview'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Iframe area */}
      <div className="relative flex-1 min-h-0">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading preview…</p>
          </div>
        )}
        <iframe
          src={src}
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
          title={fileName}
          // PDFs: allow same-origin; Excel: Office Online handles it
          sandbox={fileType.startsWith('excel') ? 'allow-scripts allow-same-origin allow-forms allow-popups' : undefined}
        />
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function FilesPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);

  const [filter, setFilter]               = useState<FileFilter>('all');
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sharingId, setSharingId]         = useState<string | null>(null);
  const [rowMenu, setRowMenu]             = useState<{ file: GeneratedFile; top: number; right: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fakeProgress, setFakeProgress]   = useState<Record<string, number>>({});
  const [previewingId, setPreviewingId]   = useState<string | null>(null);
  const [previewData, setPreviewData]     = useState<{ url: string; fileType: string; fileName: string } | null>(null);
  const [selectMode, setSelectMode]       = useState(false);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy]           = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: job }                      = useGetJobQuery(jobId);
  const { data: files = EMPTY_FILES, isLoading } = useGetFilesQuery(jobId, {
    pollingInterval: 3000,
  });

  const [deleteFile]     = useDeleteFileMutation();
  const [getDownloadUrl] = useLazyGetDownloadUrlQuery();
  const [getPreviewUrl]  = useLazyGetPreviewUrlQuery();

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
      let changed = false;
      for (const f of files) {
        if (f.status === 'generating' && next[f._id] === undefined) { next[f._id] = 6; changed = true; }
        if (f.status === 'ready' && next[f._id] !== 100)            { next[f._id] = 100; changed = true; }
      }
      return changed ? next : prev;
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

  const handlePreview = async (file: GeneratedFile) => {
    if (previewingId) return;
    setPreviewingId(file._id);
    try {
      const res = await getPreviewUrl({ jobId, fileId: file._id }).unwrap();
      setPreviewData({ url: res.url, fileType: res.fileType, fileName: file.fileName });
    } catch { /* silent */ }
    finally { setPreviewingId(null); }
  };

  // Download the actual file bytes same-origin (avoids R2 CORS) and wrap them in a
  // File so the OS share sheet can attach the real document to WhatsApp.
  const fetchShareFile = async (file: GeneratedFile): Promise<File> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;
    const res = await fetch(`/api/jobs/${jobId}/files/${file._id}/raw`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error('Failed to fetch file');
    const blob = await res.blob();
    return new File([blob], file.fileName, { type: blob.type });
  };

  // Chrome's Web Share allowlist only permits certain file types. .xlsx is NOT on
  // it (only pdf, images, audio, video, text/*), so Excel can never be attached as
  // a real file — it must go via link. In this app the `excel*` types are the only
  // .xlsx outputs; every other type (incl. pdf_excel) is a shareable PDF. A plain
  // type check is more reliable than probing canShare() with a fake/empty File,
  // which some Chromium builds reject regardless of type.
  const canFileShare = (file: GeneratedFile): boolean => !file.fileType.startsWith('excel');

  // Fallback for files the OS can't attach (Excel, or desktop with no file-share
  // support): share a WhatsApp download link instead.
  const shareLinkFallback = async (files: GeneratedFile[]) => {
    const blocks: string[] = [];
    for (const f of files) {
      try {
        const res = await getDownloadUrl({ jobId, fileId: f._id }).unwrap();
        blocks.push(`${f.fileName}\n${res.url}`);
      } catch { /* skip */ }
    }
    if (blocks.length) {
      window.open(`https://wa.me/?text=${encodeURIComponent(blocks.join('\n\n'))}`, '_blank');
    }
  };

  // Share a single file: attach the real document via the native share sheet.
  const handleShare = async (file: GeneratedFile) => {
    if (sharingId) return;
    setSharingId(file._id);
    try {
      // Excel can't be attached (Chrome allowlist) — go straight to link, no fetch.
      if (!canFileShare(file)) {
        await shareLinkFallback([file]);
        return;
      }
      const shareFile = await fetchShareFile(file);
      if (navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: file.fileName });
      } else {
        await shareLinkFallback([file]);
      }
    } catch (e) {
      // User dismissing the share sheet throws AbortError — ignore it.
      if ((e as Error)?.name !== 'AbortError') {
        try { await shareLinkFallback([file]); } catch { /* silent */ }
      }
    } finally {
      setSharingId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    try { await deleteFile({ jobId, fileId }).unwrap(); }
    finally { setDeletingId(null); setDeleteConfirmId(null); }
  };

  // ── multi-select ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const handleBulkDownload = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      // Sequential: each presigned URL forces an attachment download, so an
      // anchor click downloads without opening tabs. A small gap avoids the
      // browser's "download multiple files?" throttle racing the clicks.
      for (const file of displayedFiles.filter((f) => selected.has(f._id))) {
        try {
          const res = await getDownloadUrl({ jobId, fileId: file._id }).unwrap();
          const a = document.createElement('a');
          a.href = res.url;
          a.download = file.fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          await new Promise((r) => setTimeout(r, 400));
        } catch { /* skip the failed one, continue the rest */ }
      }
    } finally {
      setBulkBusy(false);
    }
  };

  // Share several files at once: attach the real documents to a single share so the
  // recipient gets them all in one WhatsApp chat.
  const handleBulkShare = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      const chosen = displayedFiles.filter((f) => selected.has(f._id));
      // Partition: PDFs (and other allowlisted types) attach as real files; Excel
      // can't be attached by Chrome, so a single .xlsx must not force the whole
      // batch to links. Route the shareable ones to the native share sheet and the
      // rest (Excel) to a link.
      const shareable = chosen.filter(canFileShare);
      const linkOnly  = chosen.filter((f) => !canFileShare(f));

      // Fetch shareable bytes in PARALLEL (sequential fetches expire the transient
      // user-activation window navigator.share() needs, which silently drops us to
      // the link path once enough files are selected).
      const results = await Promise.allSettled(shareable.map((f) => fetchShareFile(f)));
      const shareFiles = results
        .filter((r): r is PromiseFulfilledResult<File> => r.status === 'fulfilled')
        .map((r) => r.value);

      if (shareFiles.length && navigator.canShare?.({ files: shareFiles })) {
        await navigator.share({ files: shareFiles, title: 'Files' });
        // Excel can't ride along in the file share — send those as links after.
        if (linkOnly.length) await shareLinkFallback(linkOnly);
      } else {
        await shareLinkFallback(chosen);
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        try { await shareLinkFallback(displayedFiles.filter((f) => selected.has(f._id))); } catch { /* silent */ }
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkBusy(true);
    try {
      for (const id of selected) {
        try { await deleteFile({ jobId, fileId: id }).unwrap(); }
        catch { /* skip and continue */ }
      }
    } finally {
      setBulkBusy(false);
      setBulkDeleteConfirm(false);
      exitSelect();
    }
  };

  const totalSize = readyFiles.reduce((sum: number, f: GeneratedFile) => sum + (f.fileSize ?? 0), 0);

  const filterCounts = {
    all:            readyFiles.length,
    excel:          readyFiles.filter((f: GeneratedFile) => f.fileType === 'excel').length,
    excel_painters: readyFiles.filter((f: GeneratedFile) => f.fileType === 'excel_painters').length,
    pdf_photos:     readyFiles.filter((f: GeneratedFile) => f.fileType === 'pdf_photos').length,
    pdf_file:       readyFiles.filter((f: GeneratedFile) => f.fileType === 'pdf_file').length,
  };

  const FILTERS: { key: FileFilter; label: string }[] = [
    { key: 'all',            label: `All · ${filterCounts.all}`             },
    { key: 'excel',          label: `Master Excel · ${filterCounts.excel}`  },
    { key: 'excel_painters', label: `Painter Excel · ${filterCounts.excel_painters}` },
    { key: 'pdf_photos',     label: `Photo PDF · ${filterCounts.pdf_photos}`},
    { key: 'pdf_file',       label: `File PDF · ${filterCounts.pdf_file}`   },
  ];

  const displayedFiles = readyFiles.filter((f: GeneratedFile) => filter === 'all' || f.fileType === filter);
  const clusters = clusterByTime(displayedFiles);

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
      <div className="px-4 lg:px-8 pt-3 pb-10 space-y-4">

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

        {/* Selection toolbar */}
        {displayedFiles.length > 0 && (() => {
          const displayedIds = displayedFiles.map((f) => f._id);
          const allSelected = displayedIds.length > 0 && displayedIds.every((id) => selected.has(id));
          return (
            <div className="flex items-center min-h-9 py-1">
              {!selectMode ? (
                <button
                  onClick={() => { setSelectMode(true); setSelected(new Set()); }}
                  className="ml-auto inline-flex items-center h-9 px-4 rounded-full text-[13px] font-bold text-(--ink) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-colors cursor-pointer"
                >
                  Select Files
                </button>
              ) : (
                <>
                  <span className="text-[13px] font-bold text-(--ink-2)">
                    {selected.size} selected
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setSelected(allSelected ? new Set() : new Set(displayedIds))}
                      className="inline-flex items-center gap-2 h-9 pl-3 pr-4 rounded-full text-[13px] font-bold text-(--ink) border cursor-pointer transition-colors"
                      style={{
                        borderColor: allSelected ? 'var(--accent)' : 'var(--border-2)',
                        background: allSelected ? 'var(--accent-soft)' : 'var(--surface)',
                      }}
                    >
                      <Checkbox on={allSelected} />
                      {allSelected ? 'Clear all' : 'Select all'}
                    </button>
                    <button
                      onClick={exitSelect}
                      className="inline-flex items-center h-9 px-4 rounded-full text-[13px] font-bold text-white border-0 cursor-pointer transition-opacity hover:opacity-88"
                      style={{ background: 'var(--rejected)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Mobile list — one bordered card per time-batch, separated by a gap */}
        {displayedFiles.length > 0 && (
          <div className="lg:hidden space-y-2.5">
            {clusters.map((cluster, ci) => (
              <div key={ci} className="overflow-hidden rounded-(--r-md) border border-(--border)" style={{ background: 'var(--surface)' }}>
                {cluster.map((f) => {
                  const meta = FILE_META[f.fileType];
                  const sel  = selected.has(f._id);
                  return (
                    <div
                      key={f._id}
                      onClick={selectMode ? () => toggleSelect(f._id) : () => handlePreview(f)}
                      className="flex items-center gap-3 px-4 py-3 border-b border-(--border) last:border-0 cursor-pointer"
                      style={selectMode && sel ? { background: 'var(--accent-soft)' } : undefined}
                    >
                      {selectMode ? (
                        <div className="w-10 flex items-center justify-center shrink-0"><Checkbox on={sel} /></div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: meta.color }}>
                          <FileTypeIcon type={f.fileType} size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <MarqueeName text={f.fileName} className="text-[13px] font-semibold text-(--ink)" />
                        <div className="text-[11px] text-(--ink-3) mt-0.5">
                          <span className="font-(--mono)">{formatSize(f.fileSize)}</span> · {formatDate(f.createdAt)}
                        </div>
                      </div>
                      {!selectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const r = e.currentTarget.getBoundingClientRect();
                            setRowMenu({ file: f, top: r.bottom + 6, right: window.innerWidth - r.right });
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-full border border-(--border-2) text-(--ink-2) hover:border-(--border-3) transition-colors cursor-pointer shrink-0"
                          aria-label="File actions"
                        >
                          <MoreIcon size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Desktop table — one bordered card per time-batch, separated by a gap */}
        {displayedFiles.length > 0 && (
          <div className="hidden lg:block space-y-2.5">
            {clusters.map((cluster, ci) => (
              <div key={ci} className="overflow-hidden rounded-(--r-md) border border-(--border)" style={{ background: 'var(--surface)' }}>
                {ci === 0 && (
                  <div
                    className="grid px-5 py-3 border-b border-(--border) text-[11px] font-bold uppercase tracking-wider text-(--ink-3)"
                    style={{ gridTemplateColumns: '52px 2fr 110px 160px 130px', background: 'var(--paper-2)' }}
                  >
                    <div /><div>Name</div><div>Size</div><div>Generated</div><div className="text-right">Actions</div>
                  </div>
                )}
                {cluster.map((f) => {
                  const meta = FILE_META[f.fileType];
                  const sel  = selected.has(f._id);
                  return (
                    <div
                      key={f._id}
                      onClick={selectMode ? () => toggleSelect(f._id) : () => handlePreview(f)}
                      className="grid items-center px-5 py-3 border-b border-(--border) last:border-0 cursor-pointer"
                      style={{ gridTemplateColumns: '52px 2fr 110px 160px 130px', ...(selectMode && sel ? { background: 'var(--accent-soft)' } : {}) }}
                    >
                      {selectMode ? (
                        <div className="w-9.5 h-9.5 flex items-center justify-center"><Checkbox on={sel} /></div>
                      ) : (
                        <div className="w-9.5 h-9.5 rounded-lg flex items-center justify-center text-white" style={{ background: meta.color }}>
                          <FileTypeIcon type={f.fileType} size={18} />
                        </div>
                      )}
                      <div className="text-[13px] font-semibold text-(--ink) truncate pr-4">{f.fileName}</div>
                      <div className="text-[13px] text-(--ink-2) font-(--mono)">{formatSize(f.fileSize)}</div>
                      <div className="text-[13px] text-(--ink-3)">{formatDate(f.createdAt)}</div>
                      {selectMode ? (
                        <div />
                      ) : (
                        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handlePreview(f)}
                            disabled={!!previewingId}
                            className="w-8.5 h-8.5 flex items-center justify-center rounded-full border border-(--border-2) text-(--ink-2) hover:border-(--border-3) transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {previewingId === f._id
                              ? <span className="w-3 h-3 rounded-full border-[1.5px] border-(--ink-3) border-t-transparent animate-spin" />
                              : <EyeIcon size={16} />}
                          </button>
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
                            onClick={() => handleShare(f)}
                            disabled={!!sharingId}
                            className="w-8.5 h-8.5 flex items-center justify-center rounded-full border border-(--border-2) hover:border-(--border-3) transition-colors cursor-pointer disabled:opacity-40"
                            style={{ color: '#25D366' }}
                            aria-label="Share to WhatsApp"
                          >
                            {sharingId === f._id
                              ? <span className="w-3 h-3 rounded-full border-[1.5px] border-(--ink-3) border-t-transparent animate-spin" />
                              : <WhatsAppIcon size={16} />}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(f._id)}
                            className="w-8.5 h-8.5 flex items-center justify-center rounded-full border border-(--border-2) hover:border-(--border-3) transition-colors cursor-pointer"
                            style={{ color: 'var(--rejected)' }}
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
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

      {/* ══ Mobile per-file action menu ══════════════════════════════ */}
      {rowMenu && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setRowMenu(null)}>
          <div
            className="absolute w-44 rounded-(--r-md) border border-(--border) shadow-(--shadow) overflow-hidden py-1"
            style={{ top: rowMenu.top, right: rowMenu.right, background: 'var(--surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { const f = rowMenu.file; setRowMenu(null); handlePreview(f); }}
              className="w-full flex items-center gap-3 px-4 h-11 text-[14px] font-semibold text-(--ink) hover:bg-(--paper-2) transition-colors cursor-pointer bg-transparent border-0"
            >
              <EyeIcon size={17} /> Preview
            </button>
            <button
              onClick={() => { const f = rowMenu.file; setRowMenu(null); handleDownload(f); }}
              className="w-full flex items-center gap-3 px-4 h-11 text-[14px] font-semibold text-(--ink) hover:bg-(--paper-2) transition-colors cursor-pointer bg-transparent border-0"
            >
              <DownloadIcon size={17} /> Download
            </button>
            <button
              onClick={() => { const f = rowMenu.file; setRowMenu(null); handleShare(f); }}
              className="w-full flex items-center gap-3 px-4 h-11 text-[14px] font-semibold text-(--ink) hover:bg-(--paper-2) transition-colors cursor-pointer bg-transparent border-0"
            >
              <span style={{ color: '#25D366', display: 'inline-flex' }}><WhatsAppIcon size={17} /></span> Share
            </button>
            <button
              onClick={() => { const id = rowMenu.file._id; setRowMenu(null); setDeleteConfirmId(id); }}
              className="w-full flex items-center gap-3 px-4 h-11 text-[14px] font-semibold hover:bg-(--paper-2) transition-colors cursor-pointer bg-transparent border-0 border-t border-(--border)"
              style={{ color: 'var(--rejected)' }}
            >
              <Trash size={16} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* ══ Bulk action bar ══════════════════════════════════════════ */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-2 py-2 rounded-full shadow-(--shadow)"
          style={{ background: 'var(--ink)' }}>
          <span className="text-[13px] font-semibold text-white pl-3 pr-1 tabular-nums">{selected.size}</span>
          <button
            onClick={handleBulkDownload}
            disabled={bulkBusy}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}
          >
            {bulkBusy
              ? <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/40 border-t-white animate-spin" />
              : <DownloadIcon size={15} />}
            Download
          </button>
          <button
            onClick={handleBulkShare}
            disabled={bulkBusy}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-opacity"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <WhatsAppIcon size={15} />
            Share
          </button>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            disabled={bulkBusy}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--rejected)' }}
          >
            <Trash size={15} /> Delete
          </button>
        </div>
      )}

      {/* ══ Bulk delete confirm dialog ═══════════════════════════════ */}
      {bulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !bulkBusy) setBulkDeleteConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-(--r-lg) overflow-hidden shadow-(--shadow)" style={{ background: 'var(--paper)' }}>
            <div className="px-5 pt-5 pb-4">
              <div className="text-[16px] font-bold text-(--ink) mb-1.5">Delete {selected.size} file{selected.size > 1 ? 's' : ''}?</div>
              <div className="text-[14px] text-(--ink-3) leading-normal">
                These files will be permanently deleted and cannot be recovered.
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkBusy}
                className="flex-1 h-10 rounded-full border border-(--border-2) text-[13px] font-semibold text-(--ink-2) bg-transparent cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkBusy}
                className="flex-1 h-10 rounded-full text-[13px] font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--rejected)' }}
              >
                {bulkBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete confirm dialog ════════════════════════════════════ */}
      {previewData && (
        <PreviewModal
          url={previewData.url}
          fileType={previewData.fileType}
          fileName={previewData.fileName}
          onClose={() => setPreviewData(null)}
        />
      )}

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
