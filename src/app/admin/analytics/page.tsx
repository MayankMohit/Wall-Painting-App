'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, Label, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Refresh, ArrowRight } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/Avatar';
import { TrendTile } from '@/components/admin/TrendTile';
import { ChartCard } from '@/components/admin/ChartCard';

// ── Types (mirror /api/admin/analytics) ──────────────────────────────────────

interface DayRow { date: string; [k: string]: number | string }

interface AnalyticsResponse {
  range: string;
  generatedAt: string;
  growth: DayRow[];
  submissions: {
    total: number; pending: number; approved: number; rejected: number;
    approvalRate: number | null; approvalRatePrev: number | null;
    avgTurnaroundHours: number | null; avgTurnaroundHoursPrev: number | null;
    turnaroundBuckets: { label: string; n: number }[];
    funnel: { stage: string; n: number }[];
  };
  jobs: {
    byStatus: { active: number; completed: number; invoiced: number };
    createdVsCompleted: DayRow[];
    avgDurationDays: number | null;
  };
  leaderboards: {
    painters: { id: string; name: string; total: number; approved: number }[];
    owners: { id: string; name: string; jobs: number; submissions: number; bytes: number }[];
  };
  files: {
    storageByType: { type: string; bytes: number; count: number }[];
    downloadsByType: { type: string; downloads: number }[];
    genOutcome: { ready: number; failed: number; generating: number };
    ownersQuota: { id: string; name: string; bytes: number; limit: number }[];
  };
  activity: {
    perDay: DayRow[];
    byCategory: { category: string; n: number }[];
    logins: DayRow[];
    heatmap: { dow: number; hour: number; n: number }[];
    activePainters7d: number;
  };
  invites: { issued: number; claimed: number; revoked: number; expired: number; acceptanceRate: number | null };
  notifications: { sent7d: number; read7d: number; readRate: number | null };
  queues: Record<'fileGen' | 'notify' | 'assetCleanup', Record<string, number>>;
  kpis: { newPainters: number; newPaintersPrev: number | null };
}

type Range = '7d' | '30d' | '90d' | 'all';

// ── Palette ───────────────────────────────────────────────────────────────────
// SVG presentation attributes can't resolve var(), so chart series use the raw
// oklch values from globals.css (same precedent as the dashboard's inline oklch).

const C = {
  accent  : 'oklch(0.68 0.185 50)',
  approved: 'oklch(0.48 0.12 150)',
  rejected: 'oklch(0.55 0.17 25)',
  info    : 'oklch(0.5 0.12 240)',
  pending : 'oklch(0.62 0.025 80)',
  ink     : 'oklch(0.22 0.012 80)',
  ink3    : 'oklch(0.58 0.008 80)',
  border  : 'oklch(0.92 0.005 75)',
};

const AXIS_TICK = { fontSize: 11, fill: C.ink3 };
const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-2)',
  borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow)', padding: '8px 12px',
};

const FILE_LABELS: Record<string, string> = {
  excel: 'Excel', excel_painters: 'Painter Excel', pdf_file: 'PDF report', pdf_photos: 'PDF photos',
};

const RANGE_LABEL: Record<Range, string> = {
  '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days', all: 'all time',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { Authorization: `Bearer ${token}` };
}

