interface HeroCardProps {
  companyName?: string;
  description?: string;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export function HeroCard({ companyName, description, approvedCount, pendingCount, rejectedCount }: HeroCardProps) {
  return (
    <div className="rounded-(--r-md) overflow-hidden bg-(--ink) border-0">
      <div className="p-[18px] text-white">
        <span className="inline-flex items-center gap-1.5 h-[22px] pl-2 pr-2.5 bg-white/[0.12] text-white rounded-full text-[10px] font-bold tracking-[.06em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-(--accent)" />
          Current job
        </span>
        {companyName && (
          <div className="text-[18px] font-bold text-white mt-3 leading-[1.2] tracking-[-0.015em]">{companyName}</div>
        )}
        {description && (
          <div className="text-[13px] text-white/60 mt-1.5 leading-[1.5]">{description}</div>
        )}
        <div className="flex items-center gap-5 mt-[18px]">
          {[
            { label: "Approved", value: approvedCount },
            { label: "Pending",  value: pendingCount  },
            { label: "Rejected", value: rejectedCount },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex items-center gap-5">
              {i > 0 && <div className="w-px h-9 bg-white/[0.15]" />}
              <div>
                <div className="text-[10px] uppercase tracking-[.06em] text-white/50">{label}</div>
                <div className="text-[24px] font-semibold mt-0.5 font-(--mono)">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
