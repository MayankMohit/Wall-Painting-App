// Card shell for every analytics chart — app-styled header (SectionLabel look),
// optional window badge ("all time", "7 days"), and a shared empty state so
// sparse early data renders gracefully instead of a broken chart.

interface ChartCardProps {
  title      : string;
  badge?     : string;
  sub?       : string;
  empty?     : boolean;
  emptyLabel?: string;
  children   : React.ReactNode;
}

export function ChartCard({ title, badge, sub, empty, emptyLabel = 'No data in this range yet', children }: ChartCardProps) {
  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4 lg:p-5 shadow-(--shadow-sm) min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em]">{title}</div>
        {badge && (
          <span
            className="font-(--mono) text-[10px] font-bold h-4.5 px-1.5 rounded-full inline-flex items-center justify-center"
            style={{ background: 'var(--paper-2)', color: 'var(--ink-3)' }}
          >
            {badge}
          </span>
        )}
      </div>
      {sub && <div className="text-[12px] text-(--ink-3) mb-1">{sub}</div>}
      <div className="mt-3">
        {empty ? (
          <div className="h-[180px] flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--paper-2)', color: 'var(--ink-4)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="M8 17V9M13 17V5M18 17v-6" />
              </svg>
            </div>
            <div className="text-[12px] text-(--ink-4)">{emptyLabel}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