function fmtGB(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${Math.round(bytes)} B`;
}

function fmtHours(h: number | null) {
  if (h == null) return '—';
  if (h < 1)  return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function fmtPct(r: number | null) {
  return r == null ? '—' : `${Math.round(r * 100)}%`;
}

function deltaOf(cur: number | null, prev: number | null) {
  if (cur == null || prev == null || prev === 0) return null;
  return (cur - prev) / prev;
}

const dateTick = (d: unknown) =>
  new Date(String(d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const allZero = (rows: DayRow[], keys: string[]) =>
  rows.every((r) => keys.every((k) => !r[k]));

// ── Small local pieces ────────────────────────────────────────────────────────

function RangeChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer transition-[background,border-color,color] duration-100 whitespace-nowrap"
      style={{
        background:  on ? 'var(--ink)' : 'var(--surface)',
        borderColor: on ? 'var(--ink)' : 'var(--border-2)',
        color:       on ? '#fff'       : 'var(--ink-2)',
      }}
    >
      {label}
    </button>
  );
}

function LegendRow({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-3 flex-wrap mt-2">
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[11px] text-(--ink-3)">{label}</span>
        </div>
      ))}
    </div>
  );
}

// Hand-rolled horizontal bar row — used for leaderboards (Avatar + proportional
// bar) because recharts category ticks can't render Avatars.
function BoardRow({ name, value, max, color, detail, avatar = true }: {
  name: string; value: number; max: number; color: string; detail: string; avatar?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {avatar && <Avatar name={name} size={30} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[13px] font-semibold text-(--ink) truncate">{name}</span>
          <span className="font-(--mono) text-[11px] text-(--ink-3) shrink-0">{detail}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--paper-2)' }}>
          <div className="h-full rounded-full" style={{ width: `${max > 0 ? Math.max(3, (value / max) * 100) : 0}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-(--r) border border-(--border) px-3 py-2" style={{ background: 'var(--paper-2)' }}>
      <div className="font-(--mono) text-[16px] font-bold leading-none" style={{ color: color ?? 'var(--ink)' }}>{value}</div>
      <div className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.05em] mt-1">{label}</div>
    </div>
  );
}

function MiniQueueRow({ name, counts }: { name: string; counts: Record<string, number> }) {
  const items: { k: string; color?: string }[] = [
    { k: 'active', color: 'var(--accent-deep)' }, { k: 'waiting' }, { k: 'completed' },
    { k: 'failed', color: 'var(--rejected)' },
  ];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-(--border) last:border-0">
      <div className="font-(--mono) text-[12px] font-semibold text-(--ink) w-28 shrink-0">{name}</div>
      <div className="flex items-center gap-3 flex-wrap">
        {items.map(({ k, color }) => (
          <span key={k} className="font-(--mono) text-[11px]" style={{ color: (counts[k] ?? 0) > 0 && color ? color : 'var(--ink-3)' }}>
            {counts[k] ?? 0} {k}
          </span>
        ))}
      </div>
    </div>
  );
}

