'use client';

import { useState, useEffect, useCallback } from 'react';

interface IAuditLog {
  _id: string;
  requestId: string;
  userId?: string;
  userRole?: string;
  action: string;
  resource?: { type: string; id: string };
  ip: string;
  userAgent?: string;
  statusCode: number;
  duration: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

type Severity  = 'INFO' | 'WARN' | 'ERROR';
type SevFilter = 'ALL' | Severity;

function getSeverity(code: number): Severity {
  if (code >= 500) return 'ERROR';
  if (code >= 400) return 'WARN';
  return 'INFO';
}

// ---------- helpers ----------

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseUA(ua?: string): string {
  if (!ua) return '';
  if (ua.includes('curl'))           return 'curl';
  if (ua.includes('Postman'))        return 'Postman';
  if (ua.includes('Edg'))            return 'Edge';
  if (ua.includes('Firefox'))        return 'Firefox';
  if (ua.includes('Chrome'))         return 'Chrome';
  if (ua.includes('Safari'))         return 'Safari';
  return 'Browser';
}

const ACTION_SOURCE: Record<string, string> = {
  AUTH_LOGIN:                'auth.signin',
  AUTH_LOGIN_OTP:            'auth.otp',
  AUTH_LOGIN_PHONE:          'auth.phone',
  AUTH_REGISTER:             'auth.register',
  AUTH_FORGOT_PASSWORD:      'auth.forgot',
  AUTH_RESET_PASSWORD:       'auth.reset',
  AUTH_LOGOUT:               'auth.logout',
  AUTH_VERIFY_EMAIL_SEND:    'auth.email.verify',
  AUTH_VERIFY_EMAIL_CONFIRM: 'auth.email.confirm',
  AUTH_CHANGE_EMAIL_SEND:    'auth.email.change',
  AUTH_CHANGE_EMAIL_CONFIRM: 'auth.email.changed',
  AUTH_CHANGE_PASSWORD:      'auth.passwd',
  ADMIN_STATS_VIEW:          'admin.stats',
  ADMIN_LOGS_VIEW:           'admin.logs',
  ADMIN_JOBS_VIEW:           'admin.jobs',
  ADMIN_JOB_RETRY:           'admin.jobs.retry',
  ADMIN_STORAGE_VIEW:        'admin.storage',
  ADMIN_QUEUE_STATS_VIEW:    'admin.queue',
  ADMIN_QUEUE_ACTION:        'admin.queue.ctrl',
  ADMIN_USER_APPROVE:        'admin.user.approve',
  ADMIN_USER_REJECT:         'admin.user.reject',
  ADMIN_USER_SUSPEND:        'admin.user.suspend',
  ADMIN_USER_UPDATE:         'admin.user.update',
};

function source(action: string): string {
  return ACTION_SOURCE[action] ?? action.toLowerCase().replace(/_/g, '.').slice(0, 24);
}

function buildMessage(log: IAuditLog): string {
  const m      = log.metadata ?? {};
  const role   = log.userRole ?? 'user';
  const failed = log.statusCode >= 400;
  const ua     = parseUA(log.userAgent);
  const uid    = log.resource?.id ?? (m.userId as string) ?? '';

  switch (log.action) {
    case 'AUTH_LOGIN':
      return failed
        ? `Login failed — invalid credentials · via ${ua || 'unknown client'}`
        : `${cap(role)} signed in via password · ${ua}`;
    case 'AUTH_LOGIN_OTP':
      return failed
        ? `Email OTP login failed — invalid or expired code`
        : `${cap(role)} signed in via email OTP · ${ua}`;
    case 'AUTH_LOGIN_PHONE':
      return failed
        ? `Phone OTP login failed — Firebase token rejected`
        : `${cap(role)} signed in via phone OTP · ${ua}`;
    case 'AUTH_REGISTER':
      return `New ${cap((m.role as string) ?? role)} account created · email verified: ${m.role === 'owner' ? 'yes (OTP)' : 'no'} · phone verified: yes`;
    case 'AUTH_FORGOT_PASSWORD':
      return `Password reset link emailed to account`;
    case 'AUTH_RESET_PASSWORD':
      return failed
        ? `Password reset failed — token invalid or expired`
        : `Password reset successfully`;
    case 'AUTH_CHANGE_PASSWORD':
      return `Password changed by ${cap(role)}`;
    case 'AUTH_VERIFY_EMAIL_SEND':
      return `Email verification OTP sent`;
    case 'AUTH_VERIFY_EMAIL_CONFIRM':
      return `Email address verified via OTP`;
    case 'AUTH_CHANGE_EMAIL_SEND':
      return `Email change OTP sent to new address`;
    case 'AUTH_CHANGE_EMAIL_CONFIRM':
      return `Email address updated successfully`;
    case 'ADMIN_USER_APPROVE':
      return `Owner account approved${uid ? ` · user ${uid.slice(-6)}` : ''}`;
    case 'ADMIN_USER_REJECT':
      return `Owner account rejected · reason: ${(m.reason as string) || 'not specified'}`;
    case 'ADMIN_USER_SUSPEND':
      return `Account suspended · reason: ${(m.reason as string) || 'not specified'}`;
    case 'ADMIN_USER_UPDATE':
      return `User account updated${uid ? ` · ID …${uid.slice(-6)}` : ''}`;
    case 'ADMIN_JOB_RETRY':
      return `Background job manually retried · queue: ${m.queue ?? '—'} · job: ${log.resource?.id?.slice(0, 12) ?? '—'}`;
    case 'ADMIN_QUEUE_ACTION':
      return `Queue "${m.queue ?? '—'}" ${m.action ?? 'action'} by admin`;
    case 'ADMIN_STATS_VIEW':
      return 'Admin dashboard stats viewed';
    case 'ADMIN_LOGS_VIEW':
      return 'Audit log viewer opened';
    case 'ADMIN_STORAGE_VIEW':
      return 'Storage & CDN report accessed';
    case 'ADMIN_QUEUE_STATS_VIEW':
      return 'BullMQ queue stats accessed';
    default: {
      return log.action.split('_').map(cap).join(' ');
    }
  }
}

// ---------- style maps ----------

const SEV_STYLE: Record<Severity, { badge: string; row: string }> = {
  INFO:  { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',       row: '' },
  WARN:  { badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', row: 'bg-yellow-500/[0.03]' },
  ERROR: { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',          row: 'bg-red-500/[0.04]' },
};

const ROLE_STYLE: Record<string, string> = {
  admin:   'text-teal-400   bg-teal-500/10   border border-teal-500/30',
  owner:   'text-purple-400 bg-purple-500/10 border border-purple-500/30',
  painter: 'text-sky-400    bg-sky-500/10    border border-sky-500/30',
};

// ---------- utils ----------

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    timeZone:  'Asia/Kolkata',
    day:       '2-digit',
    month:     'short',
    year:      'numeric',
    hour:      '2-digit',
    minute:    '2-digit',
    second:    '2-digit',
    hour12:    true,
  });
}

function exportCSV(rows: IAuditLog[]) {
  const cols = ['timestamp_ist', 'severity', 'action', 'source', 'description', 'userId', 'userRole', 'statusCode', 'duration_ms', 'ip', 'requestId'];
  const csv  = [
    cols.join(','),
    ...rows.map(l =>
      [fmtTs(l.timestamp), getSeverity(l.statusCode), l.action, source(l.action),
       buildMessage(l), l.userId ?? '', l.userRole ?? '', l.statusCode, l.duration, l.ip, l.requestId]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: `audit-logs-${Date.now()}.csv`,
  });
  a.click();
}

// ---------- component ----------

export default function AdminLogsPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;

