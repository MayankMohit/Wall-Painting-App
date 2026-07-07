'use client';

import { useState, use, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useGetSubmissionQuery,
  useGetSubmissionsQuery,
  useDeletePhotoMutation,
  useApproveSubmissionMutation,
  useRejectSubmissionMutation,
  useRevokeSubmissionMutation,
  useUpdateSubmissionMutation,
  useUpdateOwnerSizesMutation,
  useDeleteSubmissionMutation,
  type ExPhoto,
} from '@/store/api/endpoints/submissions';
import { useGetJobQuery } from '@/store/api/endpoints/jobs';
import { SizesField } from '@/components/jobs/submission/SizesField';
import { EditPhotoPicker } from '@/components/jobs/submission/EditPhotoPicker';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import type { EditFV } from '@/components/jobs/submission/submissionTypes';

// ── Icons ─────────────────────────────────────────────────────────────────────

function ArrowLeft({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>;
}
function ArrowRight({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function TrashIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" /><path d="M10 11v5M14 11v5" /></svg>;
}
function CheckIcon({ size = 18, weight = 2.4 }: { size?: number; weight?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11" /></svg>;
}
function XIcon({ size = 18, weight = 2.4 }: { size?: number; weight?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function PencilIcon({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>;
}
function ExpandIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>;
}
function DownloadIcon({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSubmittedAt(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const STATUS_COLOR = {
  pending:  'var(--accent)',
  approved: 'var(--approved)',
  rejected: 'var(--rejected)',
};
const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

function StatusPill({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[.04em]"
      style={{ background: `color-mix(in oklch, ${STATUS_COLOR[status]} 18%, transparent)`, color: STATUS_COLOR[status] }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OwnerSubmissionReviewPage({
  params,
}: {
  params: Promise<{ jobId: string; subId: string }>;
}) {
  const { jobId, subId } = use(params);
  const router = useRouter();

  const [activeIdx, setActiveIdx]           = useState(0);
  const [fsOpen, setFsOpen]                 = useState(false);
  const [fsIdx, setFsIdx]                   = useState(0);
  const [approveOpen, setApproveOpen]       = useState(false);
  const [rejectOpen, setRejectOpen]         = useState(false);
  const [rejectNotes, setRejectNotes]       = useState('');
  const [rejectError, setRejectError]       = useState('');
  const [deletePhotoId, setDeletePhotoId]   = useState<string | null>(null);
  const [deleteSubOpen, setDeleteSubOpen]   = useState(false);

  // Owner's size set (approved submissions only) — null draft = view mode
  const [ownerDraft, setOwnerDraft]         = useState<{ w: string; h: string }[] | null>(null);
  const [ownerSizesErr, setOwnerSizesErr]   = useState('');

  // ── Edit panel state ───────────────────────────────────────────────────────
  const [editOpen, setEditOpen]             = useState(false);
  const [editExPhotos, setEditExPhotos]     = useState<ExPhoto[]>([]);
  const [editNewFiles, setEditNewFiles]     = useState<File[]>([]);
  const [editNewPrevs, setEditNewPrevs]     = useState<string[]>([]);
  const { uploadFiles, step: editStep, setStep: setEditStep } = usePhotoUpload();
  const [editBusy, setEditBusy]             = useState(false);
  const editUrlsRef                         = useRef<string[]>([]);

  useEffect(() => () => { editUrlsRef.current.forEach(URL.revokeObjectURL); }, []);

  const { register: regEdit, handleSubmit: handleEditSubmit, control: editControl, watch: editWatch, reset: editReset, formState: { errors: editErrors } } = useForm<EditFV>({
    defaultValues: { location: '', photoNo: '', sizes: [{ width: '', height: '' }] },
  });
  const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({ control: editControl, name: 'sizes' });
  const editLoc  = editWatch('location');
  const editWs   = editWatch('sizes');
  const editArea = editWs.reduce((s, sz) => s + (Number(sz.width) || 0) * (Number(sz.height) || 0), 0).toFixed(1);

  // ── RTK hooks ─────────────────────────────────────────────────────────────
  const { data: sub, isLoading } = useGetSubmissionQuery({ jobId, subId });
  const { data: job }            = useGetJobQuery(jobId);
  const { data: allSubs = [] }   = useGetSubmissionsQuery(jobId);

  const [deletePhoto,       { isLoading: deletingPhoto }]      = useDeletePhotoMutation();
  const [approveSubmission, { isLoading: approving }]          = useApproveSubmissionMutation();
  const [rejectSubmission,  { isLoading: rejecting }]          = useRejectSubmissionMutation();
  const [revokeSubmission,  { isLoading: revoking }]           = useRevokeSubmissionMutation();
  const [updateSubmission]                                     = useUpdateSubmissionMutation();
  const [updateOwnerSizes,  { isLoading: savingOwnerSizes }]   = useUpdateOwnerSizesMutation();
  const [deleteSubmission,  { isLoading: deletingSubmission }] = useDeleteSubmissionMutation();

  // Prev / next within this job's submissions
  const subIds      = useMemo(() => allSubs.map((s) => s._id), [allSubs]);
  const currentPos  = subIds.indexOf(subId);
  const prevId      = currentPos > 0 ? subIds[currentPos - 1] : null;
  const nextId      = currentPos >= 0 && currentPos < subIds.length - 1 ? subIds[currentPos + 1] : null;

  const photos    = sub?.images ?? [];
  const safeIdx   = Math.min(activeIdx, Math.max(0, photos.length - 1));
  const activePhoto = photos[safeIdx];

  // ── Edit handlers ─────────────────────────────────────────────────────────

  const openEdit = () => {
    if (!sub) return;
    setEditExPhotos(sub.images ?? []);
    setEditNewFiles([]);
    setEditNewPrevs([]);
    editUrlsRef.current = [];
    editReset({
      location: sub.location,
      photoNo: sub.photoNo != null ? String(sub.photoNo) : '',
      sizes: sub.sizes?.map((s) => ({ width: String(s[0]), height: String(s[1]) })) ?? [{ width: '', height: '' }],
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    editUrlsRef.current.forEach(URL.revokeObjectURL);
    editUrlsRef.current = [];
    setEditNewFiles([]);
    setEditNewPrevs([]);
    setEditBusy(false);
    setEditStep('');
    setEditOpen(false);
  };

  const editPickNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    editUrlsRef.current.forEach(URL.revokeObjectURL);
    const arr  = Array.from(e.target.files);
    const urls = arr.map((f) => URL.createObjectURL(f));
    editUrlsRef.current = urls;
    setEditNewFiles(arr);
    setEditNewPrevs(urls);
  };

  const editDropNew = (i: number) => {
    URL.revokeObjectURL(editNewPrevs[i]);
    setEditNewFiles((p) => p.filter((_, j) => j !== i));
    setEditNewPrevs((p) => {
      const n = p.filter((_, j) => j !== i);
      editUrlsRef.current = n;
      return n;
    });
  };

  const editDeleteExisting = async (photoId: string) => {
    try {
      await deletePhoto({ jobId, subId, photoId }).unwrap();
      setEditExPhotos((p) => p.filter((ph) => ph._id !== photoId));
    } catch {
      alert('Failed to delete photo');
    }
  };

  const onEditSubmit = async (d: EditFV) => {
    setEditBusy(true);
    try {
      const uploadedImages = editNewFiles.length ? await uploadFiles(editNewFiles, jobId) : [];
      setEditStep('Saving…');
      await updateSubmission({
        jobId,
        subId,
        body: {
          photoNo:        Number(d.photoNo),
          location:       d.location,
          sizes:          d.sizes.map((s) => [Number(s.width), Number(s.height)]),
          uploadedImages,
        },
      }).unwrap();

      closeEdit();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
      setEditBusy(false);
      setEditStep('');
    }
  };

  // ── Other handlers ────────────────────────────────────────────────────────

  const handleDeletePhoto = async () => {
    if (!deletePhotoId) return;
    try {
      await deletePhoto({ jobId, subId, photoId: deletePhotoId }).unwrap();
      if (safeIdx >= photos.length - 1) setActiveIdx(Math.max(0, photos.length - 2));
    } finally {
      setDeletePhotoId(null);
    }
  };

  const handleDeleteSubmission = async () => {
    try {
      await deleteSubmission({ jobId, subId }).unwrap();
      router.push(`/owner/jobs/${jobId}`);
    } catch {
      setDeleteSubOpen(false);
    }
  };

  const handleApprove = async () => {
    const selectedImageIds = photos.map((p) => p._id);
    try {
      await approveSubmission({ jobId, subId, selectedImageIds }).unwrap();
      setApproveOpen(false);
    } catch { /* handled by error state */ }
  };

  const handleReject = async () => {
    setRejectError('');
    try {
      await rejectSubmission({ jobId, subId, rejectionReason: rejectNotes }).unwrap();
      setRejectOpen(false);
      setRejectNotes('');
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: { message?: string } } })?.data?.error?.message;
      setRejectError(msg ?? 'Something went wrong. Please try again.');
    }
  };

  const handleMoveToApproved = async () => {
    const selectedImageIds = photos.map((p) => p._id);
    await approveSubmission({ jobId, subId, selectedImageIds }).unwrap();
  };

  const handleRevoke = async () => {
    await revokeSubmission({ jobId, subId }).unwrap();
    setOwnerDraft(null);
    setOwnerSizesErr('');
  };

  // ── Owner sizes handlers ───────────────────────────────────────────────────

  const startOwnerSizesEdit = () => {
    if (!sub) return;
    const base = sub.ownerSizes?.length ? sub.ownerSizes : sub.sizes;
    setOwnerSizesErr('');
    setOwnerDraft(base.map(([w, h]) => ({ w: String(w), h: String(h) })));
  };

  const cancelOwnerSizesEdit = () => {
    setOwnerDraft(null);
    setOwnerSizesErr('');
  };

  const setOwnerDraftCell = (i: number, key: 'w' | 'h', val: string) => {
    setOwnerDraft((d) => d && d.map((row, j) => (j === i ? { ...row, [key]: val } : row)));
  };

  const saveOwnerSizes = async () => {
    if (!ownerDraft) return;
    const parsed: [number, number][] = [];
    for (const { w, h } of ownerDraft) {
      const wn = Number(w), hn = Number(h);
      if (!Number.isFinite(wn) || !Number.isFinite(hn) || wn <= 0 || hn <= 0) {
        setOwnerSizesErr('Every size needs a positive length and height.');
        return;
      }
      parsed.push([wn, hn]);
    }
    try {
      await updateOwnerSizes({ jobId, subId, ownerSizes: parsed }).unwrap();
      setOwnerDraft(null);
      setOwnerSizesErr('');
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: { message?: string } } })?.data?.error?.message;
      setOwnerSizesErr(msg ?? 'Could not save sizes. Please try again.');
    }
  };

  const navigate = (id: string) => router.push(`/owner/jobs/${jobId}/submissions/${id}`);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <p className="text-white/50 text-[14px]">Submission not found.</p>
      </div>
    );
  }

  const s = sub;

  const totalArea = s.sizes.reduce((acc, sz) => acc + sz[0] * sz[1], 0).toFixed(1);

  // Owner's effective size set (approved only): his edits, else the painter's copy.
  const ownerEff      = s.ownerSizes?.length ? s.ownerSizes : s.sizes;
  const ownerTotal    = ownerEff.reduce((acc, sz) => acc + sz[0] * sz[1], 0).toFixed(1);
  const ownerChanged  = ownerEff.some((sz, i) => sz[0] !== s.sizes[i]?.[0] || sz[1] !== s.sizes[i]?.[1]);
  const draftTotal    = ownerDraft
    ? ownerDraft.reduce((acc, r) => acc + (Number(r.w) || 0) * (Number(r.h) || 0), 0).toFixed(1)
    : ownerTotal;
  const statusTimestamp = s.status === 'approved'
    ? `Approved · ${formatSubmittedAt(s.submittedAt)}`
    : s.status === 'rejected'
    ? `Rejected · ${formatSubmittedAt(s.submittedAt)}`
    : `Submitted ${formatSubmittedAt(s.submittedAt)}`;

  const navBtn = 'w-8 h-8 rounded-full flex items-center justify-center border border-white/20 transition-[background,opacity] hover:bg-white/10 disabled:opacity-30 disabled:cursor-default cursor-pointer';

  // ── Helpers ───────────────────────────────────────────────────────────────

  const downloadPhoto = async (url: string, index: number) => {
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      const obj  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = obj;
      a.download = `submission-${s.photoNo}-photo-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(obj);
    } catch {
      window.open(url, '_blank');
    }
  };

  // ── Shared sub-components ──────────────────────────────────────────────────

  function PhotoViewer() {
    const openFs = () => { setFsIdx(safeIdx); setFsOpen(true); };
    return (
      <>
        <div className="flex flex-col gap-2.5">
          <div className="relative rounded-(--r-md) overflow-hidden bg-black/50" style={{ aspectRatio: '4/3' }}>
            {activePhoto ? (
              <img
                src={activePhoto.previewCloudinaryUrl || activePhoto.cloudinaryUrl}
                alt={`Photo ${safeIdx + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-[13px]">No photos</div>
            )}
            {/* Expand button — top left */}
            {activePhoto && (
              <button
                onClick={openFs}
                className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-0"
                style={{ background: 'rgba(15,15,15,.55)', backdropFilter: 'blur(4px)', color: '#fff' }}
              >
                <ExpandIcon size={14} />
              </button>
            )}
            {/* Download button — top right */}
            {activePhoto && (
              <button
                onClick={() => downloadPhoto(activePhoto.cloudinaryUrl, safeIdx)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-0"
                style={{ background: 'rgba(15,15,15,.55)', backdropFilter: 'blur(4px)', color: '#fff' }}
              >
                <DownloadIcon size={15} />
              </button>
            )}
            {photos.length > 0 && (
              <div className="absolute bottom-3 left-3 h-7 px-3 rounded-full flex items-center font-semibold text-[11px] text-white/85"
                style={{ background: 'rgba(15,15,15,.72)', backdropFilter: 'blur(6px)' }}>
                <span className="font-mono">{String(safeIdx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
              </div>
            )}
            {activePhoto && photos.length > 1 && (
              <button
                onClick={() => setDeletePhotoId(activePhoto._id)}
                className="absolute bottom-3 right-3 w-11 h-11 rounded-full flex items-center justify-center border border-white/20 cursor-pointer"
                style={{ background: 'rgba(15,15,15,.72)', backdropFilter: 'blur(6px)', color: 'oklch(0.72 0.17 25)' }}
              >
                <TrashIcon size={18} />
              </button>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2">
              {photos.map((p, i) => (
                <button
                  key={p._id}
                  onClick={() => setActiveIdx(i)}
                  className="flex-1 relative rounded-(--r) overflow-hidden cursor-pointer"
                  style={{ aspectRatio: '1', maxWidth: 72 }}
                >
                  <img src={p.previewCloudinaryUrl || p.cloudinaryUrl} alt="" className="w-full h-full object-cover" />
                  {i === safeIdx && (
                    <div className="absolute inset-0 rounded-(--r)" style={{ border: '2px solid var(--accent)' }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Fullscreen overlay ────────────────────────────────── */}
        {fsOpen && (
          <div className="fixed inset-0 z-200 flex flex-col" style={{ background: '#000' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <span className="font-mono text-[13px] text-white/50 tabular-nums">
                {String(fsIdx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadPhoto(photos[fsIdx]?.cloudinaryUrl || photos[fsIdx]?.previewCloudinaryUrl, fsIdx)}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0"
                  style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
                >
                  <DownloadIcon size={16} />
                </button>
                <button
                  onClick={() => setFsOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0"
                  style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
                >
                  <XIcon size={18} weight={2} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center px-2">
              <img
                src={photos[fsIdx]?.cloudinaryUrl || photos[fsIdx]?.previewCloudinaryUrl}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {photos.length > 1 && (
              <div className="flex items-center justify-between px-6 py-5 shrink-0">
                <button
                  onClick={() => setFsIdx((i) => Math.max(0, i - 1))}
                  disabled={fsIdx === 0}
                  className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border-0 disabled:opacity-25"
                  style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFsIdx(i)}
                      className="rounded-full border-0 cursor-pointer p-0 transition-all"
                      style={{ width: i === fsIdx ? 20 : 6, height: 6, background: i === fsIdx ? '#fff' : 'rgba(255,255,255,.3)' }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setFsIdx((i) => Math.min(photos.length - 1, i + 1))}
                  disabled={fsIdx === photos.length - 1}
                  className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border-0 disabled:opacity-25"
                  style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  function Details() {
    return (
      <div className="space-y-3 text-white">
        {/* Ref + timestamp + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[11px] text-white/50">
            #{String(s.photoNo).padStart(4, '0')} · {statusTimestamp}
          </div>
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <div className="relative group">
              <button
                onClick={s.status !== 'approved' ? openEdit : undefined}
                disabled={s.status === 'approved'}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${s.status === 'approved' ? 'border-white/10 text-white/20 cursor-not-allowed' : 'border-white/25 text-white/70 cursor-pointer hover:bg-white/10'}`}
              >
                <PencilIcon size={13} />
              </button>
              {s.status === 'approved' && (
                <div className="absolute top-full right-0 mt-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{ background: 'rgba(30,30,30,0.92)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Revoke to make changes
                </div>
              )}
            </div>
            <button
              onClick={() => setDeleteSubOpen(true)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-semibold cursor-pointer"
              style={{ borderColor: 'oklch(0.55 0.2 25 / .5)', color: 'oklch(0.72 0.17 25)', background: 'oklch(0.45 0.18 25 / .15)' }}
            >
              <XIcon size={11} weight={2.4} />
              Delete
            </button>
          </div>
          {/* Mobile: delete only (pencil is in the status row above) */}
          <button
            onClick={() => setDeleteSubOpen(true)}
            className="flex lg:hidden items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-semibold shrink-0 cursor-pointer"
            style={{ borderColor: 'oklch(0.55 0.2 25 / .5)', color: 'oklch(0.72 0.17 25)', background: 'oklch(0.45 0.18 25 / .15)' }}
          >
            <XIcon size={11} weight={2.4} />
            Delete
          </button>
        </div>

        {/* Wall sizes — single set before approval, painter vs. owner comparison after */}
        {s.status !== 'approved' ? (
          <div className="rounded-(--r-md) p-4" style={{ background: 'rgba(255,255,255,.05)' }}>
            <div className="text-[10px] text-white/50 uppercase tracking-wider mb-2.5">Wall sizes</div>
            {s.sizes.map((sz, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-white/8 last:border-0"
              >
                <div className="font-mono text-[11px] text-white/40 w-5">{String(i + 1).padStart(2, '0')}</div>
                <div className="font-mono text-[14px] font-semibold flex-1">{sz[0].toFixed(1)} × {sz[1].toFixed(1)} ft</div>
                <div className="font-mono text-[12px] text-white/55">{(sz[0] * sz[1]).toFixed(1)} ft²</div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2.5 border-t border-white/8 mt-1">
              <span className="text-[12px] text-white/65 font-semibold">Total</span>
              <span className="font-mono text-[17px] font-bold">{totalArea} ft²</span>
            </div>
          </div>
        ) : (
          <div className="rounded-(--r-md) p-4" style={{ background: 'rgba(255,255,255,.05)' }}>
            {/* Card header: title + edited chip + adjust / save controls */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="text-[10px] text-white/50 uppercase tracking-wider">Wall sizes</div>
                {ownerChanged && ownerDraft === null && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[.05em]"
                    style={{ background: 'color-mix(in oklch, var(--accent) 22%, transparent)', color: 'var(--accent)' }}
                  >
                    Edited
                  </span>
                )}
              </div>
              {ownerDraft === null ? (
                <button
                  onClick={startOwnerSizesEdit}
                  className="flex items-center gap-1.5 h-6.5 px-2.5 rounded-full border border-white/25 text-white/70 text-[11px] font-semibold cursor-pointer bg-transparent hover:bg-white/10 transition-colors"
                >
                  <PencilIcon size={11} />
                  Adjust
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={cancelOwnerSizesEdit}
                    disabled={savingOwnerSizes}
                    className="h-6.5 px-2.5 rounded-full border border-white/20 text-white/60 text-[11px] font-semibold cursor-pointer bg-transparent disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveOwnerSizes}
                    disabled={savingOwnerSizes}
                    className="h-6.5 px-3 rounded-full border-0 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {savingOwnerSizes ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Column labels */}
            <div className="flex items-center gap-3 pb-1.5 border-b border-white/8">
              <div className="w-5" />
              <div className="flex-1 text-[9px] font-bold uppercase tracking-[.08em] text-white/35">Painter</div>
              <div className="flex-1 text-[9px] font-bold uppercase tracking-[.08em]" style={{ color: 'var(--accent)' }}>Yours</div>
              <div className="w-13 text-right text-[9px] font-bold uppercase tracking-[.08em] text-white/35">ft²</div>
            </div>

            {/* Rows */}
            {s.sizes.map((psz, i) => {
              const osz = ownerEff[i] ?? psz;
              const changed = osz[0] !== psz[0] || osz[1] !== psz[1];
              const rowArea = ownerDraft
                ? ((Number(ownerDraft[i]?.w) || 0) * (Number(ownerDraft[i]?.h) || 0)).toFixed(1)
                : (osz[0] * osz[1]).toFixed(1);
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/8 last:border-0">
                  <div className="font-mono text-[11px] text-white/40 w-5">{String(i + 1).padStart(2, '0')}</div>
                  <div className="flex-1 font-mono text-[13px] text-white/50">
                    {psz[0].toFixed(1)} × {psz[1].toFixed(1)}
                  </div>
                  {ownerDraft === null ? (
                    <div
                      className="flex-1 font-mono text-[13px] font-semibold"
                      style={{ color: changed ? 'var(--accent)' : '#fff' }}
                    >
                      {osz[0].toFixed(1)} × {osz[1].toFixed(1)}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-1 min-w-0">
                      <input
                        value={ownerDraft[i]?.w ?? ''}
                        onChange={(e) => setOwnerDraftCell(i, 'w', e.target.value)}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        disabled={savingOwnerSizes}
                        className="w-full min-w-0 h-8 px-1 rounded-md bg-white/10 border border-white/20 font-mono text-[13px] text-white text-center outline-none focus:border-(--accent)"
                      />
                      <span className="text-white/40 text-[11px] shrink-0">×</span>
                      <input
                        value={ownerDraft[i]?.h ?? ''}
                        onChange={(e) => setOwnerDraftCell(i, 'h', e.target.value)}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        disabled={savingOwnerSizes}
                        className="w-full min-w-0 h-8 px-1 rounded-md bg-white/10 border border-white/20 font-mono text-[13px] text-white text-center outline-none focus:border-(--accent)"
                      />
                    </div>
                  )}
                  <div className="w-13 text-right font-mono text-[12px] text-white/55">{rowArea}</div>
                </div>
              );
            })}

            {/* Totals */}
            <div className="pt-2.5 border-t border-white/8 mt-1 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/45">Painter total</span>
                <span className="font-mono text-[13px] text-white/55">{totalArea} ft²</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-white/65 font-semibold">Your total</span>
                <span
                  className="font-mono text-[17px] font-bold"
                  style={{ color: (ownerDraft ? draftTotal !== totalArea : ownerChanged) ? 'var(--accent)' : '#fff' }}
                >
                  {ownerDraft ? draftTotal : ownerTotal} ft²
                </span>
              </div>
            </div>

            {ownerSizesErr && (
              <div className="mt-2 text-[11px] font-medium" style={{ color: 'oklch(0.72 0.17 25)' }}>
                {ownerSizesErr}
              </div>
            )}

            <div className="mt-2.5 text-[10px] text-white/35 leading-[1.5]">
              &ldquo;Yours&rdquo; is private to you — it goes into the master Excel &amp; PDF. The painter&apos;s own file keeps their sizes.
            </div>
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-(--r) p-3" style={{ background: 'rgba(255,255,255,.05)' }}>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Photo number</div>
            <div className="font-mono text-[20px] font-bold mt-1">{String(s.photoNo).padStart(2, '0')}</div>
          </div>
          <div className="rounded-(--r) p-3" style={{ background: 'rgba(255,255,255,.05)' }}>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Photos</div>
            <div className="font-mono text-[20px] font-bold mt-1">{photos.length}</div>
          </div>
        </div>

        {/* Rejection reason */}
        {s.status === 'rejected' && s.rejectionReason && (
          <div className="rounded-(--r) p-3" style={{ background: 'oklch(0.55 0.2 25 / .14)', border: '1px solid oklch(0.55 0.2 25 / .35)' }}>
            <div className="text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'oklch(0.78 0.14 25)' }}>Rejection reason</div>
            <div className="text-[13px] text-white/85 leading-[1.45]">{s.rejectionReason}</div>
          </div>
        )}

        {s.notes && (
          <div>
            <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5">Notes</div>
            <div className="text-[13px] text-white/70 leading-normal">{s.notes}</div>
          </div>
        )}
      </div>
    );
  }

  function ActionBar({ mobile = false }: { mobile?: boolean }) {
    const base = `flex-1 h-12 rounded-full font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0 transition-opacity hover:opacity-88`;
    return (
      <div className={`flex gap-2.5 ${mobile ? 'p-4 pb-8' : 'pt-4'}`} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
        {s.status === 'pending' && (
          <>
            <button onClick={() => setRejectOpen(true)} disabled={rejecting || approving}
              className={base} style={{ background: 'oklch(0.45 0.18 25)', color: '#fff', flex: '0 0 auto', paddingLeft: 16, paddingRight: 20 }}>
              <XIcon size={16} weight={2.4} /> Reject
            </button>
            <button onClick={() => setApproveOpen(true)} disabled={approving || rejecting}
              className={base} style={{ background: 'var(--approved)', color: '#fff' }}>
              <CheckIcon size={16} weight={2.4} /> Approve
            </button>
          </>
        )}
        {s.status === 'approved' && (
          <button onClick={handleRevoke} disabled={revoking}
            className={base} style={{ background: 'oklch(0.45 0.18 25)', color: '#fff' }}>
            <XIcon size={16} weight={2.4} /> {revoking ? 'Revoking…' : 'Revoke approval'}
          </button>
        )}
        {s.status === 'rejected' && (
          <button onClick={handleMoveToApproved} disabled={approving}
            className={base} style={{ background: 'var(--approved)', color: '#fff' }}>
            <CheckIcon size={16} weight={2.4} /> {approving ? 'Moving…' : 'Move to approved'}
          </button>
        )}
      </div>
    );
  }

  // ── Edit panel ─────────────────────────────────────────────────────────────

  const inputBox   = 'flex items-center gap-2 h-12 px-3.5 rounded-(--r) border border-(--border-2) bg-(--paper) focus-within:border-(--border-3)';
  const innerInput = 'flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4) font-(--font) w-full';

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', color: '#fff' }}>

      {/* ══ Mobile ══════════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
          <Link href={`/owner/jobs/${jobId}`}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors no-underline">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold text-white truncate">{s.location}</div>
            <div className="text-[11px] text-white/50 font-mono">Submission #{String(s.photoNo).padStart(4, '0')}</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => prevId && navigate(prevId)} disabled={!prevId} className={navBtn}><ArrowLeft size={16} /></button>
            <button onClick={() => nextId && navigate(nextId)} disabled={!nextId} className={navBtn}><ArrowRight size={16} /></button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-36">
          <div className="p-4 space-y-4">
            {PhotoViewer()}
            {/* Status + edit button */}
            <div className="flex items-center justify-between">
              <StatusPill status={s.status} />
              <div className="relative group">
                <button
                  onClick={s.status !== 'approved' ? openEdit : undefined}
                  disabled={s.status === 'approved'}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-semibold transition-colors ${s.status === 'approved' ? 'border-white/10 text-white/20 cursor-not-allowed' : 'border-white/25 text-white/70 cursor-pointer hover:bg-white/10'}`}
                >
                  <PencilIcon size={12} />
                  Edit
                </button>
                {s.status === 'approved' && (
                  <div className="absolute top-full right-0 mt-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    style={{ background: 'rgba(30,30,30,0.92)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Revoke to make changes
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] -mt-1">{s.location}</h1>
            {Details()}
          </div>
        </div>

        {/* Fixed bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10" style={{ background: '#0f0f0f', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          {ActionBar({ mobile: true })}
        </div>
      </div>

      {/* ══ Desktop ═════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col h-screen">
        {/* Desktop header */}
        <div className="flex items-center gap-4 px-7 py-5 border-b border-white/8 shrink-0">
          <button onClick={() => router.push(`/owner/jobs/${jobId}`)}
            className={navBtn}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-white/50">
              {job?.companyName}
            </div>
            <div className="text-[19px] font-bold tracking-[-0.02em] mt-0.5">{s.location}</div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={s.status} />
            <div className="flex items-center gap-1.5">
              <button onClick={() => prevId && navigate(prevId)} disabled={!prevId} className={navBtn}><ArrowLeft size={16} /></button>
              <span className="font-mono text-[12px] text-white/60 tabular-nums min-w-12 text-center">
                {currentPos >= 0 ? `${currentPos + 1} / ${subIds.length}` : '—'}
              </span>
              <button onClick={() => nextId && navigate(nextId)} disabled={!nextId} className={navBtn}><ArrowRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* Desktop body — two columns */}
        <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 400px' }}>
          {/* Left: photo viewer */}
          <div className="p-6 flex flex-col gap-3 overflow-hidden">
            <div className="flex-1 min-h-0 relative rounded-(--r-md) overflow-hidden bg-black/40">
              {activePhoto ? (
                <img src={activePhoto.cloudinaryUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30 text-[13px]">No photos</div>
              )}
              {/* Download button — top right */}
              {activePhoto && (
                <button
                  onClick={() => downloadPhoto(activePhoto.cloudinaryUrl, safeIdx)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0"
                  style={{ background: 'rgba(15,15,15,.55)', backdropFilter: 'blur(4px)', color: '#fff' }}
                >
                  <DownloadIcon size={16} />
                </button>
              )}
              {photos.length > 0 && (
                <div className="absolute bottom-4 left-4 h-7 px-3 rounded-full flex items-center font-mono font-semibold text-[12px] text-white/85"
                  style={{ background: 'rgba(15,15,15,.72)', backdropFilter: 'blur(6px)' }}>
                  {String(safeIdx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </div>
              )}
              {activePhoto && photos.length > 1 && (
                <button
                  onClick={() => setDeletePhotoId(activePhoto._id)}
                  className="absolute bottom-4 right-4 h-10 px-4 rounded-full flex items-center gap-2 font-semibold text-[13px] border border-white/20 cursor-pointer"
                  style={{ background: 'rgba(15,15,15,.72)', backdropFilter: 'blur(6px)', color: '#fff' }}
                >
                  <TrashIcon size={15} />
                  <span style={{ color: 'oklch(0.72 0.17 25)' }}>Remove photo</span>
                </button>
              )}
            </div>
            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 shrink-0">
                {photos.map((p, i) => (
                  <button key={p._id} onClick={() => setActiveIdx(i)}
                    className="relative rounded-(--r) overflow-hidden cursor-pointer shrink-0"
                    style={{ width: 72, height: 72 }}>
                    <img src={p.previewCloudinaryUrl || p.cloudinaryUrl} alt="" className="w-full h-full object-cover" />
                    {i === safeIdx && <div className="absolute inset-0 rounded-(--r)" style={{ border: '2px solid var(--accent)' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: details + actions */}
          <div className="flex flex-col border-l border-white/8 overflow-hidden" style={{ borderLeft: '1px solid rgba(255,255,255,.08)' }}>
            <div className="flex-1 overflow-y-auto p-6">
              {Details()}
            </div>
            <div className="px-6 pb-6 shrink-0">
              {ActionBar({ mobile: false })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Edit panel ══════════════════════════════════════════════ */}
      {editOpen && (
        <div className="fixed inset-0 z-60 flex" style={{ background: 'rgba(0,0,0,.6)' }} onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div
            className="ml-auto w-full lg:max-w-140 flex flex-col overflow-hidden shadow-2xl"
            style={{ background: 'var(--paper)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-(--border) shrink-0">
              <button
                onClick={closeEdit}
                disabled={editBusy}
                className="w-9 h-9 border border-(--border-2) rounded-full flex items-center justify-center text-(--ink-2) cursor-pointer bg-transparent"
              >
                <XIcon size={16} weight={1.8} />
              </button>
              <div className="text-[17px] font-bold text-(--ink) tracking-[-0.015em] flex-1">Edit submission</div>
              <button
                form="edit-form"
                type="submit"
                disabled={editBusy}
                className="h-9 px-5 rounded-full bg-(--ink) text-white text-[13px] font-semibold border-0 cursor-pointer disabled:opacity-50"
              >
                {editBusy ? (editStep || 'Saving…') : 'Save'}
              </button>
            </div>

            {/* Form */}
            <form
              id="edit-form"
              onSubmit={handleEditSubmit(onEditSubmit)}
              className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5"
            >
              {/* Photo Number */}
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Photo number</div>
                <div className={[inputBox, editErrors.photoNo ? 'border-(--rejected)' : ''].join(' ')}>
                  <input
                    type="number"
                    {...regEdit('photoNo', { required: true, min: 1 })}
                    placeholder="e.g. 12"
                    disabled={editBusy}
                    className={innerInput}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className={['text-[11px]', editErrors.photoNo ? 'text-(--rejected)' : 'text-(--ink-3)'].join(' ')}>
                    {editErrors.photoNo ? 'Valid photo number is required.' : 'The sequence number assigned to this wall.'}
                  </span>
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Wall location</div>
                <div className={[inputBox, editErrors.location ? 'border-(--rejected)' : ''].join(' ')}>
                  <input
                    {...regEdit('location', { required: true, maxLength: 100 })}
                    placeholder="Hallway 8A — north wall"
                    disabled={editBusy}
                    className={innerInput}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className={['text-[11px]', editErrors.location ? 'text-(--rejected)' : 'text-(--ink-3)'].join(' ')}>
                    {editErrors.location?.type === 'maxLength' ? '100 character limit reached.' : editErrors.location ? 'Location is required.' : 'Where is this wall on the job site? Be specific.'}
                  </span>
                  <span className={['text-[11px] font-(--mono) tabular-nums shrink-0 ml-2', (editLoc?.length ?? 0) > 100 ? 'text-(--rejected)' : (editLoc?.length ?? 0) > 80 ? 'text-amber-500' : 'text-(--ink-4)'].join(' ')}>
                    {editLoc?.length ?? 0} / 100
                  </span>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
                  Wall sizes <span className="text-(--ink-4) font-medium">· at least one · in feet</span>
                </div>
                <SizesField
                  fields={editFields}
                  register={regEdit}
                  remove={editRemove}
                  append={editAppend}
                  busy={editBusy}
                  area={editArea}
                />
              </div>

              {/* Photos */}
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
                  Photos <span className="text-(--ink-4) font-medium">· {editExPhotos.length + editNewFiles.length} of 20</span>
                </div>
                <EditPhotoPicker
                  exPhotos={editExPhotos}
                  newFiles={editNewFiles}
                  newPrevs={editNewPrevs}
                  busy={editBusy}
                  onPickNew={editPickNew}
                  onDropNew={editDropNew}
                  onDeleteExisting={editDeleteExisting}
                />
                <div className="text-[11px] mt-1.5 text-(--ink-3)">
                  Tap × to remove a photo · Add more from your gallery.
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Approve dialog ══════════════════════════════════════════ */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="w-full max-w-sm rounded-(--r-lg) overflow-hidden shadow-2xl" style={{ background: 'var(--surface)' }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--approved-soft)', color: 'var(--approved)' }}>
                <CheckIcon size={28} weight={2.6} />
              </div>
              <div className="text-[18px] font-bold text-(--ink) tracking-[-0.015em]">Approve submission?</div>
              <div className="text-[13px] text-(--ink-3) mt-2 leading-[1.45]">
                <span className="font-mono">#{String(s.photoNo).padStart(4, '0')}</span> · {s.location} will be marked approved and included in the next file generation.
              </div>
            </div>
            <div className="flex border-t border-(--border)">
              <button onClick={() => setApproveOpen(false)} className="flex-1 py-4 text-[15px] font-semibold text-(--ink-2) bg-transparent border-0 border-r border-(--border) cursor-pointer">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={approving} className="flex-1 py-4 text-[15px] font-bold border-0 bg-transparent cursor-pointer disabled:opacity-50" style={{ color: 'var(--approved)' }}>
                {approving ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Reject dialog ═══════════════════════════════════════════ */}
      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setRejectOpen(false); setRejectNotes(''); setRejectError(''); } }}
        >
          <div className="w-full max-w-sm rounded-(--r-lg) overflow-hidden shadow-2xl" style={{ background: 'var(--surface)' }}>
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
                  <XIcon size={20} weight={2.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-bold text-(--ink) tracking-[-0.015em]">Reject submission?</div>
                  <div className="text-[12px] text-(--ink-3) mt-0.5">
                    <span className="font-mono">#{String(s.photoNo).padStart(4, '0')}</span> · {s.location}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setRejectOpen(false); setRejectNotes(''); setRejectError(''); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) cursor-pointer shrink-0"
                >
                  <XIcon size={14} weight={2} />
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-(--ink-3) uppercase tracking-wider mb-1.5">
                  Rejection notes <span className="normal-case text-(--ink-4)">(optional)</span>
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                  placeholder="Explain what needs to be fixed…"
                  className="w-full bg-(--paper-2) border border-(--border-2) rounded-(--r) px-3 py-2.5 text-[13px] text-(--ink) resize-none focus:outline-none focus:border-(--border-3) placeholder:text-(--ink-4)"
                />
              </div>
              {rejectError && (
                <div className="mt-2 text-[12px] font-medium" style={{ color: 'var(--rejected)' }}>
                  {rejectError}
                </div>
              )}
            </div>
            <div className="flex border-t border-(--border)">
              <button
                type="button"
                onClick={() => { setRejectOpen(false); setRejectNotes(''); setRejectError(''); }}
                className="flex-1 py-4 text-[15px] font-semibold text-(--ink-2) bg-transparent border-0 border-r border-(--border) cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 py-4 text-[15px] font-bold border-0 bg-transparent cursor-pointer disabled:opacity-50"
                style={{ color: 'var(--rejected)' }}
              >
                {rejecting ? 'Rejecting…' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete photo dialog ══════════════════════════════════════ */}
      {deletePhotoId && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="w-full max-w-sm rounded-(--r-lg) overflow-hidden shadow-2xl" style={{ background: 'var(--surface)' }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
                <TrashIcon size={26} />
              </div>
              <div className="text-[18px] font-bold text-(--ink) tracking-[-0.015em]">Remove this photo?</div>
              <div className="text-[13px] text-(--ink-3) mt-2 leading-[1.45]">
                Photo <span className="font-mono">{String(safeIdx + 1).padStart(2, '0')} of {String(photos.length).padStart(2, '0')}</span> will be permanently removed from this submission.
              </div>
            </div>
            <div className="flex border-t border-(--border)">
              <button onClick={() => setDeletePhotoId(null)} className="flex-1 py-4 text-[15px] font-semibold text-(--ink-2) bg-transparent border-0 border-r border-(--border) cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDeletePhoto} disabled={deletingPhoto} className="flex-1 py-4 text-[15px] font-bold border-0 bg-transparent cursor-pointer disabled:opacity-50" style={{ color: 'var(--rejected)' }}>
                {deletingPhoto ? 'Removing…' : 'Remove photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete submission dialog ═════════════════════════════════ */}
      {deleteSubOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="w-full max-w-sm rounded-(--r-lg) overflow-hidden shadow-2xl" style={{ background: 'var(--surface)' }}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
                <TrashIcon size={26} />
              </div>
              <div className="text-[18px] font-bold text-(--ink) tracking-[-0.015em]">Delete submission?</div>
              <div className="text-[13px] text-(--ink-3) mt-2 leading-[1.45]">
                <span className="font-mono">#{String(s.photoNo).padStart(4, '0')}</span> · {s.location} and all its photos will be permanently deleted. This cannot be undone.
              </div>
            </div>
            <div className="flex border-t border-(--border)">
              <button onClick={() => setDeleteSubOpen(false)} className="flex-1 py-4 text-[15px] font-semibold text-(--ink-2) bg-transparent border-0 border-r border-(--border) cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmission}
                disabled={deletingSubmission}
                className="flex-1 py-4 text-[15px] font-bold border-0 bg-transparent cursor-pointer disabled:opacity-50"
                style={{ color: 'var(--rejected)' }}
              >
                {deletingSubmission ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
