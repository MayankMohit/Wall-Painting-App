interface SizesTableProps {
  sizes: number[][];
  totalArea: string;
}

export function SizesTable({ sizes, totalArea }: SizesTableProps) {
  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r)">
      {sizes.map((s, i) => (
        <div
          key={i}
          className={[
            "px-[14px] py-3 flex items-center gap-3",
            i < sizes.length - 1 ? "border-b border-(--border)" : "",
          ].join(" ")}
        >
          <div className="font-(--mono) text-[11px] text-(--ink-3) w-[22px]">
            {String(i + 1).padStart(2, "0")}
          </div>
          <div className="font-(--mono) text-(--ink-3) text-[14px] flex-1">
            {s[0]} × {s[1]} <span className="font-medium">ft</span>
          </div>
          <div className="font-(--mono) text-[12px] text-(--ink-3)">
            {(s[0] * s[1]).toFixed(1)} ft²
          </div>
        </div>
      ))}
      <div className="px-[14px] py-3 flex items-center justify-between bg-(--paper-2) border-t border-(--border) rounded-b-(--r)">
        <div className="text-[12px] font-semibold text-(--ink-2)">Total area</div>
        <div className="font-(--mono) text-[16px] font-bold text-(--ink)">{totalArea} ft²</div>
      </div>
    </div>
  );
}
