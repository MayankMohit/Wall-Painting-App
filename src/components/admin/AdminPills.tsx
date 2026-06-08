export type UserRole   = 'admin' | 'owner' | 'painter';
export type UserStatus = 'active' | 'inactive' | 'suspended';

const ROLE_CLS: Record<UserRole, string> = {
  admin:   'bg-(--info-soft,oklch(0.94 0.04 240)) text-(--info,oklch(0.45 0.15 240)) border border-(--info,oklch(0.45 0.15 240)/0.2)',
  owner:   'bg-(--accent-soft,oklch(0.96 0.05 60)) text-(--accent-deep) border border-(--accent-deep/0.2)',
  painter: 'bg-(--paper-2) text-(--ink-2) border border-(--border-2)',
};

const STATUS_CLS: Record<UserStatus, string> = {
  active:    'bg-(--approved-soft) text-(--approved)',
  inactive:  'bg-(--pending-soft) text-(--pending)',
  suspended: 'bg-(--rejected-soft) text-(--rejected)',
};

const STATUS_DOT: Record<UserStatus, string> = {
  active:    'var(--approved)',
  inactive:  'var(--pending)',
  suspended: 'var(--rejected)',
};

export function RolePill({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center h-[18px] px-[7px] rounded-full text-[10px] font-semibold tracking-[.02em] ${ROLE_CLS[role]}`}>
      {role}
    </span>
  );
}

export function StatusPill({ status }: { status: UserStatus }) {
  return (
    <span className={`inline-flex items-center h-[18px] px-[7px] rounded-full text-[10px] font-semibold tracking-[.02em] ${STATUS_CLS[status]}`}>
      {status}
    </span>
  );
}

export function StatusDot({ status }: { status: UserStatus }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0 mr-1.5"
      style={{ background: STATUS_DOT[status] }}
    />
  );
}
