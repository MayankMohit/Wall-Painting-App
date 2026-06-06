export function SectionHdr({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-2 text-[11px] font-bold text-(--ink-3) tracking-[.06em] uppercase">
      {title}
    </div>
  );
}
