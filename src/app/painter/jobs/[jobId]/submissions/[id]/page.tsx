'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGetSubmissionQuery } from '@/store/api/endpoints/submissions';
import { ArrowL, Brush } from '@/components/jobs/shared/icons';
import { StatusPill } from '@/components/jobs/shared/StatusPill';
import { SectionHdr } from '@/components/jobs/view/SectionHdr';
import { PhotoViewer } from '@/components/jobs/view/PhotoViewer';
import { SizesTable } from '@/components/jobs/view/SizesTable';
import { formatSubmissionDate } from '@/components/jobs/shared/submissionHelpers';

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ jobId: string; id: string }>;
}) {
  const { jobId, id: submissionId } = use(params);
  const router = useRouter();
  const [activePhoto, setActivePhoto] = useState(0);

  const { data: sub, isLoading, isError, error } = useGetSubmissionQuery(
    { jobId, subId: submissionId },
    { pollingInterval: 30_000 },
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="landing-spinner" />
      </div>
    );
  }

  if (isError || !sub) {
    const msg =
      (error as { data?: { error?: { message?: string } } })?.data?.error?.message ??
      'Submission not found';
    return (
      <div className="m-6 p-4 rounded-(--r) bg-(--rejected-soft) text-(--rejected) text-[13px] font-medium border border-[oklch(0.55_0.17_25_/_0.2)]">
        {msg}
      </div>
    );
  }

  const canEdit  = sub.status === 'pending' || sub.status === 'rejected';
  const editHref = `/painter/jobs/${jobId}/submissions/${submissionId}/edit`;
  const viewArea = sub.sizes.reduce((s, sz) => s + sz[0] * sz[1], 0).toFixed(1);
  const photos   = sub.images ?? [];
  const safeIdx  = Math.min(activePhoto, Math.max(0, photos.length - 1));
  const curPhoto = photos[safeIdx];
  const { date: dateStr, time: timeStr } = formatSubmissionDate(sub.submittedAt || sub.createdAt || '');

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────────── */}
      <div className={['lg:hidden bg-(--paper)', canEdit ? 'pb-[164px]' : 'pb-4'].join(' ')}>

        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border) flex items-center px-4 py-2.5">
          <Link
            href={`/painter/jobs/${jobId}`}
            className="w-9 h-9 rounded-full flex items-center justify-center text-(--ink) no-underline"
          >
            <ArrowL size={22} weight={1.8} />
          </Link>
        </div>

        <div className="px-4">
          <PhotoViewer
            photos={photos}
            activeIndex={activePhoto}
            onSelect={setActivePhoto}
            mainClass="h-60"
            thumbSize="w-14 h-14"
            thumbGap="gap-1.5"
          />
          <div className="mt-4 flex items-center gap-2.5">
            <StatusPill status={sub.status} useLabel size="md" />
          </div>
          <div className="text-[22px] font-semibold mt-1.5 tracking-[-0.02em] text-(--ink)">
            {sub.location}
          </div>
          <div className="text-[13px] text-(--ink-3) mt-1">
            Submitted {dateStr} · {timeStr}
          </div>
        </div>

        <SectionHdr title="Wall sizes" />
        <div className="px-4">
          <SizesTable sizes={sub.sizes} totalArea={viewArea} />
        </div>

        <div className="px-4 pt-[14px] grid grid-cols-2 gap-2">
          {[
            { label: 'Photo number', value: String(sub.photoNo).padStart(2, '0') },
            { label: 'Photos',       value: String(photos.length)                },
          ].map(({ label, value }) => (
            <div key={label} className="bg-(--surface) border border-(--border) rounded-(--r) p-3">
              <div className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-[.05em]">{label}</div>
              <div className="font-(--mono) text-[20px] font-semibold mt-1 text-(--ink)">{value}</div>
            </div>
          ))}
        </div>

        {sub.notes && (
          <>
            <SectionHdr title="Notes" />
            <div className="px-4 pb-2 text-[13px] text-(--ink-2) leading-[1.5]">{sub.notes}</div>
          </>
        )}
      </div>

      {canEdit && (
        <div className="lg:hidden fixed bottom-17.5 left-0 right-0 z-[51] px-4 py-3 bg-(--paper) border-t border-(--border)">
          <button
            onClick={() => router.push(editHref)}
            className="w-full h-[52px] rounded-full border-0 bg-(--ink) text-white text-[16px] cursor-pointer flex items-center justify-center gap-2 font-(--font)"
          >
            <Brush size={18} weight={2} />
            Edit submission
          </button>
        </div>
      )}

      {/* ── DESKTOP — light two-column ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col h-screen bg-(--paper)">

        {/* Header */}
        <div className="flex items-center gap-4 px-7 py-4 border-b border-(--border) shrink-0 bg-(--paper)">
          <Link
            href={`/painter/jobs/${jobId}`}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-(--border-2) text-(--ink-2) no-underline hover:bg-(--surface) transition-colors shrink-0"
          >
            <ArrowL size={17} weight={1.8} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[19px] font-bold tracking-[-0.02em] text-(--ink) truncate">{sub.location}</div>
            <div className="text-[12px] text-(--ink-3) mt-0.5">Submitted {dateStr} · {timeStr}</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusPill status={sub.status} useLabel size="md" />
            {canEdit && (
              <Link
                href={editHref}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-(--ink) text-white text-[13px] font-semibold no-underline shrink-0"
              >
                <Brush size={15} weight={2} />
                Edit
              </Link>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 380px' }}>

          {/* Left: photo */}
          <div className="p-6 flex flex-col gap-3 overflow-hidden border-r border-(--border)">
            <div className="flex-1 min-h-0 relative rounded-(--r-md) overflow-hidden bg-(--surface) border border-(--border)">
              {curPhoto ? (
                <img
                  src={curPhoto.cloudinaryUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-(--ink-4) text-[13px]">No photos</div>
              )}
              {photos.length > 0 && (
                <div className="absolute bottom-3 left-3 h-6 px-2.5 rounded-full flex items-center font-mono font-semibold text-[11px] text-white"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                  {String(safeIdx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </div>
              )}
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 shrink-0">
                {photos.map((p, i) => (
                  <button
                    key={p._id}
                    onClick={() => setActivePhoto(i)}
                    className="relative rounded-(--r) overflow-hidden cursor-pointer shrink-0 border-2 p-0 transition-[border-color]"
                    style={{
                      width: 72, height: 72,
                      borderColor: i === safeIdx ? 'var(--ink)' : 'transparent',
                    }}
                  >
                    <img src={p.previewCloudinaryUrl || p.cloudinaryUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

              {/* Ref + timestamp */}
              <div className="font-mono text-[11px] text-(--ink-3)">
                #{String(sub.photoNo).padStart(4, '0')} · {dateStr} · {timeStr}
              </div>

              {/* Wall sizes */}
              <div className="rounded-(--r-md) border border-(--border) overflow-hidden">
                <div className="px-4 py-2.5 border-b border-(--border) bg-(--surface)">
                  <span className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.06em]">Wall sizes</span>
                </div>
                {sub.sizes.map((sz, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-(--border) last:border-0">
                    <div className="font-mono text-[11px] text-(--ink-4) w-5">{String(i + 1).padStart(2, '0')}</div>
                    <div className="font-mono text-[14px] font-semibold text-(--ink) flex-1">{sz[0].toFixed(1)} × {sz[1].toFixed(1)} ft</div>
                    <div className="font-mono text-[12px] text-(--ink-3)">{(sz[0] * sz[1]).toFixed(1)} ft²</div>
                  </div>
                ))}
                <div className="flex justify-between items-center px-4 py-2.5 bg-(--surface) border-t border-(--border)">
                  <span className="text-[12px] font-semibold text-(--ink-2)">Total</span>
                  <span className="font-mono text-[15px] font-bold text-(--ink)">{viewArea} ft²</span>
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Photo number', value: String(sub.photoNo).padStart(2, '0') },
                  { label: 'Photos',       value: String(photos.length)                },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-(--surface) border border-(--border) rounded-(--r) px-4 py-3">
                    <div className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wider">{label}</div>
                    <div className="font-(--mono) text-[22px] font-semibold mt-1 text-(--ink)">{value}</div>
                  </div>
                ))}
              </div>

              {/* Rejection reason */}
              {sub.status === 'rejected' && sub.rejectionReason && (
                <div className="rounded-(--r) p-3.5 bg-(--rejected-soft) border border-[oklch(0.55_0.17_25_/_0.2)]">
                  <div className="text-[10px] font-bold uppercase tracking-[.05em] mb-1.5 text-(--rejected)">Rejection reason</div>
                  <div className="text-[13px] text-(--ink) leading-[1.45]">{sub.rejectionReason}</div>
                </div>
              )}

              {/* Notes */}
              {sub.notes && (
                <div>
                  <div className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-1.5">Notes</div>
                  <div className="text-[13px] text-(--ink-2) leading-[1.6]">{sub.notes}</div>
                </div>
              )}
            </div>

            {/* Edit button */}
            {canEdit && (
              <div className="px-6 pb-6 pt-4 shrink-0 border-t border-(--border)">
                <Link
                  href={editHref}
                  className="w-full h-11 rounded-full bg-(--ink) text-white text-[14px] font-semibold flex items-center justify-center gap-2 no-underline"
                >
                  <Brush size={16} weight={2} />
                  Edit submission
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
