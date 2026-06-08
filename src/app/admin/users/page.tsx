'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Filter } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/Avatar';
import { RolePill, StatusPill, type UserRole, type UserStatus } from '@/components/admin/AdminPills';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SystemUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

type RoleFilter   = 'all' | UserRole;
type StatusFilter = 'all' | UserStatus;

// ── Helpers ────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { Authorization: `Bearer ${token}` };
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer transition-[background,border-color,color] duration-100 whitespace-nowrap"
      style={{
        background:   on ? 'var(--ink)' : 'var(--surface)',
        borderColor:  on ? 'var(--ink)' : 'var(--border-2)',
        color:        on ? '#fff'        : 'var(--ink-2)',
      }}
    >
      {label}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users,       setUsers]       = useState<SystemUser[]>([]);
  const [total,       setTotal]       = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [role,        setRole]        = useState<RoleFilter>('all');
  const [status,      setStatus]      = useState<StatusFilter>('all');
  const [q,           setQ]           = useState('');
  const [debouncedQ,  setDebouncedQ]  = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (role   !== 'all') params.set('role',   role);
      if (status !== 'all') params.set('status', status);
      if (debouncedQ)       params.set('q',      debouncedQ);
      const res  = await fetch(`/api/admin/users?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (res.ok) {
        setUsers(json.data?.users ?? json.users ?? []);
        setTotal(json.data?.total ?? json.total ?? 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [role, status, debouncedQ]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const ROLE_FILTERS:   { key: RoleFilter;   label: string }[] = [
    { key: 'all',     label: 'All roles' },
    { key: 'painter', label: 'Painter'   },
    { key: 'owner',   label: 'Owner'     },
    { key: 'admin',   label: 'Admin'     },
  ];
  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'All statuses' },
    { key: 'active',    label: 'Active'       },
    { key: 'inactive',  label: 'Inactive'     },
    { key: 'suspended', label: 'Suspended'    },
  ];

  return (
    <div className="bg-(--paper) min-h-screen">

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-(--paper) border-b border-(--border)">
          <div className="px-4 pt-3 pb-2">
            <div className="text-[20px] font-bold tracking-[-0.025em] text-(--ink)">
              Users <span className="font-(--mono) text-[16px] font-normal text-(--ink-3)">{total}</span>
            </div>
          </div>
          {/* Search */}
          <div className="px-4 pb-3">
            <div className="h-11 bg-(--surface) border border-(--border-2) rounded-(--r) flex items-center gap-2.5 px-3.5">
              <Search size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email or phone"
                className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
              />
            </div>
          </div>
          {/* Role chips */}
          <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto">
            {ROLE_FILTERS.map(({ key, label }) => (
              <Chip key={key} label={label} on={role === key} onClick={() => setRole(key)} />
            ))}
          </div>
          {/* Status chips */}
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
            {STATUS_FILTERS.map(({ key, label }) => (
              <Chip key={key} label={label} on={status === key} onClick={() => setStatus(key)} />
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-(--border-3) border-t-(--ink) animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-(--ink-3)">No users found.</div>
        ) : (
          <div>
            {users.map((u) => (
              <Link
                key={u._id}
                href={`/admin/users/${u._id}`}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-(--border) no-underline text-inherit transition-colors hover:bg-(--paper-2)"
              >
                <Avatar name={u.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="text-[14px] font-semibold text-(--ink)">{u.name}</div>
                    <RolePill role={u.role} />
                    <StatusPill status={u.status} />
                  </div>
                  <div className="font-(--mono) text-[11px] text-(--ink-3) mt-0.5 truncate">{u.email}</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop ──────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-(--border)">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.025em] text-(--ink)">
              Users
              {!isLoading && <span className="font-(--mono) text-[18px] font-normal text-(--ink-3) ml-2">{total}</span>}
            </h1>
            <p className="text-[13px] text-(--ink-3) mt-1">Manage platform access, roles, and account statuses.</p>
          </div>
          {/* Search */}
          <div className="w-80 h-10 bg-(--surface) border border-(--border-2) rounded-(--r) flex items-center gap-2.5 px-3.5">
            <Search size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or phone"
              className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
            />
          </div>
        </div>

        <div className="px-8 py-5">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em] w-14">Role</div>
              <div className="flex gap-1.5">
                {ROLE_FILTERS.map(({ key, label }) => (
                  <Chip key={key} label={label} on={role === key} onClick={() => setRole(key)} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="text-[11px] font-bold text-(--ink-3) uppercase tracking-[.05em] w-14">Status</div>
              <div className="flex gap-1.5">
                {STATUS_FILTERS.map(({ key, label }) => (
                  <Chip key={key} label={label} on={status === key} onClick={() => setStatus(key)} />
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden shadow-(--shadow-sm)">
            {/* Header row */}
            <div
              className="grid gap-4 px-5 py-3 border-b border-(--border) bg-(--paper-2) text-[10px] font-bold uppercase tracking-[.05em] text-(--ink-3)"
              style={{ gridTemplateColumns: '2.4fr 1.8fr 110px 130px 90px 50px' }}
            >
              <div>User</div>
              <div>Contact</div>
              <div>Role</div>
              <div>Status</div>
              <div>Joined</div>
              <div />
            </div>

            {isLoading ? (
              <div className="p-16 text-center animate-pulse text-[13px] text-(--ink-4)">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="p-16 text-center text-[13px] text-(--ink-3)">No users match your filters.</div>
            ) : (
              users.map((u, i) => (
                <Link
                  key={u._id}
                  href={`/admin/users/${u._id}`}
                  className={[
                    'grid gap-4 px-5 py-3.5 items-center no-underline text-inherit transition-colors hover:bg-(--paper-2)',
                    i < users.length - 1 ? 'border-b border-(--border)' : '',
                  ].join(' ')}
                  style={{ gridTemplateColumns: '2.4fr 1.8fr 110px 130px 90px 50px' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.name} size={36} />
                    <div className="text-[14px] font-semibold text-(--ink) truncate">{u.name}</div>
                  </div>
                  <div className="font-(--mono) text-[12px] text-(--ink-3) truncate">{u.email}</div>
                  <div><RolePill role={u.role} /></div>
                  <div><StatusPill status={u.status} /></div>
                  <div className="font-(--mono) text-[12px] text-(--ink-3)">{relTime(u.createdAt)}</div>
                  <div className="text-right"><ArrowRight size={16} style={{ color: 'var(--ink-4)' }} /></div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
