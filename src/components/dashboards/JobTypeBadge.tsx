import { JOB_TYPES } from "./icons";

export function JobTypeBadge({ type }: { type?: string }) {
  if (!type || !JOB_TYPES[type]) return null;
  const { label, Icon } = JOB_TYPES[type];
  return (
    <span className="inline-flex items-center gap-1.5 h-5 px-2 bg-(--paper-2) text-(--ink-2) border border-(--border-2) rounded-full text-[11px] font-semibold tracking-[-0.005em]">
      <Icon size={12} weight={2} />
      {label}
    </span>
  );
}
