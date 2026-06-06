export type PillKind = 'neutral' | 'approved' | 'pending';

const PILL_CLS: Record<PillKind, string> = {
  neutral:  'bg-(--paper-2) text-(--ink-2) border border-(--border-2)',
  approved: 'bg-(--approved-soft) text-(--approved)',
  pending:  'bg-(--pending-soft) text-(--pending)',
};

export function Pill({ kind, children }: { kind: PillKind; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center h-[18px] px-[7px] rounded-full text-[10px] font-semibold tracking-[.02em] ${PILL_CLS[kind]}`}>
      {children}
    </span>
  );
}
