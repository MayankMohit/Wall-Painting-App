import { Building, Search } from '@/components/owner/icons';
import type { JobFilter } from '@/store/api/endpoints/jobs';

const FILTER_LABELS: Record<JobFilter, string> = {
  active: 'Active',
  completed: 'Completed',
  invoiced: 'Invoiced',
};

export function JobsEmptyState({ filter }: { filter: JobFilter }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-11 h-11 rounded-xl bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-4) mb-4">
        <Building size={20} weight={1.6} />
      </div>
      <div className="text-[15px] font-semibold text-(--ink) mb-1.5">
        No {FILTER_LABELS[filter].toLowerCase()} jobs
      </div>
      <div className="text-[13px] text-(--ink-3) max-w-xs leading-[1.5]">
        {filter === 'active'
          ? 'Create a new job to get started.'
          : `No jobs marked as ${FILTER_LABELS[filter].toLowerCase()} yet.`}
      </div>
    </div>
  );
}

export function JobsEmptySearch({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-11 h-11 rounded-xl bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-4) mb-4">
        <Search size={20} weight={1.6} />
      </div>
      <div className="text-[15px] font-semibold text-(--ink) mb-1.5">
        No results for &ldquo;{query}&rdquo;
      </div>
      <div className="text-[13px] text-(--ink-3)">Try a different company name.</div>
    </div>
  );
}
