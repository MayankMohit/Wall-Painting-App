'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IAuditLog {
  _id: string;
  requestId: string;
  userId?: string;
  userName?: string;
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
type Category  = 'all' | 'auth' | 'jobs' | 'submissions' | 'admin' | 'user' | 'photos';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSeverity(code: number): Severity {
  if (code >= 500) return 'ERROR';
  if (code >= 400) return 'WARN';
  return 'INFO';
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function parseUA(ua?: string): string {
  if (!ua) return '';
  if (ua.includes('curl'))    return 'curl';
  if (ua.includes('Postman')) return 'Postman';
  if (ua.includes('Edg'))     return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome'))  return 'Chrome';
  if (ua.includes('Safari'))  return 'Safari';
  return 'Browser';
}

function actionCategory(action: string): Category {
  if (action.startsWith('AUTH_'))       return 'auth';
  if (action.startsWith('JOB_'))        return 'jobs';
  if (action.startsWith('SUBMISSION_')) return 'submissions';
  if (action.startsWith('ADMIN_'))      return 'admin';
  if (action.startsWith('USER_'))       return 'user';
  if (action.startsWith('PHOTO_'))      return 'photos';
  return 'all';
}

function actionLabel(action: string): string {
  return action.split('_').map(cap).join(' ');
}

function buildMessage(log: IAuditLog): string {
  const m       = log.metadata ?? {};
  const role    = log.userRole ?? 'user';
  const failed  = log.statusCode >= 400;
  const ua      = parseUA(log.userAgent);
  const company = (m.companyName as string) ?? '';
  const photoNo = (m.photoNo as string | number) ?? '';

  switch (log.action) {
    case 'AUTH_LOGIN':
      return failed
        ? `Login failed — invalid credentials${ua ? ` · ${ua}` : ''}`
        : `${cap(role)} signed in via password${ua ? ` · ${ua}` : ''}`;
    case 'AUTH_LOGIN_OTP':
      return failed
        ? 'Email OTP login failed — invalid or expired code'
        : `${cap(role)} signed in via email OTP${ua ? ` · ${ua}` : ''}`;
    case 'AUTH_LOGIN_PHONE':
      return failed
        ? 'Phone OTP login failed — Firebase token rejected'
        : `${cap(role)} signed in via phone OTP${ua ? ` · ${ua}` : ''}`;
    case 'AUTH_REGISTER':
      return `New ${cap((m.role as string) ?? role)} account registered`;
    case 'AUTH_FORGOT_PASSWORD':
      return 'Password reset link sent';
    case 'AUTH_RESET_PASSWORD':
      return failed ? 'Password reset failed — token invalid or expired' : 'Password reset successfully';
    case 'AUTH_CHANGE_PASSWORD':
    case 'USER_CHANGE_PASSWORD':
      return 'Password changed';
    case 'AUTH_VERIFY_EMAIL_SEND':
    case 'AUTH_VERIFY_EMAIL_CONFIRM':
    case 'USER_VERIFY_EMAIL':
      return 'Email address verified';
    case 'AUTH_CHANGE_EMAIL_SEND':
    case 'USER_CHANGE_EMAIL_REQUEST':
      return 'Email change OTP sent to new address';
    case 'AUTH_CHANGE_EMAIL_CONFIRM':
    case 'USER_CHANGE_EMAIL_CONFIRM':
      return 'Email address updated';
    case 'AUTH_LOGOUT':
      return `${cap(role)} signed out`;
    case 'USER_UPDATE_PROFILE':
      return 'Profile updated';
    case 'USER_UPDATE_NOTIFICATION_PREFS':
      return 'Notification preferences updated';
    case 'ADMIN_USER_APPROVE':
      return `Owner account approved${log.resource?.id ? ` · …${log.resource.id.slice(-6)}` : ''}`;
    case 'ADMIN_USER_REJECT':
      return `Owner account rejected · reason: ${(m.reason as string) || 'not specified'}`;
    case 'ADMIN_USER_SUSPEND':
      return `Account suspended · reason: ${(m.reason as string) || 'not specified'}`;
    case 'ADMIN_USER_ACTIVATE':
      return 'Account re-activated';
    case 'ADMIN_USER_UPDATE':
    case 'ADMIN_UPDATE_USER':
      return 'User account updated';
    case 'ADMIN_USER_VIEW':
    case 'ADMIN_USERS_VIEW':
      return 'User directory accessed';
    case 'ADMIN_DEACTIVATE_USER':
      return 'User account deactivated';
    case 'ADMIN_JOB_RETRY':
      return `Background job retried · queue: ${m.queue ?? '—'}`;
    case 'ADMIN_QUEUE_ACTION':
      return `Queue "${m.queue ?? '—'}" ${m.action ?? 'action'} by admin`;
    case 'ADMIN_STATS_VIEW':         return 'Dashboard stats viewed';
    case 'ADMIN_LOGS_VIEW':          return 'Audit log viewer opened';
    case 'ADMIN_STORAGE_VIEW':       return 'Storage report accessed';
    case 'ADMIN_QUEUE_STATS_VIEW':   return 'Queue stats accessed';
    case 'ADMIN_JOBS_VIEW':          return 'Background jobs viewed';
    case 'JOB_CREATE':
      return `Job created${company ? ` · ${company}` : ''}`;
    case 'JOB_UPDATE':
      return `Job updated${company ? ` · ${company}` : ''}`;
    case 'JOB_DELETE':
      return `Job deleted${company ? ` · ${company}` : ''}`;
    case 'JOB_PAINTER_ADD':
      return `Painter assigned to job${company ? ` · ${company}` : ''}`;
    case 'JOB_PAINTER_REMOVE':
      return `Painter removed from job${company ? ` · ${company}` : ''}`;
    case 'SUBMISSION_CREATE':
      return `Submission created${company ? ` · ${company}` : ''}${photoNo ? ` · #${photoNo}` : ''}`;
    case 'SUBMISSION_UPDATE':
      return `Submission updated${photoNo ? ` · #${photoNo}` : ''}`;
    case 'SUBMISSION_DELETE':
      return `Submission deleted${photoNo ? ` · #${photoNo}` : ''}`;
    case 'SUBMISSION_APPROVE':
      return `Submission approved${photoNo ? ` · #${photoNo}` : ''}${m.keptCount ? ` · ${m.keptCount} photo(s) kept` : ''}`;
    case 'SUBMISSION_REJECT':
      return `Submission rejected${photoNo ? ` · #${photoNo}` : ''}${m.reason ? ` · ${m.reason}` : ''}`;
    case 'SUBMISSION_REVOKE':
      return `Submission approval revoked${photoNo ? ` · #${photoNo}` : ''}`;
    case 'PHOTO_DELETE':
      return 'Photo deleted from submission';
    case 'NOTIFICATION_READ_ALL':
      return 'All notifications marked as read';
    default:
      return log.action.split('_').map(cap).join(' ');
  }
}

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

function fmtTsShort(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
    hour12: true,
  });
}

