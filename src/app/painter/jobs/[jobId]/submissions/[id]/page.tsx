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

      {/* ── DESKTOP ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:block px-10 py-11 max-w-[800px] mx-auto">

        <div className="flex items-start justify-between mb-7">
          <div>
            <Link
              href={`/painter/jobs/${jobId}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--ink-3) no-underline mb-3"
            >
              <ArrowL size={16} weight={2} />
              Back to job
            </Link>
            <div className="flex items-center gap-2.5 mb-1">
              <StatusPill status={sub.status} useLabel size="md" />
            </div>
            <div className="text-[24px] font-bold tracking-tight text-(--ink)">{sub.location}</div>
            <div className="text-[13px] text-(--ink-3) mt-1">Submitted {dateStr} · {timeStr}</div>
          </div>
          {canEdit && (
            <Link
              href={editHref}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-(--ink) text-white text-[14px] font-semibold no-underline shrink-0"
            >
              <Brush size={16} weight={2} />
              Edit submission
            </Link>
          )}
        </div>

        <PhotoViewer
          photos={photos}
          activeIndex={activePhoto}
          onSelect={setActivePhoto}
          mainClass="h-80"
          thumbSize="w-16 h-16"
          thumbGap="gap-2"
        />

        <div className="mt-7 mb-1.5 text-[11px] font-bold text-(--ink-3) tracking-[.06em] uppercase">
          Wall sizes
        </div>
        <SizesTable sizes={sub.sizes} totalArea={viewArea} />

        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          {[
            { label: 'Photo number', value: String(sub.photoNo).padStart(2, '0') },
            { label: 'Photos',       value: String(photos.length)                },
          ].map(({ label, value }) => (
            <div key={label} className="bg-(--surface) border border-(--border) rounded-(--r) px-4 py-3.5">
              <div className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wider">{label}</div>
              <div className="font-(--mono) text-[22px] mt-1.5 text-(--ink)">{value}</div>
            </div>
          ))}
        </div>

        {sub.notes && (
          <div className="mt-6">
            <div className="text-[11px] font-bold text-(--ink-3) tracking-[.06em] uppercase mb-2">Notes</div>
            <div className="text-[14px] text-(--ink-2) leading-[1.6]">{sub.notes}</div>
          </div>
        )}
      </div>
    </>
  );
}
