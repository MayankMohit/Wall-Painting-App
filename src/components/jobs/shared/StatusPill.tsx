const STATUS_STYLE: Record<string, { fg: string; bg: string; label: string }> = {
  pending:  { fg: "var(--pending)",  bg: "var(--pending-soft)",  label: "Pending review" },
  approved: { fg: "var(--approved)", bg: "var(--approved-soft)", label: "Approved"       },
  rejected: { fg: "var(--rejected)", bg: "var(--rejected-soft)", label: "Rejected"       },
};

interface StatusPillProps {
  status: string;
  useLabel?: boolean;
  size?: "sm" | "md";
}

export function StatusPill({ status, useLabel, size = "sm" }: StatusPillProps) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  const sizeClass = size === "md"
    ? "h-[22px] px-[9px] text-[11px]"
    : "h-[18px] px-[7px] text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full font-semibold tracking-[.02em] uppercase ${sizeClass}`}
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: s.fg }} />
      {useLabel ? s.label : status}
    </span>
  );
}

export function NeutralPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center h-[18px] px-[7px] bg-(--paper-2) text-(--ink-3) rounded-full text-[10px] font-semibold tracking-[.02em] uppercase">
      {children}
    </span>
  );
}
