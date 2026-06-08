import Link from 'next/link';
import type { Job } from '@/store/api/endpoints/jobs';
import { Building, ArrowRight } from './icons';
import { JobTypeBadge } from '@/components/dashboards/JobTypeBadge';
import { JobStatusPill } from './JobStatusPill';

export function OwnerJobCard({ job }: { job: Job }) {
  const pending = job.stats?.pending ?? 0;

  return (
    <Link
      href={`/owner/jobs/${job._id}`}
      className="block no-underline bg-(--surface) rounded-(--r-md) border border-(--border) p-3.5 shadow-(--shadow-sm) hover:border-(--border-2) active:scale-[0.99] transition-[border-color,transform] duration-100"
    >
      <div className="flex items-start gap-3">
        {/* Building icon */}
        <div className="w-11 h-11 rounded-[10px] shrink-0 bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-2)">
          <Building size={22} weight={1.6} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold leading-[1.2] text-(--ink) tracking-[-0.01em]">
            {job.companyName}
          </div>
          {job.description && (
            <div className="text-[12px] text-(--ink-3) mt-1 leading-[1.35] line-clamp-1">
              {job.description}
            </div>
          )}
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <JobStatusPill status={job.status} />
            <JobTypeBadge type={job.type} />
            {pending > 0 && (
              <span
                className="inline-flex items-center h-[18px] px-[9px] rounded-full text-[11px] font-bold"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent-deep)' }}
              >
                <span className="font-(--mono)">{pending}</span>&nbsp;pending
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={16}
          className="shrink-0 self-center"
          style={{ color: 'var(--ink-4)' }}
        />
      </div>
    </Link>
  );
}
