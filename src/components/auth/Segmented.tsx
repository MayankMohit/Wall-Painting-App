interface SegmentedProps {
  items: string[];
  active: number;
  onChange: (index: number) => void;
}

export default function Segmented({ items, active, onChange }: SegmentedProps) {
  return (
    <div className="flex gap-1 p-0.75 bg-(--paper-2) rounded-full border border-(--border)">
      {items.map((item, i) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(i)}
          className={[
            'flex-1 py-1.75 px-2 rounded-full text-[12px] font-semibold cursor-pointer border-none whitespace-nowrap transition-[background,color] duration-100',
            i === active
              ? 'bg-(--surface) text-(--ink) shadow-[0_1px_2px_rgba(0,0,0,.04)]'
              : 'bg-transparent text-(--ink-3)',
          ].join(' ')}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
