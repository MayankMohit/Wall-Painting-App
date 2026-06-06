import type { Filter } from "./FilterBar";

interface EmptyStateProps {
  filter: Filter;
  jobStatus?: string;
}

export function EmptyState({ filter, jobStatus }: EmptyStateProps) {
  return (
    <div className="py-12 px-6 text-center bg-(--surface) rounded-(--r) border border-(--border)">
      <div className="text-[14px] font-semibold text-(--ink) mb-1">
        No {filter === "All" ? "" : filter.toLowerCase() + " "}submissions yet
      </div>
      {filter === "All" && jobStatus === "active" && (
        <div className="text-[13px] text-(--ink-3)">
          Tap Submit to add your first submission.
        </div>
      )}
    </div>
  );
}
