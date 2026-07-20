'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCreateJobMutation } from '@/store/api/endpoints/jobs';
import { PainterPicker } from '@/components/owner/PainterPicker';
import { Check, X } from '@/components/owner/icons';

export default function CreateJobPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [jobType, setJobType] = useState<'Wall' | 'Shutter' | 'Van'>('Wall');
  const [pdfFormat, setPdfFormat] = useState<'A' | 'B'>('A');

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState('');

  const [createJob, { isLoading: isSubmitting }] = useCreateJobMutation();

  const togglePainter = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSearch = (q: string) => {
    setSearchTerm(q);
    setPage(1);
  };

  const handleSubmit = async () => {
    if (!companyName.trim() || isSubmitting) return;
    setSubmitError('');
    try {
      await createJob({
        companyName: companyName.trim(),
        description: description.trim() || undefined,
        painterIds: selectedIds,
        jobType,
        pdfFormat,
      }).unwrap();
      router.push('/owner/jobs');
    } catch (err: unknown) {
      const e = err as { data?: { error?: string; message?: string } };
      setSubmitError(e?.data?.error ?? e?.data?.message ?? 'Failed to create job');
    }
  };

  const canSubmit = companyName.trim().length > 0 && !isSubmitting;

  return (
    <>
      {/* ══ Mobile top bar ════════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-(--paper) border-b border-(--border) flex items-center h-14 px-4 gap-3">
        <Link
          href="/owner/jobs"
          className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors no-underline"
        >
          <X size={20} />
        </Link>
        <span className="flex-1 text-[18px] font-bold text-(--ink) tracking-[-0.02em]">
          New job
        </span>
        <Link
          href="/owner/jobs"
          className="text-[13px] text-(--ink-3) font-medium no-underline hover:text-(--ink) transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* ══ Desktop header ════════════════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-3 px-8 pt-7 pb-5 border-b border-(--border) sticky top-0 z-10 bg-(--paper)">
        <div className="mr-auto">
          <h1 className="text-[22px] font-bold text-(--ink) tracking-tight leading-tight">
            Create new job
          </h1>
          <p className="text-[13px] text-(--ink-3) mt-0.5">
            Fill in the company, scope and assign painters.
          </p>
        </div>
        <Link
          href="/owner/jobs"
          className="inline-flex items-center h-9 px-4 rounded-(--r) text-[13px] font-semibold text-(--ink-2) bg-(--surface) border border-(--border-2) no-underline hover:border-(--border-3) transition-[border-color]"
        >
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-(--r) text-[13px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-88 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--ink)' }}
        >
          <Check size={14} weight={2.2} />
          {isSubmitting ? 'Creating…' : 'Create job'}
        </button>
      </div>

      {submitError && (
        <div
          className="mx-4 lg:mx-8 mt-4 px-4 py-3 rounded-(--r) text-[13px] font-medium"
          style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}
        >
          {submitError}
        </div>
      )}

      {/* ══ Desktop 2-col content ═════════════════════════════════════ */}
      <div className="hidden lg:block px-8 pt-7 pb-10">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] font-bold text-(--ink-2) uppercase tracking-wider mb-3.5">
              Job details
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Company name</div>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Brightline Properties"
                  autoFocus
                  className="w-full h-11.5 px-3.5 rounded-(--r) border border-(--border-2) bg-(--surface) text-[14px] text-(--ink) outline-none focus:border-(--border-3) transition-[border-color] placeholder:text-(--ink-4)"
                />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Description</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Floors 8–12 hallways, suites and stairwells…"
                  className="w-full px-3.5 py-3 rounded-(--r) border border-(--border-2) bg-(--surface) text-[14px] text-(--ink) outline-none focus:border-(--border-3) transition-[border-color] placeholder:text-(--ink-4) resize-none leading-normal"
                />
              </div>
            </div>
          </div>

          {/* --- NEW CONFIGURATION UI --- */}
          <div className="mt-6 mb-6 pt-6 border-t border-(--border-2)">
            <div className="text-[12px] font-semibold text-(--ink-2) mb-2.5">Job Type</div>
            <div className="flex gap-3 mb-6">
              {['Wall', 'Shutter', 'Van'].map((type) => (
                <label
                  key={type}
                  className={`flex-1 flex items-center justify-center h-10 rounded-(--r) border text-[13px] font-medium cursor-pointer transition-colors ${jobType === type
                      ? 'bg-(--ink) text-white border-(--ink)'
                      : 'bg-(--surface) text-(--ink-2) border-(--border-2) hover:border-(--border-3)'
                    }`}
                >
                  <input
                    type="radio"
                    name="jobType"
                    value={type}
                    checked={jobType === type}
                    onChange={(e) => setJobType(e.target.value as any)}
                    className="hidden"
                  />
                  {type}
                </label>
              ))}
            </div>

            <div className="text-[12px] font-semibold text-(--ink-2) mb-2.5">PDF Output Format</div>
            <div className="grid grid-cols-2 gap-4">

              {/* Format A Selection Card */}
              <div
                onClick={() => setPdfFormat('A')}
                className={`relative rounded-(--r) border-2 cursor-pointer overflow-hidden transition-colors ${pdfFormat === 'A' ? 'border-(--ink)' : 'border-(--border-2) hover:border-(--border-3)'
                  }`}
              >
                <div className="h-24 bg-gray-100 flex items-center justify-center">
                  {/* REPLACE WITH YOUR IMAGE TAG */}
                  <span className="text-xs text-gray-400">Format A Image</span>
                </div>
                <div className="p-2 text-center text-[12px] font-medium text-(--ink-2) bg-(--surface)">
                  Standard Format (A)
                </div>
              </div>

              {/* Format B Selection Card */}
              <div
                onClick={() => setPdfFormat('B')}
                className={`relative rounded-(--r) border-2 cursor-pointer overflow-hidden transition-colors ${pdfFormat === 'B' ? 'border-(--ink)' : 'border-(--border-2) hover:border-(--border-3)'
                  }`}
              >
                <div className="h-24 bg-gray-100 flex items-center justify-center">
                  {/* REPLACE WITH YOUR IMAGE TAG */}
                  <span className="text-xs text-gray-400">Format B Image</span>
                </div>
                <div className="p-2 text-center text-[12px] font-medium text-(--ink-2) bg-(--surface)">
                  Detailed Format (B)
                </div>
              </div>
            </div>
          </div>
          {/* ---------------------------- */}

          <div>
            <div className="text-[11px] font-bold text-(--ink-2) uppercase tracking-wider mb-3.5">
              Assign painters{' '}
              <span className="text-(--ink-4) font-medium normal-case tracking-normal">
                · {selectedIds.length} selected
              </span>
            </div>
            <PainterPicker
              selectedIds={selectedIds}
              onToggle={togglePainter}
              searchTerm={searchTerm}
              onSearch={handleSearch}
              page={page}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>

      {/* ══ Mobile single-column form ═════════════════════════════════ */}
      <div className="lg:hidden px-4 pt-4 pb-4 flex flex-col gap-4">

        <div className="w-full pb-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-(--r-md) text-white text-[15px] font-semibold cursor-pointer transition-opacity hover:opacity-88 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--ink)' }}
          >
            {isSubmitting ? 'Creating…' : 'Create job'}
          </button>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Company name</div>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Brightline Properties"
            className="w-full h-11.5 px-3.5 rounded-(--r) border border-(--border-2) bg-(--surface) text-[14px] text-(--ink) outline-none focus:border-(--border-3) transition-[border-color] placeholder:text-(--ink-4)"
          />
        </div>

        <div>
          <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Floors 8–12 hallways, suites and stairwells…"
            className="w-full px-3.5 py-3 rounded-(--r) border border-(--border-2) bg-(--surface) text-[14px] text-(--ink) outline-none focus:border-(--border-3) transition-[border-color] placeholder:text-(--ink-4) resize-none leading-normal"
          />
        </div>

        {/* --- NEW CONFIGURATION UI --- */}
        <div className="mt-6 mb-6 pt-6 border-t border-(--border-2)">
          <div className="text-[12px] font-semibold text-(--ink-2) mb-2.5">Job Type</div>
          <div className="flex gap-3 mb-6">
            {['Wall', 'Shutter', 'Van'].map((type) => (
              <label
                key={type}
                className={`flex-1 flex items-center justify-center h-10 rounded-(--r) border text-[13px] font-medium cursor-pointer transition-colors ${jobType === type
                  ? 'bg-(--ink) text-white border-(--ink)'
                  : 'bg-(--surface) text-(--ink-2) border-(--border-2) hover:border-(--border-3)'
                  }`}
              >
                <input
                  type="radio"
                  name="jobType"
                  value={type}
                  checked={jobType === type}
                  onChange={(e) => setJobType(e.target.value as any)}
                  className="hidden"
                />
                {type}
              </label>
            ))}
          </div>

          <div className="text-[12px] font-semibold text-(--ink-2) mb-2.5">PDF Output Format</div>
          <div className="grid grid-cols-2 gap-4">

            {/* Format A Selection Card */}
            <div
              onClick={() => setPdfFormat('A')}
              className={`relative rounded-(--r) border-2 cursor-pointer overflow-hidden transition-colors ${pdfFormat === 'A' ? 'border-(--ink)' : 'border-(--border-2) hover:border-(--border-3)'
                }`}
            >
              <div className="h-24 bg-gray-100 flex items-center justify-center">
                {/* REPLACE WITH YOUR IMAGE TAG */}
                <span className="text-xs text-gray-400">Format A Image</span>
              </div>
              <div className="p-2 text-center text-[12px] font-medium text-(--ink-2) bg-(--surface)">
                Standard Format (A)
              </div>
            </div>

            {/* Format B Selection Card */}
            <div
              onClick={() => setPdfFormat('B')}
              className={`relative rounded-(--r) border-2 cursor-pointer overflow-hidden transition-colors ${pdfFormat === 'B' ? 'border-(--ink)' : 'border-(--border-2) hover:border-(--border-3)'
                }`}
            >
              <div className="h-24 bg-gray-100 flex items-center justify-center">
                {/* REPLACE WITH YOUR IMAGE TAG */}
                <span className="text-xs text-gray-400">Format B Image</span>
              </div>
              <div className="p-2 text-center text-[12px] font-medium text-(--ink-2) bg-(--surface)">
                Detailed Format (B)
              </div>
            </div>
          </div>
        </div>
        {/* ---------------------------- */}

        <div>
          <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
            Painters{' '}
            <span className="text-(--ink-4) font-medium">· {selectedIds.length} selected</span>
          </div>
          <PainterPicker
            selectedIds={selectedIds}
            onToggle={togglePainter}
            searchTerm={searchTerm}
            onSearch={handleSearch}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>

    </>
  );
}
