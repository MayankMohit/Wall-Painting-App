export function SectionHdr({ title }: { title: string }) {
  return (
    <div className="px-4 lg:px-8 pt-[18px] pb-2.5">
      <div className="text-[11px] font-bold text-(--ink-3) tracking-[.06em] uppercase">{title}</div>
    </div>
  );
}
