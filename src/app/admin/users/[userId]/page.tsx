'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, Alert, Refresh } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/Avatar';
import { RolePill, StatusPill, type UserRole, type UserStatus } from '@/components/admin/AdminPills';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserDetail {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  companyName?: string;
  createdAt: string;
  lastLogin?: string;
}

type DialogType = 'suspend' | 'activate' | null;

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeaders(body?: boolean) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body) h['Content-Type'] = 'application/json';
  return h;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function relTime(iso?: string) {
  if (!iso) return '—';
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaRow({ label, value, mono = false, last = false }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div className={`px-[18px] py-3 flex items-center ${last ? '' : 'border-b border-(--border)'}`}>
      <div className="flex-1 text-[13px] text-(--ink-3)">{label}</div>
      <div className={`text-[13px] font-semibold text-(--ink) ${mono ? 'font-(--mono)' : ''}`}>{value}</div>
    </div>
  );
}

function VerifyRow({ label, value, ok, href, last = false }: { label: string; value: string; ok: boolean; href?: string; last?: boolean }) {
  return (
    <div className={`px-[18px] py-3 flex items-center gap-3 ${last ? '' : 'border-b border-(--border)'}`}>
      <div className="flex-1">
        <div className="text-[10px] text-(--ink-3) uppercase tracking-[.05em]">{label}</div>
        {href ? (
          <a href={href} className="text-[14px] font-semibold text-(--accent-deep) mt-0.5 font-(--mono) no-underline hover:underline">{value}</a>
        ) : (
          <div className="text-[14px] font-semibold text-(--ink) mt-0.5 font-(--mono)">{value}</div>
        )}
      </div>
      {ok ? (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: 'var(--approved)' }}>
          <Check size={13} weight={2.8} />
        </div>
      ) : (
        <span className="inline-flex items-center h-[18px] px-2 rounded-full text-[10px] font-semibold" style={{ background: 'var(--pending-soft)', color: 'var(--pending)' }}>
          Unverified
        </span>
      )}
    </div>
  );
}

// ── Status note banner ────────────────────────────────────────────────────────

