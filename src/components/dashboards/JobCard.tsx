import Link from "next/link";
import type { Job } from "@/store/api/endpoints/jobs";
import { Building, Users, ArrowRight } from "./icons";
import { relativeTime } from "./jobHelpers";

export function JobCard({ job }: { job: Job }) {
  const pendingCount = job.stats?.pending ?? 0;
  const paintersCount = job.painters?.length ?? 0;

  return (
    <Link
      href={`/painter/jobs/${job._id}`}
      className="block no-underline bg-(--surface) rounded-(--r-md) border border-(--border) p-3.5 shadow-(--shadow-sm)"
    >
      <div className="flex items-start gap-3">
        {/* Left Icon */}
        <div className="w-11 h-11 rounded-[10px] shrink-0 bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-2)">
          <Building size={22} weight={1.6} />
        </div>

        {/* Middle Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[15px] font-semibold tracking-[-0.01em] leading-[1.2] text-(--ink) truncate">
            {job.companyName}
          </div>
          
          {/* Job Type Tag moved below the title */}
          {job.jobType && (
            <div className="mt-1.5">
              <span className="inline-flex items-center h-5 px-2 bg-(--paper-2) text-(--ink-2) border border-(--border-2) rounded-full text-[10px] font-bold uppercase tracking-wider">
                {job.jobType}
              </span>
            </div>
          )}

          {/* User count & Last Activity cleanly spaced apart */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-(--ink-3)">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Users size={12} weight={1.8} />
              {paintersCount} {paintersCount === 1 ? "painter" : "painters"}
            </span>
            <span className="font-(--mono) text-[11px] whitespace-nowrap text-(--ink-4)">
              Last activity {relativeTime(job.updatedAt)}
            </span>
          </div>
        </div>

        {/* Right Status */}
        <div className="text-right shrink-0">
          {pendingCount > 0 ? (
            <div className="bg-(--accent-soft) text-(--accent-deep) py-1.5 px-2.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
              <span className="font-(--mono) text-[13px]">{pendingCount}</span>
              pending
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.25 h-5.5 px-2.25 bg-(--paper-2) text-(--ink-3) rounded-full text-[11px] font-semibold tracking-[.02em] uppercase">
              All clear
            </span>
          )}
          <ArrowRight
            size={16}
            style={{
              color: "var(--ink-4)",
              marginTop: 8,
              display: "block",
              marginLeft: "auto",
            }}
          />
        </div>
      </div>
    </Link>
  );
}