// Hour × weekday heatmap (recharts has no heatmap — CSS grid)
const DOW_ORDER  = [2, 3, 4, 5, 6, 7, 1]; // Mongo $dayOfWeek: 1=Sun … 7=Sat → Mon-first
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Heatmap({ cells }: { cells: { dow: number; hour: number; n: number }[] }) {
  const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.n]));
  const max = Math.max(1, ...cells.map((c) => c.n));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: '34px repeat(24, minmax(12px, 1fr))' }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center font-(--mono) text-[9px] text-(--ink-4)">
              {h % 6 === 0 ? h : ''}
            </div>
          ))}
          {DOW_ORDER.map((dow, i) => (
            <div key={dow} className="contents">
              <div className="text-[10px] text-(--ink-3) font-semibold pr-1 flex items-center">{DOW_LABELS[i]}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const n = map.get(`${dow}-${hour}`) ?? 0;
                return (
                  <div
                    key={hour}
                    title={`${DOW_LABELS[i]} ${hour}:00 — ${n} action${n === 1 ? '' : 's'}`}
                    className="aspect-square rounded-[3px]"
                    style={{ background: n === 0 ? 'var(--paper-2)' : `oklch(0.68 0.185 50 / ${0.15 + 0.85 * (n / max)})` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <span className="text-[10px] text-(--ink-4)">less</span>
          {[0.15, 0.35, 0.6, 1].map((a) => (
            <div key={a} className="w-3 h-3 rounded-[3px]" style={{ background: `oklch(0.68 0.185 50 / ${a})` }} />
          ))}
          <span className="text-[10px] text-(--ink-4)">more</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [data,      setData]      = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(false);
  const [range,     setRange]     = useState<Range>('30d');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res  = await fetch(`/api/admin/analytics?range=${range}`, { headers: authHeaders() });
      const json = await res.json();
      if (res.ok && json.data) setData(json.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const RANGES: { key: Range; label: string }[] = [
    { key: '7d', label: '7D' }, { key: '30d', label: '30D' }, { key: '90d', label: '90D' }, { key: 'all', label: 'All' },
  ];

  const rangeChips = (
    <div className="flex gap-1.5 overflow-x-auto">
      {RANGES.map(({ key, label }) => <RangeChip key={key} label={label} on={range === key} onClick={() => setRange(key)} />)}
    </div>
  );

  const refreshBtn = (
    <button
      onClick={load}
      className="w-9 h-9 flex items-center justify-center rounded-full border border-(--border-2) bg-(--surface) text-(--ink-2) cursor-pointer hover:border-(--border-3) transition-[border-color] shrink-0"
    >
      <Refresh size={15} weight={1.8} />
    </button>
  );

  // ── derived ────────────────────────────────────────────────────────────────
  const s = data?.submissions;
  const approvalDelta   = deltaOf(s?.approvalRate ?? null, s?.approvalRatePrev ?? null);
  const turnaroundDelta = deltaOf(s?.avgTurnaroundHours ?? null, s?.avgTurnaroundHoursPrev ?? null);
  const paintersDelta   = deltaOf(data?.kpis.newPainters ?? null, data?.kpis.newPaintersPrev ?? null);

  const painterSpark = (data?.growth ?? []).slice(-30).map((r) => Number(r.painters));
  const loginSpark   = (data?.activity.logins ?? []).slice(-30).map((r) => Number(r.success));

  const genTotal = data ? data.files.genOutcome.ready + data.files.genOutcome.failed + data.files.genOutcome.generating : 0;
  const jobTotal = data ? data.jobs.byStatus.active + data.jobs.byStatus.completed + data.jobs.byStatus.invoiced : 0;

  const funnelData = (s?.funnel ?? []).map((f, i) => ({
    ...f,
    label: `${f.stage} · ${f.n}`,
    fill : [C.accent, C.info, C.approved][i],
  }));
  const inviteFunnelData = data ? [
    { stage: 'Issued',  n: data.invites.issued,  label: `Issued · ${data.invites.issued}`,   fill: C.accent },
    { stage: 'Claimed', n: data.invites.claimed, label: `Claimed · ${data.invites.claimed}`, fill: C.approved },
  ] : [];

  const subStatusPie = s ? [
    { name: 'Approved', value: s.approved, color: C.approved },
    { name: 'Pending',  value: s.pending,  color: C.pending },
    { name: 'Rejected', value: s.rejected, color: C.rejected },
  ].filter((d) => d.value > 0) : [];

  const jobStatusPie = data ? [
    { name: 'Active',    value: data.jobs.byStatus.active,    color: C.approved },
    { name: 'Completed', value: data.jobs.byStatus.completed, color: C.pending },
    { name: 'Invoiced',  value: data.jobs.byStatus.invoiced,  color: C.info },
  ].filter((d) => d.value > 0) : [];

  const genPie = data ? [
    { name: 'Ready',      value: data.files.genOutcome.ready,      color: C.approved },
    { name: 'Failed',     value: data.files.genOutcome.failed,     color: C.rejected },
    { name: 'Generating', value: data.files.genOutcome.generating, color: C.pending },
  ].filter((d) => d.value > 0) : [];

  const notifPie = data ? [
    { name: 'Read',   value: data.notifications.read7d, color: C.approved },
    { name: 'Unread', value: data.notifications.sent7d - data.notifications.read7d, color: C.pending },
  ].filter((d) => d.value > 0) : [];

  const storageData   = (data?.files.storageByType ?? []).map((r) => ({ ...r, name: FILE_LABELS[r.type] ?? r.type }));
  const downloadsData = (data?.files.downloadsByType ?? []).map((r) => ({ ...r, name: FILE_LABELS[r.type] ?? r.type }));
  const maxPainterApproved = Math.max(1, ...(data?.leaderboards.painters ?? []).map((p) => p.approved));
  const maxOwnerSubs       = Math.max(1, ...(data?.leaderboards.owners ?? []).map((o) => o.submissions));

  // ── render ─────────────────────────────────────────────────────────────────

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="m-6 p-4 rounded-(--r-md) text-[13px] font-medium flex items-center justify-between gap-3" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
        Failed to load analytics.
        <button onClick={load} className="h-8 px-3.5 rounded-full text-[12px] font-semibold text-white cursor-pointer" style={{ background: 'var(--rejected)' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-(--paper) min-h-screen">

      {/* ── Mobile top bar ─────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-10 bg-(--paper) border-b border-(--border)">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="text-[22px] font-bold tracking-[-0.025em] text-(--ink)">Analytics</div>
          {refreshBtn}
        </div>
        <div className="px-4 pb-3">{rangeChips}</div>
      </div>

      {/* ── Desktop header ─────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between px-8 pt-8 pb-5 border-b border-(--border)">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.025em] text-(--ink)">Analytics</h1>
          <p className="text-[13px] text-(--ink-3) mt-1">Trends, funnels and activity across the whole platform — {RANGE_LABEL[range]}.</p>
        </div>
        <div className="flex items-center gap-3">
          {rangeChips}
          {refreshBtn}
        </div>
      </div>

      <div className={`px-4 py-4 lg:px-8 lg:py-6 space-y-4 lg:space-y-5 pb-10 ${isLoading ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}>

        {/* 1 ── KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
          <TrendTile
            label="Approval rate" value={fmtPct(s!.approvalRate)} accent={C.approved}
            delta={approvalDelta} sub={`${s!.approved} of ${s!.approved + s!.rejected} decided`}
          />
          <TrendTile
            label="Avg turnaround" value={fmtHours(s!.avgTurnaroundHours)} accent={C.info}
            delta={turnaroundDelta} goodWhenUp={false} sub="submit → approve"
          />
          <TrendTile
            label="New painters" value={data.kpis.newPainters} accent={C.accent}
            delta={paintersDelta} spark={painterSpark} sub={RANGE_LABEL[range]}
          />
          <TrendTile
            label="Active painters" value={data.activity.activePainters7d} accent={C.pending}
            spark={loginSpark} sub="acted in last 7 days"
          />
        </div>

        {/* 2 ── Platform growth */}
        <ChartCard title="Platform growth" sub="New painters, owners, jobs and submissions per day"
          empty={allZero(data.growth, ['painters', 'owners', 'jobs', 'submissions'])}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.growth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={dateTick} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: C.border }} minTickGap={28} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={dateTick} />
              <Area type="monotone" dataKey="submissions" name="Submissions" stroke={C.approved} fill={C.approved} fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="jobs"        name="Jobs"        stroke={C.info}     fill={C.info}     fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="painters"    name="Painters"    stroke={C.accent}   fill={C.accent}   fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="owners"      name="Owners"      stroke={C.pending}  fill={C.pending}  fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <LegendRow items={[
            { label: 'Submissions', color: C.approved }, { label: 'Jobs', color: C.info },
            { label: 'Painters', color: C.accent }, { label: 'Owners', color: C.pending },
          ]} />
        </ChartCard>

        {/* 3 ── Funnel + status donuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          <ChartCard title="Submission pipeline" sub="Created → reviewed → approved" empty={s!.total === 0}>
            <ResponsiveContainer width="100%" height={190}>
              <FunnelChart>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Funnel dataKey="n" nameKey="stage" data={funnelData} isAnimationActive={false}>
                  <LabelList position="center" dataKey="label" fill="#fff" stroke="none" fontSize={11} fontWeight={600} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Submission status" sub={`${s!.total} in ${RANGE_LABEL[range]}`} empty={subStatusPie.length === 0}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Pie data={subStatusPie} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
                  {subStatusPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                  <Label value={fmtPct(s!.approvalRate)} position="center" fill={C.ink} style={{ fontSize: 20, fontWeight: 700 }} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <LegendRow items={subStatusPie.map((d) => ({ label: `${d.name} (${d.value})`, color: d.color }))} />
          </ChartCard>

          <ChartCard title="Job status" badge="all time" empty={jobTotal === 0}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Pie data={jobStatusPie} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
                  {jobStatusPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                  <Label value={jobTotal} position="center" fill={C.ink} style={{ fontSize: 20, fontWeight: 700 }} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <LegendRow items={jobStatusPie.map((d) => ({ label: `${d.name} (${d.value})`, color: d.color }))} />
            {data.jobs.avgDurationDays != null && (
              <div className="text-[11px] text-(--ink-3) mt-2">
                Avg job duration: <span className="font-(--mono) font-bold text-(--ink)">{data.jobs.avgDurationDays.toFixed(1)} days</span>
              </div>
            )}
          </ChartCard>
        </div>

        {/* 4 ── Turnaround + jobs over time */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <ChartCard title="Approval turnaround" sub="How fast owners approve submissions"
            empty={s!.turnaroundBuckets.every((b) => b.n === 0)}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={s!.turnaroundBuckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: C.border }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'oklch(0.965 0.006 75)' }} />
                <Bar dataKey="n" name="Approvals" fill={C.info} radius={[5, 5, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Jobs created vs completed" sub="Per day"
            empty={allZero(data.jobs.createdVsCompleted, ['created', 'completed'])}>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={data.jobs.createdVsCompleted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateTick} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: C.border }} minTickGap={28} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={dateTick} />
                <Line type="monotone" dataKey="created"   name="Created"   stroke={C.accent}   strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke={C.approved} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <LegendRow items={[{ label: 'Created', color: C.accent }, { label: 'Completed', color: C.approved }]} />
          </ChartCard>
        </div>

        {/* 5 ── Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <ChartCard title="Top painters" sub="By approved submissions" empty={data.leaderboards.painters.length === 0}>
            <div>
              {data.leaderboards.painters.map((p) => (
                <BoardRow key={p.id} name={p.name} value={p.approved} max={maxPainterApproved} color={C.approved}
                  detail={`${p.approved} approved · ${p.total} total`} />
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Top owners" sub="By submissions received" empty={data.leaderboards.owners.length === 0}>
            <div>
              {data.leaderboards.owners.map((o) => (
                <BoardRow key={o.id} name={o.name} value={o.submissions} max={maxOwnerSubs} color={C.accent}
                  detail={`${o.jobs} jobs · ${o.submissions} subs · ${fmtGB(o.bytes)}`} />
              ))}
            </div>
          </ChartCard>
        </div>

        {/* 6 ── Storage + generated files */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <ChartCard title="Storage by file type" badge="all time" empty={storageData.length === 0}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={storageData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: C.border }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: unknown) => fmtGB(Number(v))} width={52} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => fmtGB(Number(v))} cursor={{ fill: 'oklch(0.965 0.006 75)' }} />
                <Bar dataKey="bytes" name="Stored" fill={C.accent} radius={[5, 5, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
            {data.files.ownersQuota.length > 0 && (
              <div className="mt-3 pt-3 border-t border-(--border)">
                <div className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.05em] mb-2">Owner quota usage (200 MB each)</div>
                {data.files.ownersQuota.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-[12px] font-semibold text-(--ink) w-28 truncate shrink-0">{o.name}</span>
                    <div className="h-1.5 rounded-full flex-1 overflow-hidden" style={{ background: 'var(--paper-2)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (o.bytes / o.limit) * 100)}%`,
                        background: o.bytes / o.limit > 0.85 ? 'var(--rejected)' : 'var(--accent)',
                      }} />
                    </div>
                    <span className="font-(--mono) text-[11px] text-(--ink-3) shrink-0">{fmtGB(o.bytes)}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Generated files" badge="all time" empty={genTotal === 0}>
            <div className="flex items-center gap-4">
              <div className="w-[140px] shrink-0">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Pie data={genPie} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
                      {genPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                      <Label value={genTotal} position="center" fill={C.ink} style={{ fontSize: 18, fontWeight: 700 }} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {genPie.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[12px] text-(--ink-2)">{d.name}</span>
                    <span className="font-(--mono) text-[12px] font-bold text-(--ink) ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-(--border)">
              <div className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.05em] mb-2">Downloads by type</div>
              {downloadsData.every((d) => d.downloads === 0) ? (
                <div className="text-[12px] text-(--ink-4) py-3 text-center">No downloads yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={downloadsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: C.border }} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'oklch(0.965 0.006 75)' }} />
                    <Bar dataKey="downloads" name="Downloads" fill={C.info} radius={[5, 5, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>

        {/* 7 ── Actions per day */}
        <ChartCard title="Platform activity" sub="State-changing actions per day (logins, submissions, approvals, …) with failures overlaid"
          empty={allZero(data.activity.perDay, ['total'])}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.activity.perDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={dateTick} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: C.border }} minTickGap={28} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={dateTick} />
              <Area type="monotone" dataKey="total"  name="Actions" stroke={C.accent}   fill={C.accent}   fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="failed" name="Failed"  stroke={C.rejected} fill={C.rejected} fillOpacity={0.2}  strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
          <LegendRow items={[{ label: 'Actions', color: C.accent }, { label: 'Failed (4xx/5xx)', color: C.rejected }]} />
        </ChartCard>

        {/* 8 ── Category + logins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <ChartCard title="Actions by category" sub="AUTH, JOB, SUBMISSION, …" empty={data.activity.byCategory.length === 0}>
            <ResponsiveContainer width="100%" height={Math.max(160, data.activity.byCategory.length * 30)}>
              <BarChart data={data.activity.byCategory} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: C.ink3 }} tickLine={false} axisLine={false} width={88} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'oklch(0.965 0.006 75)' }} />
                <Bar dataKey="n" name="Actions" fill={C.accent} radius={[0, 5, 5, 0]} maxBarSize={16}>
                  <LabelList dataKey="n" position="right" fill={C.ink3} fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Logins per day" sub="Successful vs failed sign-ins (password, OTP & invite link)"
            empty={allZero(data.activity.logins, ['success', 'failed'])}>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={data.activity.logins} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateTick} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: C.border }} minTickGap={28} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={dateTick} />
                <Line type="monotone" dataKey="success" name="Successful" stroke={C.approved} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed"  name="Failed"     stroke={C.rejected} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <LegendRow items={[{ label: 'Successful', color: C.approved }, { label: 'Failed', color: C.rejected }]} />
          </ChartCard>
        </div>

        {/* 9 ── Invites + notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <ChartCard title="Invite funnel" sub="WhatsApp invite links issued → claimed" empty={data.invites.issued === 0}>
            <ResponsiveContainer width="100%" height={150}>
              <FunnelChart>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Funnel dataKey="n" nameKey="stage" data={inviteFunnelData} isAnimationActive={false}>
                  <LabelList position="center" dataKey="label" fill="#fff" stroke="none" fontSize={11} fontWeight={600} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
            <div className="flex gap-2 mt-3">
              <StatChip label="Acceptance" value={fmtPct(data.invites.acceptanceRate)} color="var(--approved)" />
              <StatChip label="Revoked" value={data.invites.revoked} />
              <StatChip label="Expired" value={data.invites.expired} color={data.invites.expired > 0 ? 'var(--rejected)' : undefined} />
            </div>
          </ChartCard>

          <ChartCard title="Notification read rate" badge="7 days" sub="In-app notifications expire after a week" empty={data.notifications.sent7d === 0}>
            <div className="flex items-center gap-4">
              <div className="w-[150px] shrink-0">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Pie data={notifPie} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
                      {notifPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                      <Label value={fmtPct(data.notifications.readRate)} position="center" fill={C.ink} style={{ fontSize: 18, fontWeight: 700 }} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <StatChip label="Sent" value={data.notifications.sent7d} />
                <StatChip label="Read" value={data.notifications.read7d} color="var(--approved)" />
              </div>
            </div>
          </ChartCard>
        </div>

        {/* 10 ── Heatmap */}
        <ChartCard title="Activity heatmap" sub="When the platform is busiest — actions by hour and weekday"
          empty={data.activity.heatmap.length === 0}>
          <Heatmap cells={data.activity.heatmap} />
        </ChartCard>

        {/* 11 ── Queues + footer links */}
        <div className="bg-(--surface) border border-(--border) rounded-(--r-md) px-4 lg:px-5 py-3 shadow-(--shadow-sm)">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em]">Queue snapshot</div>
            <Link href="/admin/background-jobs" className="text-[12px] font-semibold no-underline inline-flex items-center gap-1" style={{ color: 'var(--accent-deep)' }}>
              Task queue <ArrowRight size={12} />
            </Link>
          </div>
          <MiniQueueRow name="fileGen"      counts={data.queues.fileGen} />
          <MiniQueueRow name="notify"       counts={data.queues.notify} />
          <MiniQueueRow name="assetCleanup" counts={data.queues.assetCleanup} />
        </div>

        <div className="flex items-center justify-between text-[11px] text-(--ink-4) px-1">
          <Link href="/admin/dashboard" className="no-underline text-(--ink-3) hover:text-(--ink) font-medium">
            ← Live system snapshot
          </Link>
          <span className="font-(--mono)">
            generated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
