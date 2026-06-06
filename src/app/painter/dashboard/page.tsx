"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useGetJobsQuery } from "@/store/api/endpoints/jobs";
import { Search, X } from "@/components/dashboards/icons";
import { JobCard } from "@/components/dashboards/JobCard";
import { EmptyState } from "@/components/dashboards/EmptyState";

export default function PainterDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const [query, setQuery]         = useState("");
  const [showSearch, setSearch]   = useState(false);

  const { data: jobs = [], isLoading, isError } = useGetJobsQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30_000,
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const filtered  = query
    ? jobs.filter((j) => j.companyName.toLowerCase().includes(query.toLowerCase()))
    : jobs;

  const Spinner = () => (
    <div className="flex justify-center py-18">
      <div className="landing-spinner" />
    </div>
  );

  const ErrorBanner = () => (
    <div className="p-4 rounded-(--r) text-[13px] font-medium bg-(--rejected-soft) text-(--rejected) border border-[oklch(0.55_0.17_25/0.2)]">
      Failed to load jobs. Please refresh.
    </div>
  );

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border)">
          {!showSearch ? (
            <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-[22px] font-semibold tracking-[-0.02em] leading-[1.1] text-(--ink)">
                  My jobs
                </div>
                <div className="text-[12px] text-(--ink-3) mt-0.5">
                  {jobs.length} assigned · Hey {firstName}
                </div>
              </div>
              <button
                onClick={() => setSearch(true)}
                className="w-9 h-9 rounded-full border-0 bg-transparent text-(--ink) cursor-pointer flex items-center justify-center"
              >
                <Search size={20} weight={1.8} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5">
              <div className="flex-1 h-10 flex items-center gap-2 bg-(--paper-2) border border-(--border-2) rounded-full px-3.5">
                <Search size={16} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search jobs…"
                  className="flex-1 border-0 bg-transparent outline-none text-[14px] text-(--ink) font-(--font)"
                />
              </div>
              <button
                onClick={() => { setSearch(false); setQuery(""); }}
                className="w-9 h-9 rounded-full border-0 bg-transparent text-(--ink) cursor-pointer flex items-center justify-center shrink-0"
              >
                <X size={18} weight={2} />
              </button>
            </div>
          )}
        </div>

        <div className="p-3 px-4 flex flex-col gap-2.5">
          {isLoading && <Spinner />}
          {!isLoading && isError && <ErrorBanner />}
          {!isLoading && !isError && filtered.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
          {!isLoading && !isError && filtered.length === 0 && (
            <EmptyState query={query} />
          )}
        </div>
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────── */}
      <div className="hidden lg:block px-13 py-11">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[28px] font-bold tracking-[-0.03em] leading-[1.1] text-(--ink)">
              My jobs
            </div>
            <div className="text-[14px] text-(--ink-3) mt-1.5">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"} assigned · Hey,{" "}
              {firstName}
            </div>
          </div>
          <div className="flex items-center gap-2 h-10 px-3.5 bg-(--surface) border border-(--border-2) rounded-full min-w-55">
            <Search size={15} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
              className="flex-1 border-0 bg-transparent outline-none text-[13px] text-(--ink) font-(--font)"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="w-5 h-5 border-0 rounded-full bg-(--border-2) text-(--ink-2) flex items-center justify-center cursor-pointer shrink-0 p-0"
              >
                <X size={11} weight={2.4} />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <ErrorBanner />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 14,
            }}
          >
            {filtered.map((job) => <JobCard key={job._id} job={job} />)}
            {filtered.length === 0 && (
              <div className="col-span-full">
                <EmptyState query={query} />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
