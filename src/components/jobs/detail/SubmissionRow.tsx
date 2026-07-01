import Link from "next/link";
import type { Submission } from "@/store/api/endpoints/submissions";
import { ArrowR } from "@/components/jobs/shared/icons";
import { StatusPill, NeutralPill } from "@/components/jobs/shared/StatusPill";
import { relativeTime } from "@/components/jobs/shared/submissionHelpers";
import { PhotoThumb } from "./PhotoThumb";

function sizeLabel(sizes?: number[][]): string | null {
  if (!sizes?.length) return null;
  const [w, h] = sizes[0];
  const first = `${w} × ${h} ft²`;
  return sizes.length > 1 ? `${first}  +${sizes.length - 1} more` : first;
}

export function SubmissionRow({ sub, jobId, href: hrefProp }: { sub: Submission; jobId?: string; href?: string }) {
  const count      = sub.imageCount ?? 1;
  const previewUrl = sub.previewUrl;
  const editable   = sub.status === "pending" || sub.status === "rejected";
  const time       = relativeTime(sub.submittedAt || sub.createdAt || "");
  const size       = sub.status === "approved" ? null : sizeLabel(sub.sizes);
  const href       = hrefProp ?? `/painter/jobs/${jobId}/submissions/${sub._id}`;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 no-underline text-inherit bg-(--surface) rounded-(--r) border border-(--border) shadow-(--shadow-sm)"
    >
      <PhotoThumb count={count} previewUrl={previewUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sub.photoNo != null && (
            <span className="font-mono text-[11px] font-semibold text-(--ink-3) tabular-nums">
              #{String(sub.photoNo).padStart(2, "0")}
            </span>
          )}
          <StatusPill status={sub.status} />
          {editable && <NeutralPill>editable</NeutralPill>}
        </div>
        <div className="text-[14px] font-semibold mt-[3px] text-(--ink)">{sub.location}</div>
        <div className="text-[12px] text-(--ink-3) mt-px flex items-center gap-1.5">
          {size && (
            <>
              <span className="font-mono">{size}</span>
              <span className="text-(--ink-4)">·</span>
            </>
          )}
          <span>{time}</span>
        </div>
      </div>
      <ArrowR size={18} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
    </Link>
  );
}