const STATUS_NOTE: Record<UserStatus, { bg: string; bd: string; fg: string; icon: React.ReactNode; txt: (isOwner: boolean) => string }> = {
  active:    { bg: 'var(--approved-soft)',  bd: 'oklch(0.85 0.06 150)', fg: 'var(--approved)',  icon: <Check size={16} weight={2.4} />,  txt: () => 'Active — full access to the app.' },
  inactive:  { bg: 'var(--pending-soft)',   bd: 'var(--border-2)',      fg: 'var(--pending)',   icon: <Alert size={16} />,               txt: (isOwner) => isOwner ? 'Awaiting approval — this owner can’t sign in until you activate them.' : 'Inactive — can’t sign in until activated.' },
  suspended: { bg: 'var(--rejected-soft)',  bd: 'oklch(0.85 0.06 25)',  fg: 'var(--rejected)',  icon: <Alert size={16} />,               txt: () => 'Suspended — access has been revoked.' },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);

  const [user,        setUser]        = useState<UserDetail | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [dialog,      setDialog]      = useState<DialogType>(null);
  const [reason,      setReason]      = useState('');
  const [isActing,    setIsActing]    = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res  = await fetch(`/api/admin/users/${userId}`, { headers: authHeaders() });
        const json = await res.json();
        if (res.ok) setUser(json.data ?? json);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId]);

  const handleSuspend = async () => {
    if (!user) return;
    setIsActing(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setUser((u) => u ? { ...u, status: 'suspended' } : u);
      setDialog(null);
      setReason('');
      setToast({ msg: 'Account suspended', ok: true });
    } catch (e: unknown) {
      setToast({ msg: (e instanceof Error ? e.message : 'Failed to suspend'), ok: false });
    } finally {
      setIsActing(false);
    }
  };

  const handleActivate = async () => {
    if (!user) return;
    setIsActing(true);
    // Use approve for inactive owners, activate for all others
    const endpoint = user.status === 'inactive' && user.role === 'owner'
      ? `/api/admin/users/${userId}/approve`
      : `/api/admin/users/${userId}/activate`;
    try {
      const res = await fetch(endpoint, { method: 'PATCH', headers: authHeaders(true) });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setUser((u) => u ? { ...u, status: 'active' } : u);
      setDialog(null);
      setToast({ msg: 'Account activated', ok: true });
    } catch (e: unknown) {
      setToast({ msg: (e instanceof Error ? e.message : 'Failed to activate'), ok: false });
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="m-6 p-4 rounded-(--r-md) text-[13px] font-medium" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
        User not found.
      </div>
    );
  }

  const note    = STATUS_NOTE[user.status];
  const isOwner = user.role === 'owner';

  return (
    <div className="bg-(--paper) min-h-screen">

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-4 z-[60] px-4 py-3 rounded-(--r-md) text-[13px] font-semibold text-white shadow-lg"
          style={{ background: toast.ok ? 'var(--approved)' : 'var(--rejected)' }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border) flex items-center gap-2 h-14 px-4">
          <Link href="/admin/users" className="w-9 h-9 flex items-center justify-center rounded-full text-(--ink-2) hover:bg-(--paper-2) transition-colors no-underline">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-(--ink) truncate">{user.name}</div>
            <div className="text-[11px] text-(--ink-3)">User profile</div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 pb-32">
          {/* Header card */}
          <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4">
            <div className="flex items-center gap-3.5">
              <Avatar name={user.name} size={56} />
              <div className="flex-1 min-w-0">
                <div className="text-[17px] font-semibold text-(--ink)">{user.name}</div>
                <div className="font-(--mono) text-[11px] text-(--ink-3) mt-0.5 truncate">{user.email}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <RolePill role={user.role} />
                  <StatusPill status={user.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Status note */}
          <div
            className="flex items-center gap-3 p-3 rounded-(--r-md) border"
            style={{ background: note.bg, borderColor: note.bd }}
          >
            <span style={{ color: note.fg, display: 'flex', flexShrink: 0 }}>{note.icon}</span>
            <div className="text-[12px] text-(--ink-2) leading-[1.45]">{note.txt(isOwner)}</div>
          </div>

          {/* Verification */}
          <div>
            <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-2">Verification</div>
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
              <VerifyRow label="Email" value={user.email} ok={user.emailVerified} />
              <VerifyRow label="Phone" value={user.phone || '—'} ok={!!user.phone} href={user.phone ? `tel:${user.phone}` : undefined} last />
            </div>
          </div>

          {/* Account */}
          <div>
            <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-2">Account</div>
            <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
              {isOwner && user.companyName && <MetaRow label="Company"     value={user.companyName} />}
              <MetaRow label="User ID"     value={user._id.slice(-8)}  mono />
              <MetaRow label="Joined"      value={fmtDate(user.createdAt)} />
              <MetaRow label="Last active" value={user.lastLogin ? relTime(user.lastLogin) : '—'} last />
            </div>
          </div>

        </div>

        {/* Fixed action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pt-3 pb-8 bg-(--paper) border-t border-(--border) flex gap-2">
          {user.status === 'active' && (
            <button
              onClick={() => { setDialog('suspend'); setReason(''); }}
              className="flex-1 h-12 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer border"
              style={{ background: 'var(--rejected-soft)', borderColor: 'var(--rejected)', color: 'var(--rejected)' }}
            >
              <Alert size={16} /> Suspend account
            </button>
          )}
          {user.status === 'inactive' && (
            <>
              <button
                onClick={() => { setDialog('suspend'); setReason(''); }}
                className="h-12 px-5 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer border"
                style={{ background: 'var(--rejected-soft)', borderColor: 'var(--rejected)', color: 'var(--rejected)' }}
              >
                <X size={16} weight={2.2} /> Suspend
              </button>
              <button
                onClick={() => setDialog('activate')}
                className="flex-1 h-12 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer text-white"
                style={{ background: 'var(--approved)' }}
              >
                <Check size={16} weight={2.2} /> Activate
              </button>
            </>
          )}
          {user.status === 'suspended' && (
            <button
              onClick={() => setDialog('activate')}
              className="flex-1 h-12 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer text-white"
              style={{ background: 'var(--approved)' }}
            >
              <Refresh size={16} weight={2} /> Reactivate account
            </button>
          )}
        </div>
      </div>

      {/* ── Desktop ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        {/* Header */}
        <div className="flex items-center gap-4 px-8 pt-7 pb-5 border-b border-(--border) sticky top-0 z-10 bg-(--paper)">
          <Link href="/admin/users" className="w-8 h-8 flex items-center justify-center rounded-full text-(--ink-3) hover:bg-(--paper-2) transition-colors no-underline">
            <ArrowLeft size={17} />
          </Link>
          <div className="flex items-center gap-2 mr-auto">
            <h1 className="text-[22px] font-bold text-(--ink) tracking-[-0.025em]">{user.name}</h1>
            <RolePill role={user.role} />
            <StatusPill status={user.status} />
          </div>
          <div className="flex items-center gap-2">
            {user.status === 'active' && (
              <button
                onClick={() => { setDialog('suspend'); setReason(''); }}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer border"
                style={{ background: 'var(--rejected-soft)', borderColor: 'var(--rejected)', color: 'var(--rejected)' }}
              >
                <Alert size={14} /> Suspend account
              </button>
            )}
            {user.status === 'inactive' && (
              <>
                <button
                  onClick={() => { setDialog('suspend'); setReason(''); }}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer border"
                  style={{ background: 'var(--rejected-soft)', borderColor: 'var(--rejected)', color: 'var(--rejected)' }}
                >
                  <X size={13} weight={2.2} /> Suspend
                </button>
                <button
                  onClick={() => setDialog('activate')}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer"
                  style={{ background: 'var(--approved)' }}
                >
                  <Check size={13} weight={2.2} /> Activate
                </button>
              </>
            )}
            {user.status === 'suspended' && (
              <button
                onClick={() => setDialog('activate')}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold text-white cursor-pointer"
                style={{ background: 'var(--approved)' }}
              >
                <Refresh size={14} weight={2} /> Reactivate account
              </button>
            )}
          </div>
        </div>

        <div className="px-8 pt-6 pb-10 max-w-2xl">
          <div className="space-y-5">
            {/* Status note */}
            <div className="flex items-center gap-3 p-4 rounded-(--r-md) border" style={{ background: note.bg, borderColor: note.bd }}>
              <span style={{ color: note.fg, display: 'flex', flexShrink: 0 }}>{note.icon}</span>
              <div className="text-[13px] text-(--ink-2) leading-[1.45]">{note.txt(isOwner)}</div>
            </div>

            {/* Verification */}
            <div>
              <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-2.5">Verification</div>
              <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
                <VerifyRow label="Email" value={user.email} ok={user.emailVerified} />
                <VerifyRow label="Phone" value={user.phone || '—'} ok={!!user.phone} href={user.phone ? `tel:${user.phone}` : undefined} last />
              </div>
            </div>

            {/* Account */}
            <div>
              <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.06em] mb-2.5">Account</div>
              <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
                {isOwner && user.companyName && <MetaRow label="Company"     value={user.companyName} />}
                <MetaRow label="User ID"     value={user._id.slice(-8)}  mono />
                <MetaRow label="Joined"      value={fmtDate(user.createdAt)} />
                <MetaRow label="Last active" value={user.lastLogin ? relTime(user.lastLogin) : '—'} last />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDialog(null); }}
        >
          <div className="w-full max-w-md bg-(--surface) rounded-(--r-lg) overflow-hidden shadow-xl">
            {dialog === 'suspend' ? (
              <>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--rejected-soft)', color: 'var(--rejected)' }}>
                      <Alert size={22} />
                    </div>
                    <div>
                      <div className="text-[17px] font-bold text-(--ink)">Suspend this account?</div>
                      <div className="text-[12px] text-(--ink-3) mt-0.5">{user.name} · {user.email}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Reason <span className="font-normal text-(--ink-4)">(optional)</span></div>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why this account is being suspended…"
                        className="w-full resize-none rounded-(--r) border border-(--border-2) bg-(--paper-2) px-3 py-2.5 text-[13px] text-(--ink) focus:outline-none focus:border-(--ink)"
                      />
                    </div>
                    <div className="text-[11px] text-(--ink-3) leading-[1.5]">
                      The user is signed out immediately. If a reason is provided, it will be sent to them.
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-(--border)">
                  <button onClick={() => setDialog(null)} className="flex-1 py-4 text-[15px] font-semibold text-(--ink-2) cursor-pointer border-r border-(--border) hover:bg-(--paper-2) transition-colors">Cancel</button>
                  <button
                    onClick={handleSuspend}
                    disabled={isActing}
                    className="flex-1 py-4 text-[15px] font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ color: 'var(--rejected)' }}
                  >
                    {isActing ? 'Suspending…' : 'Suspend'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--approved-soft)', color: 'var(--approved)' }}>
                    <Check size={28} weight={2.6} />
                  </div>
                  <div className="text-[19px] font-bold text-(--ink) tracking-[-0.015em]">
                    {user.status === 'suspended' ? 'Reactivate' : 'Activate'} this account?
                  </div>
                  <div className="text-[13px] text-(--ink-3) mt-2 leading-[1.5] max-w-xs mx-auto">
                    <span className="font-semibold text-(--ink-2)">{user.name}</span> will be set to{' '}
                    <span className="font-semibold" style={{ color: 'var(--approved)' }}>Active</span> and granted full access.
                    They&apos;ll be notified by email.
                  </div>
                  {isOwner && user.status === 'inactive' && user.phone && (
                    <div className="text-[12px] mt-3 mx-auto max-w-xs px-3 py-2 rounded-(--r-md) border text-left leading-[1.45]" style={{ background: 'var(--pending-soft)', borderColor: 'var(--border-2)', color: 'var(--ink-2)' }}>
                      Call <a href={`tel:${user.phone}`} className="font-semibold font-(--mono) text-(--accent-deep) no-underline">{user.phone}</a> to verify this owner before activating.
                    </div>
                  )}
                </div>
                <div className="flex border-t border-(--border)">
                  <button onClick={() => setDialog(null)} className="flex-1 py-4 text-[15px] font-semibold text-(--ink-2) cursor-pointer border-r border-(--border) hover:bg-(--paper-2) transition-colors">Cancel</button>
                  <button
                    onClick={handleActivate}
                    disabled={isActing}
                    className="flex-1 py-4 text-[15px] font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ color: 'var(--approved)' }}
                  >
                    {isActing ? 'Activating…' : user.status === 'suspended' ? 'Reactivate' : 'Activate'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
