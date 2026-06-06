import Link from "next/link";
import type { Submission } from "@/store/api/endpoints/submissions";
import { ArrowR } from "@/components/jobs/shared/icons";
import { StatusPill, NeutralPill } from "@/components/jobs/shared/StatusPill";
import { relativeTime } from "@/components/jobs/shared/submissionHelpers";
import { PhotoThumb } from "./PhotoThumb";

export function SubmissionRow({ sub, jobId }: { sub: Submission; jobId: string }) {
  const count      = sub.imageCount ?? 1;
  const previewUrl = sub.previewUrl;
  const editable = sub.status === "pending" || sub.status === "rejected";
  const time     = relativeTime(sub.submittedAt || sub.createdAt || "");

  return (
    <Link
      href={`/painter/jobs/${jobId}/submissions/${sub._id}`}
      className="flex items-center gap-3 p-3 no-underline text-inherit bg-(--surface) rounded-(--r) border border-(--border) shadow-(--shadow-sm)"
    >
      <PhotoThumb count={count} previewUrl={previewUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill status={sub.status} />
          {editable && <NeutralPill>editable</NeutralPill>}
        </div>
        <div className="text-[14px] font-semibold mt-[3px] text-(--ink)">{sub.location}</div>
        <div className="text-[12px] text-(--ink-3) mt-px">{time}</div>
      </div>
      <ArrowR size={18} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
    </Link>
  );
}
