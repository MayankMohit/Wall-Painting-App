'use client';

import { useState, useEffect, useCallback } from 'react';
import { Refresh, Activity } from '@/components/admin/icons';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BullJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  state: string;
  progress: number;
  attempts: number;
  failedReason?: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
}

interface QueueStats {
  fileGen:      Record<string, number>;
  notify:       Record<string, number>;
  assetCleanup: Record<string, number>;
}

type QueueName = 'fileGen' | 'notify' | 'assetCleanup';
type JobState  = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { Authorization: `Bearer ${token}` };
}

function fmtTime(ms?: number) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATE_STYLE: Record<JobState, { bg: string; color: string }> = {
  failed:    { bg: 'var(--rejected-soft)',  color: 'var(--rejected)'  },
  active:    { bg: 'var(--accent-soft,oklch(0.96 0.06 60))', color: 'var(--accent-deep)' },
  completed: { bg: 'var(--approved-soft)',  color: 'var(--approved)'  },
  waiting:   { bg: 'var(--paper-2)',        color: 'var(--ink-3)'     },
  delayed:   { bg: 'var(--pending-soft)',   color: 'var(--pending)'   },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatTile({ queue, counts, active }: { queue: string; counts: Record<string, number>; active: boolean }) {
  const waiting  = counts.waiting  ?? 0;
  const runCount = counts.active   ?? 0;
  const failed   = counts.failed   ?? 0;
  return (
    <div
      className="flex-1 bg-(--surface) border rounded-(--r-md) p-4 shadow-(--shadow-sm)"
      style={{ borderColor: active ? 'var(--ink)' : 'var(--border)' }}
    >
      <div className="text-[11px] font-bold uppercase tracking-[.06em] text-(--ink-3) mb-2">{queue}</div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Active',  v: runCount, c: runCount > 0  ? 'var(--accent-deep)' : 'var(--ink-3)' },
          { l: 'Waiting', v: waiting,  c: waiting > 0   ? 'var(--ink)'         : 'var(--ink-3)' },
          { l: 'Failed',  v: failed,   c: failed > 0    ? 'var(--rejected)'    : 'var(--ink-3)' },
        ].map((s) => (
          <div key={s.l}>
            <div className="font-(--mono) text-[22px] font-bold" style={{ color: s.c }}>{s.v}</div>
            <div className="text-[10px] text-(--ink-3) uppercase tracking-[.04em] mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminQueuePage() {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [jobs,       setJobs]       = useState<BullJob[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);
  const [queue,      setQueue]      = useState<QueueName>('fileGen');
  const [state,      setState]      = useState<JobState>('failed');

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res  = await fetch('/api/admin/background-jobs', { headers: authHeaders() });
      const json = await res.json();
      if (res.ok) setQueueStats(json.data ?? json);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setJobs([]);
    try {
      const res  = await fetch(`/api/admin/jobs?queue=${queue}&state=${state}`, { headers: authHeaders() });
      const json = await res.json();
      if (res.ok) setJobs(json.data ?? json ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [queue, state]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchJobs();  }, [fetchJobs]);

  const handleRetry = async (jobId: string) => {
    setIsRetryingId(jobId);
    try {
      await fetch(`/api/admin/background-jobs/${jobId}/retry?queue=${queue}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } finally {
      setIsRetryingId(null);
    }
  };

  const QUEUES: { key: QueueName; label: string }[] = [
    { key: 'fileGen',      label: 'fileGen'      },
    { key: 'notify',       label: 'notify'       },
    { key: 'assetCleanup', label: 'assetCleanup' },
  ];
  const STATES: { key: JobState; label: string }[] = [
    { key: 'failed',    label: 'Failed'    },
    { key: 'active',    label: 'Active'    },
    { key: 'waiting',   label: 'Waiting'   },
    { key: 'completed', label: 'Completed' },
    { key: 'delayed',   label: 'Delayed'   },
  ];

  return (
    <div className="bg-(--paper) min-h-screen">

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border) px-4 py-3 flex items-center justify-between">
          <div className="text-[20px] font-bold tracking-[-0.025em] text-(--ink)">Task Queue</div>
          <button onClick={() => { fetchStats(); fetchJobs(); }} className="w-9 h-9 flex items-center justify-center rounded-full border border-(--border-2) text-(--ink-2) cursor-pointer">
            <Refresh size={16} weight={1.8} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Stats tiles */}
          {!statsLoading && queueStats && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUEUES.map(({ key, label }) => (
                <StatTile key={key} queue={label} counts={queueStats[key] ?? {}} active={queue === key} />
              ))}
            </div>
          )}

          {/* Queue + state selectors */}
          <div className="space-y-2">
            <div>
              <div className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-1.5">Queue</div>
              <div className="flex gap-1.5 flex-wrap">
                {QUEUES.map(({ key, label }) => <Chip key={key} label={label} on={queue === key} onClick={() => setQueue(key)} />)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-1.5">State</div>
              <div className="flex gap-1.5 flex-wrap">
                {STATES.map(({ key, label }) => <Chip key={key} label={label} on={state === key} onClick={() => setState(key)} />)}
              </div>
            </div>
          </div>

          {/* Job cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-(--ink-3)">No {state} jobs in {queue} queue.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.map((job) => {
                const s = STATE_STYLE[state as JobState] ?? STATE_STYLE.waiting;
                return (
                  <div key={job.id} className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4 shadow-(--shadow-sm)">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-(--mono) text-[12px] font-semibold bg-(--paper-2) px-2 py-0.5 rounded text-(--ink)">{job.name}</span>
                          <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>{state}</span>
                        </div>
                        <div className="font-(--mono) text-[11px] text-(--ink-4) truncate">ID: {job.id}</div>
                        {job.failedReason && (
                          <div className="text-[11px] font-(--mono) px-2.5 py-1.5 rounded-(--r) text-(--rejected) line-clamp-2" style={{ background: 'var(--rejected-soft)' }}>
                            {job.failedReason}
                          </div>
                        )}
                        {job.progress > 0 && (
                          <>
                            <div className="h-[3px] bg-(--paper-2) rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${job.progress}%`, background: 'var(--accent)' }} />
                            </div>
                            <div className="font-(--mono) text-[11px] text-(--ink-3)">{job.progress}% complete</div>
                          </>
                        )}
                        <div className="font-(--mono) text-[11px] text-(--ink-3)">
                          {job.attempts} attempt{job.attempts !== 1 ? 's' : ''}
                          {job.processedOn ? ` · started ${fmtTime(job.processedOn)}` : ''}
                        </div>
                      </div>
                      {state === 'failed' && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          disabled={isRetryingId !== null}
                          className="h-8 px-3 rounded-full text-[12px] font-semibold text-white cursor-pointer disabled:opacity-40 shrink-0"
                          style={{ background: 'var(--ink)' }}
                        >
                          {isRetryingId === job.id ? '…' : 'Retry'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-(--border)">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.025em] text-(--ink)">Task Queue Inspector</h1>
            <p className="text-[13px] text-(--ink-3) mt-1">Real-time status of BullMQ background jobs across all queues.</p>
          </div>
          <button
            onClick={() => { fetchStats(); fetchJobs(); }}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-(--border-2) bg-(--surface) text-[13px] font-semibold text-(--ink-2) cursor-pointer hover:border-(--border-3) transition-[border-color]"
          >
            <Refresh size={14} weight={2} /> Refresh
          </button>
        </div>

        <div className="px-8 py-5">
          {/* Stats tiles */}
          {!statsLoading && queueStats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {QUEUES.map(({ key, label }) => (
                <StatTile key={key} queue={label} counts={queueStats[key] ?? {}} active={queue === key} />
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-6 mb-5">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em]">Queue</div>
              <div className="flex gap-1.5">
                {QUEUES.map(({ key, label }) => <Chip key={key} label={label} on={queue === key} onClick={() => setQueue(key)} />)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em]">State</div>
              <div className="flex gap-1.5">
                {STATES.map(({ key, label }) => <Chip key={key} label={label} on={state === key} onClick={() => setState(key)} />)}
              </div>
            </div>
          </div>

          {/* Job list */}
          <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm)">
            {isLoading ? (
              <div className="p-16 text-center animate-pulse text-[13px] text-(--ink-4)">Inspecting queue…</div>
            ) : jobs.length === 0 ? (
              <div className="p-16 text-center text-[13px] text-(--ink-3)">No {state} jobs in {queue} queue.</div>
            ) : (
              <div className="divide-y divide-(--border)">
                {jobs.map((job) => {
                  const s = STATE_STYLE[state as JobState] ?? STATE_STYLE.waiting;
                  return (
                    <div key={job.id} className="px-6 py-4 flex items-start gap-6 hover:bg-(--paper-2) transition-colors">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-(--mono) text-[13px] font-bold bg-(--paper-2) px-2 py-0.5 rounded text-(--ink)">{job.name}</span>
                          <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>{state}</span>
                          <span className="font-(--mono) text-[11px] text-(--ink-4)">ID: {job.id}</span>
                        </div>
                        {job.failedReason && (
                          <div className="text-[12px] font-(--mono) px-3 py-2 rounded-(--r) text-(--rejected) max-w-2xl" style={{ background: 'var(--rejected-soft)' }}>
                            {job.failedReason}
                          </div>
                        )}
                        <div className="font-(--mono) text-[12px] text-(--ink-3)">
                          {job.attempts} attempt{job.attempts !== 1 ? 's' : ''}
                          {job.progress > 0 ? ` · ${job.progress}% complete` : ''}
                          {job.timestamp ? ` · created ${fmtTime(job.timestamp)}` : ''}
                          {job.processedOn ? ` · started ${fmtTime(job.processedOn)}` : ''}
                        </div>
                        {job.progress > 0 && (
                          <div className="h-1.5 w-64 bg-(--paper-2) rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${job.progress}%`, background: 'var(--accent)' }} />
                          </div>
                        )}
                      </div>
                      {state === 'failed' && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          disabled={isRetryingId !== null}
                          className="h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer disabled:opacity-40 shrink-0"
                          style={{ background: 'var(--ink)' }}
                        >
                          {isRetryingId === job.id ? 'Dispatching…' : 'Retry Task'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
