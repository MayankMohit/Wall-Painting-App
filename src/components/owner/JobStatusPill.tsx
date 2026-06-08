const STATUS: Record<string, { fg: string; bg: string; label: string }> = {
  active:    { fg: 'var(--approved)',  bg: 'var(--approved-soft)', label: 'Active'    },
  completed: { fg: 'var(--info)',      bg: 'var(--info-soft)',     label: 'Completed' },
  invoiced:  { fg: 'var(--ink-3)',     bg: 'var(--paper-2)',       label: 'Invoiced'  },
};

export function JobStatusPill({
  status,
  size = 'sm',
}: {
  status: string;
  size?: 'sm' | 'md';
}) {
  const s = STATUS[status] ?? STATUS.active;
  const sz =
    size === 'md'
      ? 'h-[22px] px-[9px] text-[11px]'
      : 'h-[18px] px-[7px] text-[10px]';
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full font-semibold tracking-[.02em] uppercase ${sz}`}
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}
