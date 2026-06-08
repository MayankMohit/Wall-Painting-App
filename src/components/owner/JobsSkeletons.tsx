export const TABLE_COLS = 'grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1fr_100px]';

export function SkeletonRow() {
  return (
    <div className={`grid ${TABLE_COLS} items-center px-5 py-3.5 border-b border-(--border) animate-pulse`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-(--r) bg-(--paper-2) shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-36 rounded bg-(--paper-2)" />
          <div className="h-2.5 w-48 rounded bg-(--paper-2)" />
        </div>
      </div>
      <div className="h-3.5 w-8 rounded bg-(--paper-2) mx-auto" />
      <div className="h-3.5 w-8 rounded bg-(--paper-2) mx-auto" />
      <div className="h-3.5 w-6 rounded bg-(--paper-2) mx-auto" />
      <div className="h-[22px] w-20 rounded-full bg-(--paper-2)" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-(--surface) rounded-(--r-md) border border-(--border) p-3.5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-[10px] bg-(--paper-2) shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-(--paper-2)" />
          <div className="h-3 w-56 rounded bg-(--paper-2)" />
          <div className="flex gap-1.5 mt-1">
            <div className="h-[18px] w-14 rounded-full bg-(--paper-2)" />
            <div className="h-[18px] w-20 rounded-full bg-(--paper-2)" />
          </div>
        </div>
      </div>
    </div>
  );
}