  const [logs,        setLogs]        = useState<IAuditLog[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [pages,       setPages]       = useState(1);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState('');
  const [sevFilter,   setSevFilter]   = useState<SevFilter>('ALL');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchLogs = useCallback(async (pg: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '50' });
      const res    = await fetch(`/api/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        setLogs(json.data.logs  ?? []);
        setTotal(json.data.total ?? 0);
        setPage(json.data.page   ?? 1);
        setPages(json.data.pages ?? 1);
        setLastFetched(new Date());
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const q         = search.trim().toLowerCase();
  const displayed = logs.filter(l => {
    const matchSev = sevFilter === 'ALL' || getSeverity(l.statusCode) === sevFilter;
    const matchQ   = !q ||
      l.action.toLowerCase().includes(q) ||
      source(l.action).includes(q) ||
      buildMessage(l).toLowerCase().includes(q) ||
      (l.ip ?? '').includes(q) ||
      (l.userRole ?? '').includes(q);
    return matchSev && matchQ;
  });

  const counts = {
    info:  logs.filter(l => getSeverity(l.statusCode) === 'INFO').length,
    warn:  logs.filter(l => getSeverity(l.statusCode) === 'WARN').length,
    error: logs.filter(l => getSeverity(l.statusCode) === 'ERROR').length,
  };

  const tabs: [SevFilter, string, number | string][] = [
    ['ALL',   'All',   total],
    ['INFO',  'INFO',  counts.info],
    ['WARN',  'WARN',  counts.warn],
    ['ERROR', 'ERROR', counts.error],
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Logs</h1>
          <p className="text-slate-400 text-sm mt-1">
            {lastFetched
              ? `Last fetched ${lastFetched.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })} IST · ${total.toLocaleString()} total records`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search action, IP, role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition"
          />
          <button
            onClick={() => fetchLogs(page)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading && logs.length > 0 ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={() => exportCSV(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Severity filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(([sev, label, count]) => {
          const active =
            sev === 'ALL'   ? 'bg-slate-900 text-white' :
            sev === 'INFO'  ? 'bg-blue-500 text-white' :
            sev === 'WARN'  ? 'bg-yellow-400 text-slate-900' :
                              'bg-red-500 text-white';
          return (
            <button
              key={sev}
              onClick={() => setSevFilter(sev)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                sevFilter === sev ? active : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}: {count}
            </button>
          );
        })}
      </div>

      {/* Log panel */}
      <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">

        {/* Column header */}
        <div className="flex items-center gap-8 px-6 py-2.5 border-b border-slate-700/80 bg-slate-900">
          <span className="w-14 shrink-0 text-slate-500 font-mono text-[10px] uppercase tracking-widest">Level</span>
          <span className="w-48 shrink-0 text-slate-500 font-mono text-[10px] uppercase tracking-widest">Timestamp (IST)</span>
          <span className="w-44 shrink-0 text-slate-500 font-mono text-[10px] uppercase tracking-widest">Source</span>
          <span className="flex-1   text-slate-500 font-mono text-[10px] uppercase tracking-widest">Description</span>
          <span className="w-20 shrink-0 text-slate-500 font-mono text-[10px] uppercase tracking-widest">Role</span>
          <span className="w-28 shrink-0 text-slate-500 font-mono text-[10px] uppercase tracking-widest">IP Address</span>
          <span className="w-16 shrink-0 text-right text-slate-500 font-mono text-[10px] uppercase tracking-widest">Latency</span>
        </div>

        {isLoading && logs.length === 0 ? (
          <div className="p-20 text-center text-slate-600 font-mono text-sm animate-pulse">
            reading audit pipeline…
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-20 text-center text-slate-600 font-mono text-sm">
            no log entries found
          </div>
        ) : (
          <div className={`divide-y divide-slate-800/60 transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {displayed.map(log => {
              const sev   = getSeverity(log.statusCode);
              const style = SEV_STYLE[sev];
              const roleStyle = ROLE_STYLE[log.userRole ?? ''] ?? 'text-slate-500 bg-slate-800 border border-slate-700';
              return (
                <div
                  key={log._id}
                  className={`flex items-center gap-8 px-6 py-3 hover:bg-slate-800/40 transition-colors ${style.row}`}
                >
                  {/* Severity */}
                  <span className={`w-14 shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${style.badge}`}>
                    {sev}
                  </span>

                  {/* Timestamp IST */}
                  <span className="w-48 shrink-0 text-slate-400 font-mono text-xs leading-tight">
                    {fmtTs(log.timestamp)}
                  </span>

                  {/* Source */}
                  <span className="w-44 shrink-0 text-slate-300 font-mono text-xs truncate" title={log.action}>
                    {source(log.action)}
                  </span>

                  {/* Description */}
                  <span className="flex-1 text-slate-200 text-sm leading-snug">
                    {buildMessage(log)}
                  </span>

                  {/* Role */}
                  <span className={`w-20 shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${roleStyle}`}>
                    {log.userRole ?? '—'}
                  </span>

                  {/* IP */}
                  <span className="w-28 shrink-0 text-slate-500 font-mono text-xs truncate" title={log.ip}>
                    {log.ip}
                  </span>

                  {/* Latency */}
                  <span className="w-16 shrink-0 text-right text-slate-600 font-mono text-xs">
                    {log.duration}ms
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-slate-500">
            Page {page} of {pages} · {total.toLocaleString()} records
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= pages || isLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
