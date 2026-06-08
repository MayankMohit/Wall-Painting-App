'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useGetJobQuery, useUpdateJobMutation, useDeleteJobMutation } from '@/store/api/endpoints/jobs';
import { JobStatusPill } from '@/components/owner/JobStatusPill';
import { AddPainterModal } from '@/components/owner/AddPainterModal';
import {
  ArrowLeft, Menu, Plus, FileIcon, Brush, X, Trash, Clock, Users, Check, Spark, ArrowRight,
} from '@/components/owner/icons';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
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

// ── table column layout ───────────────────────────────────────────────────────
const PAINTER_COLS = 'grid-cols-[2fr_1fr_1fr_1fr_1fr_52px]';

// ── page ─────────────────────────────────────────────────────────────────────
export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();

  const [addPainterOpen, setAddPainterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [genTypes, setGenTypes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const { data: job, isLoading, isError } = useGetJobQuery(jobId);
  const [updateJob, { isLoading: saving }] = useUpdateJobMutation();
  const [deleteJob, { isLoading: deleting }] = useDeleteJobMutation();

  const { register, handleSubmit, formState: { isSubmitting: editSubmitting } } = useForm({
    values: { companyName: job?.companyName ?? '', description: job?.description ?? '' },
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="m-6 px-4 py-3 rounded-full text-[13px] font-medium"
        style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
        Failed to load job.
      </div>
    );
  }

  const existingPainterIds = job.painters.map((p) => p._id);
  const startDate = job.startDate ?? job.createdAt;
  const jobRejected = job.stats.submitted - job.stats.approved - job.stats.pending;

  const handleEditSave = async (data: { companyName: string; description: string }) => {
    await updateJob({ jobId, body: { companyName: data.companyName, description: data.description } }).unwrap();
    setEditOpen(false);
  };

  const handleDeleteConfirm = async () => {
    await deleteJob(jobId).unwrap();
    router.push('/owner/jobs');
  };

  const handleGenerate = async () => {
    if (genTypes.length === 0) return;
    setIsGenerating(true);
    setGenError('');
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch(`/api/jobs/${jobId}/files/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ types: genTypes, ownerInput: { companyName: job.companyName } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Generation failed');
      }
      setGenOpen(false);
      setGenTypes([]);
      router.push(`/owner/jobs/${jobId}/files`);
    } catch (err: unknown) {
      setGenError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGenType = (t: string) =>
    setGenTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  return (
    <>
      {/* ══ Mobile top bar ════════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-(--paper) border-b border-(--border) flex items-center h-14 px-4 gap-2">
        <Link href="/owner/jobs" className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors no-underline">
          <ArrowLeft size={20} />
        </Link>
        <span className="flex-1" />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          {menuOpen && <DropdownMenu onClose={() => setMenuOpen(false)} onEdit={() => { setMenuOpen(false); setEditOpen(true); }} onDelete={() => { setMenuOpen(false); setDeleteOpen(true); }} />}
        </div>
      </div>

      {/* ══ Desktop header ════════════════════════════════════════════ */}
      <div className="hidden lg:flex items-start gap-4 px-8 pt-7 pb-5 border-b border-(--border) sticky top-0 z-10 bg-(--paper)">
        <Link href="/owner/jobs" className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) transition-colors no-underline shrink-0">
          <ArrowLeft size={17} />
        </Link>
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] font-bold text-(--ink) tracking-[-0.025em] leading-tight">
              {job.companyName}
            </h1>
            <JobStatusPill status={job.status} size="sm" />
          </div>
          {job.description && (
            <p className="text-[13px] text-(--ink-3) mt-0.5 line-clamp-1">{job.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Link
            href={`/owner/jobs/${jobId}/files`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) no-underline hover:border-(--border-3) transition-[border-color]"
          >
            <FileIcon size={15} weight={1.6} />
            Files
          </Link>
          <button
            onClick={() => setGenOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-88"
            style={{ background: 'var(--accent)' }}
          >
            <Spark size={14} weight={2} />
            Generate files
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors cursor-pointer"
            >
              <Menu size={18} />
            </button>
            {menuOpen && <DropdownMenu onClose={() => setMenuOpen(false)} onEdit={() => { setMenuOpen(false); setEditOpen(true); }} onDelete={() => { setMenuOpen(false); setDeleteOpen(true); }} />}
          </div>
        </div>
      </div>

      {/* ══ Mobile body ═══════════════════════════════════════════════ */}
      <div className="lg:hidden px-4 pt-5 pb-40">
        {/* Title + status inline */}
        <div className="flex items-center gap-2.5 flex-wrap mb-0">
          <h1 className="text-[24px] font-bold text-(--ink) tracking-[-0.025em] leading-[1.15]">
            {job.companyName}
          </h1>
          <JobStatusPill status={job.status} size="sm" />
        </div>
        {job.description && (
          <p className="text-[13px] text-(--ink-3) mt-1.5 leading-[1.5]">{job.description}</p>
        )}

        {/* Dates */}
        <div className="mt-3 flex items-center gap-1 text-[12px] text-(--ink-3)">
          <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
          Started {fmt(startDate)}
          {job.status === 'invoiced' && job.endDate && (
            <> · Ended {fmt(job.endDate)}</>
          )}
        </div>

        {/* Stat tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MobileStat label="Submitted" value={job.stats.submitted} color="var(--ink)" accent="var(--border-3)" />
          <MobileStat label="Approved" value={job.stats.approved} color="var(--approved)" accent="var(--approved)" />
          <MobileStat label="Pending" value={job.stats.pending} color="var(--accent-deep)" accent="var(--accent)" />
          {jobRejected > 0 && (
            <MobileStat label="Rejected" value={jobRejected} color="var(--rejected)" accent="var(--rejected)" />
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <div className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-(--ink) bg-(--surface) border border-(--border-2)">
            <Users size={15} weight={1.8} />
            Painters · {job.painters.length}
          </div>
          <Link
            href={`/owner/jobs/${jobId}/files`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) no-underline hover:border-(--border-3) transition-[border-color]"
          >
            <FileIcon size={15} weight={1.6} />
            Files
          </Link>
        </div>

        {/* Painters list */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-bold text-(--ink-2) uppercase tracking-[.05em]">
              Painters on this job
            </div>
            <button
              onClick={() => setAddPainterOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer"
            >
              <Plus size={14} weight={2.2} />
              Add painter
            </button>
          </div>

          {job.painters.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-(--ink-3)">
              No painters assigned yet.
            </div>
          ) : (
            <div>
              {job.painters.map((p, i) => {
                const rej = p.stats.submitted - p.stats.approved - p.stats.pending;
                return (
                  <Link
                    key={p._id}
                    href={`/owner/jobs/${jobId}/painters/${p._id}`}
                    className="flex items-center gap-3 py-3 border-b border-(--border) last:border-0 no-underline"
                  >
                    <Avatar name={p.name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] flex-wrap">
                        <span className="font-(--mono) font-semibold" style={{ color: 'var(--approved)' }}>
                          {p.stats.approved} approved
                        </span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span className="font-(--mono) font-semibold" style={{ color: 'var(--accent-deep)' }}>
                          {p.stats.pending} pending
                        </span>
                        {rej > 0 && (
                          <>
                            <span style={{ color: 'var(--ink-4)' }}>·</span>
                            <span className="font-(--mono) font-semibold" style={{ color: 'var(--rejected)' }}>
                              {rej} rejected
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky bottom CTA — fixed above the bottom nav (bottom nav ≈ 84px) */}
      <div className="lg:hidden fixed bottom-[70px] left-0 right-0 z-30 px-4 py-3 border-t border-(--border) bg-(--paper)">
        <button
          onClick={() => setGenOpen(true)}
          className="w-full h-12 rounded-(--r-md) text-white text-[15px] font-semibold cursor-pointer transition-opacity hover:opacity-88 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}
        >
          <Spark size={16} weight={2} />
          Generate end-of-job files
        </button>
      </div>

      {/* ══ Desktop 2-col content ═════════════════════════════════════ */}
      <div className="hidden lg:block px-8 pt-7 pb-10">
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px' }}>

          {/* Left: painters table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-bold text-(--ink-2)">
                Painters
                <span className="font-medium text-(--ink-4) ml-1.5">· {job.painters.length}</span>
              </div>
              <button
                onClick={() => setAddPainterOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer"
              >
                <Plus size={13} weight={2.2} />
                Add painter
              </button>
            </div>

            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
              {/* Table header */}
              <div
                className={`grid ${PAINTER_COLS} px-4 py-2.5 border-b border-(--border)`}
                style={{ background: 'oklch(0.972 0.005 75)' }}
              >
                {['PAINTER', 'SUBMITTED', 'APPROVED', 'PENDING', 'REJECTED', ''].map((h, i) => (
                  <div
                    key={i}
                    className={`text-[11px] font-semibold tracking-[.05em] uppercase text-(--ink-4) ${i >= 1 && i <= 4 ? 'text-center' : ''}`}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {job.painters.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-(--ink-3)">
                  No painters assigned yet.
                </div>
              ) : (
                job.painters.map((p) => {
                  const rej = p.stats.submitted - p.stats.approved - p.stats.pending;
                  return (
                    <Link
                      key={p._id}
                      href={`/owner/jobs/${jobId}/painters/${p._id}`}
                      className={`grid ${PAINTER_COLS} items-center px-4 py-3.5 border-b border-(--border) last:border-0 hover:bg-(--paper) transition-colors no-underline group`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={p.name} size={34} />
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</div>
                          {p.phone && (
                            <div className="text-[11px] text-(--ink-3) font-(--mono) mt-0.5">{p.phone}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-center text-[14px] font-semibold text-(--ink) font-(--mono) tabular-nums">
                        {p.stats.submitted}
                      </div>
                      <div className="text-center text-[14px] font-semibold font-(--mono) tabular-nums" style={{ color: 'var(--approved)' }}>
                        {p.stats.approved}
                      </div>
                      <div className="text-center text-[14px] font-semibold font-(--mono) tabular-nums" style={{ color: p.stats.pending > 0 ? 'var(--accent-deep)' : 'var(--ink-4)' }}>
                        {p.stats.pending}
                      </div>
                      <div className="text-center text-[14px] font-semibold font-(--mono) tabular-nums" style={{ color: rej > 0 ? 'var(--rejected)' : 'var(--ink-4)' }}>
                        {rej}
                      </div>
                      <div className="flex justify-end">
                        <ArrowRight size={15} style={{ color: 'var(--ink-4)' }} className="group-hover:text-(--ink-3)" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: stats sidebar */}
          <div>
            <div className="text-[13px] font-bold text-(--ink-2) mb-3">Job stats</div>
            <div className="flex flex-col gap-2.5">
              <StatCard label="Submitted" value={job.stats.submitted} color="var(--ink)" />
              <StatCard label="Approved" value={job.stats.approved} color="var(--approved)" />
              <StatCard label="Pending" value={job.stats.pending} color="var(--accent-deep)" />
              {jobRejected > 0 && (
                <StatCard label="Rejected" value={jobRejected} color="var(--rejected)" />
              )}

              {/* Dates */}
              <div className="bg-(--paper-2) border border-(--border) rounded-(--r-md) px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-(--ink-3)">Started</span>
                  <span className="font-(--mono) font-semibold text-(--ink-2)">{fmt(startDate)}</span>
                </div>
                {job.status === 'invoiced' && job.endDate && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-(--ink-3)">Ended</span>
                    <span className="font-(--mono) font-semibold text-(--ink-2)">{fmt(job.endDate)}</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ══ Add painter modal ═════════════════════════════════════════ */}
      {addPainterOpen && (
        <AddPainterModal
          jobId={jobId}
          existingIds={existingPainterIds}
          onClose={() => setAddPainterOpen(false)}
        />
      )}

      {/* ══ Edit job modal ════════════════════════════════════════════ */}
      {editOpen && (
        <Modal onClose={() => setEditOpen(false)}>
          <ModalHeader title="Edit job" onClose={() => setEditOpen(false)} />
          <form id="edit-form" onSubmit={handleSubmit(handleEditSave)} className="px-5 py-4 flex flex-col gap-4">
            <div>
              <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Company name</div>
              <input
                {...register('companyName', { required: true })}
                className="w-full h-[44px] px-3.5 rounded-full border border-(--border-2) bg-(--surface) text-[14px] text-(--ink) outline-none focus:border-(--border-3) transition-[border-color]"
              />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Description</div>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3.5 py-3 rounded-(--r) border border-(--border-2) bg-(--surface) text-[14px] text-(--ink) outline-none focus:border-(--border-3) transition-[border-color] resize-none leading-[1.5]"
              />
            </div>
          </form>
          <ModalFooter>
            <button onClick={() => setEditOpen(false)} className="h-9 px-4 rounded-full text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              form="edit-form"
              disabled={editSubmitting || saving}
              className="h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-88 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              style={{ background: 'var(--ink)' }}
            >
              <Check size={13} weight={2.2} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* ══ Delete confirm modal ══════════════════════════════════════ */}
      {deleteOpen && (
        <Modal onClose={() => setDeleteOpen(false)}>
          <div className="px-5 pt-6 pb-5 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--rejected-soft)' }}>
              <Trash size={22} style={{ color: 'var(--rejected)' }} />
            </div>
            <div className="text-[17px] font-bold text-(--ink) mb-2">Delete this job?</div>
            <div className="text-[13px] text-(--ink-3) leading-[1.5] max-w-xs mx-auto">
              All submissions, photos, and generated files will be permanently removed. This cannot be undone.
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="flex-1 h-10 rounded-full text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 h-10 rounded-full text-[13px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-88 disabled:opacity-50"
                style={{ background: 'var(--rejected)' }}
              >
                {deleting ? 'Deleting…' : 'Delete job'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ Generate files modal ══════════════════════════════════════ */}
      {genOpen && (
        <Modal onClose={() => { setGenOpen(false); setGenTypes([]); setGenError(''); }}>
          <ModalHeader title="Generate files" onClose={() => { setGenOpen(false); setGenTypes([]); setGenError(''); }} />
          <div className="px-5 py-4 flex flex-col gap-2">
            {(['excel', 'pdf_photos', 'pdf_file'] as const).map((t) => {
              const labels: Record<string, string> = { excel: 'Excel Spreadsheet', pdf_photos: 'Photos PDF', pdf_file: 'File PDF' };
              const on = genTypes.includes(t);
              return (
                <div
                  key={t}
                  onClick={() => toggleGenType(t)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-full border cursor-pointer transition-[border-color,background] select-none"
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border-2)', background: on ? 'var(--accent-soft)' : 'var(--surface)' }}
                >
                  <div
                    className="w-[18px] h-[18px] rounded-[4px] shrink-0 flex items-center justify-center"
                    style={{ background: on ? 'var(--accent)' : 'transparent', border: on ? 'none' : '1.5px solid var(--border-3)' }}
                  >
                    {on && <Check size={11} weight={2.8} style={{ color: '#fff' }} />}
                  </div>
                  <span className="text-[14px] font-medium text-(--ink)">{labels[t]}</span>
                </div>
              );
            })}
            {genError && (
              <div className="mt-1 px-3 py-2.5 rounded-full text-[12px] font-medium" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
                {genError}
              </div>
            )}
          </div>
          <ModalFooter>
            <button
              onClick={() => { setGenOpen(false); setGenTypes([]); setGenError(''); }}
              className="h-9 px-4 rounded-full text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) hover:border-(--border-3) transition-[border-color] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={genTypes.length === 0 || isGenerating}
              className="h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-88 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              style={{ background: 'var(--accent)' }}
            >
              <Spark size={13} weight={2} />
              {isGenerating ? 'Generating…' : 'Start generation'}
            </button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

// ── shared sub-components ─────────────────────────────────────────────────────

function MobileStat({ label, value, color, accent }: { label: string; value: number; color: string; accent: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 py-3 rounded-(--r-md) bg-(--surface) border border-(--border)"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="font-(--mono) text-[26px] font-bold leading-none tabular-nums" style={{ color, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.06em]">{label}</div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) px-4 py-3.5">
      <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em]">{label}</div>
      <div className="font-(--mono) text-[34px] font-bold mt-1.5 leading-none tabular-nums" style={{ color, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function DropdownMenu({ onEdit, onDelete, onClose }: { onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  return (
    <>
      {/* Backdrop — closes menu on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute top-full right-0 mt-1.5 w-44 bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden z-50"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-2.5 px-3.5 py-3 text-[14px] font-medium text-(--ink) hover:bg-(--paper) transition-colors cursor-pointer border-b border-(--border)"
        >
          <Brush size={15} style={{ color: 'var(--ink-2)' }} />
          Edit job
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2.5 px-3.5 py-3 text-[14px] font-medium cursor-pointer hover:bg-(--rejected-soft) transition-colors"
          style={{ color: 'var(--rejected)' }}
        >
          <X size={15} />
          Delete job
        </button>
      </div>
    </>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-(--paper) rounded-(--r-lg) overflow-hidden shadow-(--shadow)">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
      <div className="text-[16px] font-bold text-(--ink) tracking-[-0.01em]">{title}</div>
      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) transition-colors cursor-pointer">
        <X size={17} />
      </button>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-(--border)">
      {children}
    </div>
  );
}
