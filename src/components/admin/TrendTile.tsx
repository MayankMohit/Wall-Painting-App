// Analytical KPI tile — StatTile-styled (accent top border, mono value) but with a
// delta chip vs the prior window and an optional hand-rolled sparkline instead of
// a nav link.

interface TrendTileProps {
  label      : string;
  value      : string | number;
  sub?       : string;
  accent?    : string;
  delta?     : number | null;   // fractional change vs prior window (0.25 = +25%); null/undefined → no chip
  goodWhenUp?: boolean;         // false for metrics where lower is better (e.g. turnaround)
  spark?     : number[];
}

function Sparkline({ points, accent }: { points: number[]; accent: string }) {
  if (points.length < 2 || points.every((p) => p === 0)) return null;
  const W = 64, H = 22, max = Math.max(...points);
  const path = points
    .map((p, i) => `${(i / (points.length - 1)) * W},${H - 2 - (p / max) * (H - 4)}`)
    .join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0" aria-hidden>
      <polyline points={path} fill="none" stroke={accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendTile({ label, value, sub, accent = 'var(--accent)', delta, goodWhenUp = true, spark }: TrendTileProps) {
  const hasDelta = delta != null && Number.isFinite(delta) && delta !== 0;
  const up       = (delta ?? 0) > 0;
  const good     = up === goodWhenUp;

  return (
    <div
      className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4 lg:p-5 shadow-(--shadow-sm)"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-end justify-between gap-2">
        <div className="font-(--mono) text-[26px] lg:text-[30px] font-bold tracking-[-0.025em] leading-none text-(--ink)">
          {value}
        </div>
        {spark && <Sparkline points={spark} accent={accent} />}
      </div>
      <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em] mt-1.5">{label}</div>
      <div className="flex items-center gap-1.5 mt-1.5 min-h-[18px]">
        {hasDelta && (
          <span
            className="inline-flex items-center gap-0.5 h-[18px] px-1.5 rounded-full font-(--mono) text-[10px] font-bold"
            style={{
              background: good ? 'var(--approved-soft)' : 'var(--rejected-soft)',
              color     : good ? 'var(--approved)'      : 'var(--rejected)',
            }}
          >
            {up ? '▲' : '▼'} {Math.abs(delta! * 100).toFixed(0)}%
          </span>
        )}
        {sub && <span className="text-[11px] text-(--ink-3)">{sub}</span>}
      </div>
    </div>
  );
}