function exportCSV(rows: IAuditLog[]) {
  const cols = ['timestamp_ist', 'severity', 'action', 'description', 'userName', 'userId', 'userRole', 'statusCode', 'duration_ms', 'ip', 'requestId'];
  const csv  = [
    cols.join(','),
    ...rows.map(l =>
      [fmtTs(l.timestamp), getSeverity(l.statusCode), l.action,
       buildMessage(l), l.userName ?? '', l.userId ?? '', l.userRole ?? '',
       l.statusCode, l.duration, l.ip, l.requestId]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: `audit-logs-${Date.now()}.csv`,
  });
  a.click();
}

// ── Style maps ────────────────────────────────────────────────────────────────

const SEV_DOT: Record<Severity, string> = {
  INFO:  'oklch(0.65 0.18 145)',
  WARN:  'oklch(0.7 0.16 80)',
  ERROR: 'var(--rejected)',
};

const SEV_BADGE: Record<Severity, string> = {
  INFO:  'bg-(--approved-soft) text-(--approved)',
  WARN:  'bg-(--pending-soft) text-(--pending)',
  ERROR: 'bg-(--rejected-soft) text-(--rejected)',
};

const CAT_COLOR: Record<string, string> = {
  auth:        'oklch(0.5 0.14 240)',
  jobs:        'var(--accent)',
  submissions: 'oklch(0.55 0.16 145)',
  admin:       'oklch(0.5 0.13 295)',
  user:        'oklch(0.55 0.12 50)',
  photos:      'oklch(0.55 0.14 20)',
  all:         'var(--ink-3)',
};

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-(--approved-soft) text-(--approved)',
  owner:   'text-purple-500 bg-purple-500/10',
  painter: 'text-sky-500 bg-sky-500/10',
};

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'auth',        label: 'Auth' },
  { value: 'jobs',        label: 'Jobs' },
  { value: 'submissions', label: 'Submissions' },
  { value: 'admin',       label: 'Admin' },
  { value: 'user',        label: 'User' },
  { value: 'photos',      label: 'Photos' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLogsPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;

  const [logs,        setLogs]        = useState<IAuditLog[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [pages,       setPages]       = useState(1);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState('');
  const [sevFilter,   setSevFilter]   = useState<SevFilter>('ALL');
  const [category,    setCategory]    = useState<Category>('all');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchLogs = useCallback(async (pg: number, cat: Category, from: string, to: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '50' });
      if (cat !== 'all') params.set('category', cat);
      if (from) params.set('from', new Date(from).toISOString());
      if (to)   params.set('to',   new Date(to + 'T23:59:59').toISOString());
      const res  = await fetch(`/api/admin/logs?${params}`, {
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

  useEffect(() => { fetchLogs(1, category, fromDate, toDate); }, [fetchLogs, category, fromDate, toDate]);

  const q = search.trim().toLowerCase();
  const displayed = logs.filter(l => {
    const matchSev = sevFilter === 'ALL' || getSeverity(l.statusCode) === sevFilter;
    const matchQ   = !q ||
      l.action.toLowerCase().includes(q) ||
      buildMessage(l).toLowerCase().includes(q) ||
      (l.ip ?? '').includes(q) ||
      (l.userRole ?? '').includes(q) ||
      (l.userName ?? '').toLowerCase().includes(q);
    return matchSev && matchQ;
  });

  const counts = {
    info:  logs.filter(l => getSeverity(l.statusCode) === 'INFO').length,
    warn:  logs.filter(l => getSeverity(l.statusCode) === 'WARN').length,
    error: logs.filter(l => getSeverity(l.statusCode) === 'ERROR').length,
  };

  const tabs: [SevFilter, string, number | string][] = [
    ['ALL',   'All',   total],
    ['INFO',  'Info',  counts.info],
    ['WARN',  'Warn',  counts.warn],
    ['ERROR', 'Error', counts.error],
  ];

  return (
    <div className="bg-(--paper) min-h-screen px-4 py-6 lg:px-8 lg:py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-(--border) pb-5 mb-5">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.025em] text-(--ink)">Audit Logs</h1>
          <p className="text-[13px] text-(--ink-3) mt-1">
            {lastFetched
              ? `${total.toLocaleString()} records · last fetched ${lastFetched.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchLogs(page, category, fromDate, toDate)}
            disabled={isLoading}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-(--border-2) bg-(--surface) text-[13px] font-semibold text-(--ink-2) hover:border-(--border-3) disabled:opacity-50 transition-[border-color] cursor-pointer"
          >
            <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0 1 15.7-3.7M20 15a9 9 0 0 1-15.7 3.7" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => exportCSV(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-(--ink) text-white text-[13px] font-semibold hover:opacity-85 disabled:opacity-40 transition-opacity cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4 mb-5 space-y-3">
        {/* Category pills + search */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => { setCategory(c.value); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer"
              style={
                category === c.value
                  ? { background: CAT_COLOR[c.value], color: '#fff' }
                  : { background: 'var(--paper-2)', color: 'var(--ink-2)' }
              }
            >
              {c.label}
            </button>
          ))}
          <div className="flex-1 min-w-[160px] h-9 bg-(--paper-2) border border-(--border) rounded-(--r) flex items-center gap-2 px-3">
            <svg className="w-3.5 h-3.5 shrink-0 text-(--ink-4)" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search description, user, IP…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-[13px] text-(--ink) placeholder:text-(--ink-4)"
            />
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-(--ink-3)">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="h-8 px-2 rounded-(--r) border border-(--border) bg-(--paper-2) text-[12px] text-(--ink) outline-none focus:border-(--ink)"
          />
          <span className="text-[12px] font-medium text-(--ink-3)">To</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="h-8 px-2 rounded-(--r) border border-(--border) bg-(--paper-2) text-[12px] text-(--ink) outline-none focus:border-(--ink)"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="text-[12px] text-(--ink-3) hover:text-(--rejected) transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Severity tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {tabs.map(([sev, label, count]) => (
          <button
            key={sev}
            onClick={() => setSevFilter(sev)}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors cursor-pointer"
            style={
              sevFilter === sev
                ? { background: 'var(--ink)', color: '#fff' }
                : { background: 'var(--paper-2)', color: 'var(--ink-2)' }
            }
          >
            {label} · {count}
          </button>
        ))}
      </div>

      {/* Log list */}
      {isLoading && logs.length === 0 ? (
        <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-16 text-center animate-pulse text-[13px] text-(--ink-4)">
          Loading audit logs…
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-16 text-center text-[13px] text-(--ink-4)">
          No log entries match your filters.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`hidden lg:block bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm) transition-opacity duration-150 ${isLoading ? 'opacity-50' : ''}`}>
            <div
              className="grid gap-4 px-5 py-2.5 border-b border-(--border) bg-(--paper-2) text-[10px] font-bold uppercase tracking-[.05em] text-(--ink-3)"
              style={{ gridTemplateColumns: '72px 148px 1fr 164px 112px' }}
            >
              <div>Level</div><div>Timestamp</div><div>Event</div><div>User</div><div>IP</div>
            </div>
            {displayed.map(log => {
              const sev      = getSeverity(log.statusCode);
              const cat      = actionCategory(log.action);
              const catColor = CAT_COLOR[cat];
              const userName = log.userName ?? (log.userId ? `…${log.userId.slice(-6)}` : null);
              return (
                <div
                  key={log._id}
                  className="grid gap-4 px-5 py-3 items-start border-b border-(--border) last:border-0 hover:bg-(--paper-2) transition-colors"
                  style={{ gridTemplateColumns: '72px 148px 1fr 164px 112px' }}
                >
                  {/* Severity */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEV_DOT[sev] }} />
                    <span className={`text-[10px] font-bold font-(--mono) px-1.5 py-0.5 rounded ${SEV_BADGE[sev]}`}>
                      {sev}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="font-(--mono) text-[11px] text-(--ink-3) leading-snug pt-0.5">
                    {fmtTs(log.timestamp)}
                  </div>

                  {/* Event */}
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className="shrink-0 font-(--mono) text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap"
                      style={{ background: `color-mix(in oklch, ${catColor} 12%, transparent)`, color: catColor }}
                    >
                      {actionLabel(log.action)}
                    </span>
                    <span className="text-[13px] text-(--ink) leading-snug min-w-0">
                      {buildMessage(log)}
                    </span>
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {userName && (
                      <span className="text-[12px] font-medium text-(--ink) truncate max-w-[90px]">{userName}</span>
                    )}
                    {log.userRole && (
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded font-(--mono) ${ROLE_BADGE[log.userRole] ?? 'bg-(--paper-2) text-(--ink-3)'}`}>
                        {log.userRole}
                      </span>
                    )}
                    {!userName && !log.userRole && (
                      <span className="text-[12px] text-(--ink-4)">—</span>
                    )}
                  </div>

                  {/* IP */}
                  <div className="font-(--mono) text-[11px] text-(--ink-4) truncate pt-0.5" title={log.ip}>
                    {log.ip}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {displayed.map(log => {
              const sev      = getSeverity(log.statusCode);
              const cat      = actionCategory(log.action);
              const catColor = CAT_COLOR[cat];
              const userName = log.userName ?? (log.userId ? `…${log.userId.slice(-6)}` : null);
              return (
                <div key={log._id} className="bg-(--surface) border border-(--border) rounded-(--r-md) px-4 py-3">
                  {/* Top: severity + timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEV_DOT[sev] }} />
                      <span className={`text-[10px] font-bold font-(--mono) px-1.5 py-0.5 rounded ${SEV_BADGE[sev]}`}>
                        {sev}
                      </span>
                    </div>
                    <span className="font-(--mono) text-[11px] text-(--ink-3)">{fmtTsShort(log.timestamp)}</span>
                  </div>

                  {/* Description */}
                  <div className="text-[13px] text-(--ink) leading-snug mb-2.5">
                    {buildMessage(log)}
                  </div>

                  {/* Bottom: action + user + role + ip */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="font-(--mono) text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `color-mix(in oklch, ${catColor} 12%, transparent)`, color: catColor }}
                    >
                      {actionLabel(log.action)}
                    </span>
                    {userName && (
                      <span className="text-[11px] font-medium text-(--ink-3)">{userName}</span>
                    )}
                    {log.userRole && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-(--mono) ${ROLE_BADGE[log.userRole] ?? 'bg-(--paper-2) text-(--ink-3)'}`}>
                        {log.userRole}
                      </span>
                    )}
                    <span className="font-(--mono) text-[10px] text-(--ink-4) ml-auto">{log.ip}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-1">
          <span className="text-[13px] text-(--ink-3)">
            Page {page} of {pages} · {total.toLocaleString()} records
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1, category, fromDate, toDate)}
              disabled={page <= 1 || isLoading}
              className="h-9 px-4 rounded-full border border-(--border-2) text-[13px] font-semibold text-(--ink-2) hover:border-(--border-3) disabled:opacity-40 transition-[border-color] cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(page + 1, category, fromDate, toDate)}
              disabled={page >= pages || isLoading}
              className="h-9 px-4 rounded-full border border-(--border-2) text-[13px] font-semibold text-(--ink-2) hover:border-(--border-3) disabled:opacity-40 transition-[border-color] cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
