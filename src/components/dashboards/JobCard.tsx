import Link from "next/link";
import type { Job } from "@/store/api/endpoints/jobs";
import { Building, Users, ArrowRight } from "./icons";
import { JobTypeBadge } from "./JobTypeBadge";
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
        <div className="w-11 h-11 rounded-[10px] shrink-0 bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-2)">
          <Building size={22} weight={1.6} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.01em] leading-[1.2] text-(--ink)">
            {job.companyName}
          </div>
          <div className="mt-1.5">
            <JobTypeBadge type={job.type} />
          </div>
          {job.description && (
            <div className="text-[12px] text-(--ink-3) mt-1.5 leading-[1.35]">
              {job.description}
            </div>
          )}
          <div className="mt-2.5 flex items-center flex-nowrap text-[11px] text-(--ink-3)">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Users size={12} weight={1.8} />
              {paintersCount} {paintersCount === 1 ? "painter" : "painters"}
            </span>
            <span className="font-(--mono) text-[11px] whitespace-nowrap ml-auto pl-2.5 text-(--ink-4)">
              Last activity {relativeTime(job.updatedAt)}
            </span>
          </div>
        </div>

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
