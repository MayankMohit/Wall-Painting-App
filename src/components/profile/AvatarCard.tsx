import { Pill } from './Pill';

interface AvatarCardProps {
  name: string;
  email: string;
  emailVerified: boolean;
  stats: { accepted: number; pending: number };
}

export function AvatarCard({ name, email, emailVerified, stats }: AvatarCardProps) {
  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4">
      <div className="flex items-center gap-4">
        <div
          className="shrink-0 rounded-full bg-(--ink) text-white flex items-center justify-center text-[22px] font-bold select-none"
          style={{ width: 56, height: 56 }}
        >
          {(name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-semibold text-(--ink) truncate leading-snug">{name}</div>
          <div className="text-[12px] text-(--ink-3) mt-0.5 truncate">{email}</div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Pill kind="neutral">Painter</Pill>
            {emailVerified
              ? <Pill kind="approved">Verified</Pill>
              : <Pill kind="pending">Email unverified</Pill>
            }
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-(--border) grid grid-cols-2 gap-2.5">
        <div className="bg-(--paper) border border-(--border) rounded-(--r) p-3">
          <div className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-[.05em]">Accepted</div>
          <div className="font-(--mono) text-[22px] font-semibold mt-1 text-(--approved)">
            {String(stats.accepted).padStart(2, '0')}
          </div>
        </div>
        <div className="bg-(--paper) border border-(--border) rounded-(--r) p-3">
          <div className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-[.05em]">Pending</div>
          <div className="font-(--mono) text-[22px] font-semibold mt-1 text-(--pending)">
            {String(stats.pending).padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
}
