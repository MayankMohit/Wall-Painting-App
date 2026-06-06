export type Filter = "All" | "Pending" | "Approved" | "Rejected";

interface FilterItem {
  label: string;
  key: Filter;
}

interface FilterBarProps {
  filters: FilterItem[];
  active: Filter;
  onChange: (f: Filter) => void;
}

export function FilterBar({ filters, active, onChange }: FilterBarProps) {
  return (
    <div className="flex gap-1 p-[3px] bg-(--paper-2) rounded-full border border-(--border)">
      {filters.map(({ label, key }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={[
            "flex-1 py-[7px] px-2 rounded-full text-[12px] font-semibold cursor-pointer border-none whitespace-nowrap font-(--font) transition-[background,color] duration-100",
            active === key
              ? "bg-(--surface) text-(--ink) shadow-[0_1px_2px_rgba(0,0,0,.04)]"
              : "bg-transparent text-(--ink-3)",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
