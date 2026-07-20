"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useGetJobQuery } from "@/store/api/endpoints/jobs";
import { useGetSubmissionsQuery } from "@/store/api/endpoints/submissions";
import { ArrowL, Send, Plus } from "@/components/jobs/shared/icons";
import { HeroCard } from "@/components/jobs/detail/HeroCard";
import { FilterBar, type Filter } from "@/components/jobs/detail/FilterBar";
import { SubmissionRow } from "@/components/jobs/detail/SubmissionRow";
import { EmptyState } from "@/components/jobs/detail/EmptyState";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const [filter, setFilter] = useState<Filter>("All");

  const {
    data: job,
    isLoading: jobLoading,
    isError: jobError,
    error: jobErr,
  } = useGetJobQuery(jobId, { pollingInterval: 30_000 });

  const { data: submissions = [], isLoading: subsLoading } =
    useGetSubmissionsQuery(jobId, { pollingInterval: 30_000 });

  if (jobLoading || subsLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="landing-spinner" />
      </div>
    );
  }

  if (jobError || !job) {
    const msg =
      (jobErr as { data?: { error?: { message?: string } } })?.data?.error
        ?.message ?? "Job not found";
    return (
      <div className="m-6 p-4 rounded-(--r) bg-(--rejected-soft) text-(--rejected) text-[13px] font-medium border border-[oklch(0.55_0.17_25/0.2)]">
        {msg}
      </div>
    );
  }

  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const pendingCount  = submissions.filter((s) => s.status === "pending").length;
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length;
  const total         = submissions.length;

  const FILTERS = [
    { label: `All · ${total}`,              key: "All"      as Filter },
    { label: `Pending · ${pendingCount}`,   key: "Pending"  as Filter },
    { label: `Approved · ${approvedCount}`, key: "Approved" as Filter },
    { label: `Rejected · ${rejectedCount}`, key: "Rejected" as Filter },
  ];

  const filtered =
    filter === "All"
      ? submissions
      : submissions.filter((s) => s.status.toLowerCase() === filter.toLowerCase());

  const submitHref = `/painter/jobs/${jobId}/new`;

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border) flex items-center gap-2.5 px-4 py-2.5">
          <Link
            href="/painter/dashboard"
            className="w-9 h-9 rounded-full border-0 bg-transparent text-(--ink) flex items-center justify-center shrink-0 no-underline"
          >
            <ArrowL size={22} weight={1.8} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold tracking-[-0.015em] text-(--ink) whitespace-nowrap overflow-hidden text-ellipsis">
              {job.companyName}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 flex flex-col gap-2.5">
          <HeroCard
            companyName={job.companyName}
            description={job.description}
            jobType={job.jobType}
            approvedCount={approvedCount}
            pendingCount={pendingCount}
            rejectedCount={rejectedCount}
          />
          <FilterBar filters={FILTERS} active={filter} onChange={setFilter} />
          {filtered.length === 0 ? (
            <EmptyState filter={filter} jobStatus={job.status} />
          ) : (
            filtered.map((sub) => (
              <SubmissionRow key={sub._id} sub={sub} jobId={jobId} />
            ))
          )}
          <div className="h-4" />
        </div>

        {job.status === "active" && (
          <Link
            href={submitHref}
            className="fixed right-4.5 bottom-25 flex items-center gap-2.5 no-underline z-40"
          >
            <div className="h-13 pl-4.5 pr-1.5 bg-(--ink) text-white flex items-center gap-2.5 rounded-full shadow-(--shadow)">
              <span className="text-[14px] font-semibold">Submit</span>
              <div className="w-10 h-10 rounded-full bg-(--accent) flex items-center justify-center text-white">
                <Plus size={20} weight={2.4} />
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:block px-13 py-11">
        <div className="flex items-start justify-between mb-7">
          <div>
            <Link
              href="/painter/dashboard"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--ink-3) no-underline mb-3"
            >
              <ArrowL size={16} weight={2} />
              My jobs
            </Link>
            <div className="text-[26px] font-bold tracking-tight text-(--ink) leading-[1.1]">
              {job.companyName}
            </div>
          </div>
          {job.status === "active" && (
            <Link
              href={submitHref}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-(--ink) text-white text-[14px] font-semibold no-underline shrink-0"
            >
              <Send size={16} weight={2.2} />
              New submission
            </Link>
          )}
        </div>

        <HeroCard
          companyName={job.companyName}
          description={job.description}
          jobType={job.jobType}
          approvedCount={approvedCount}
          pendingCount={pendingCount}
          rejectedCount={rejectedCount}
        />

        <div className="mt-5 mb-4">
          <FilterBar filters={FILTERS} active={filter} onChange={setFilter} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState filter={filter} jobStatus={job.status} />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((sub) => (
              <SubmissionRow key={sub._id} sub={sub} jobId={jobId} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}