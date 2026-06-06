import { Building, Search } from "./icons";

export function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-16 px-6 text-center bg-(--surface) rounded-(--r-md) border border-(--border)">
      {query ? (
        <>
          <div className="w-11 h-11 rounded-xl bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-3) mx-auto mb-4">
            <Search size={20} />
          </div>
          <div className="text-[15px] font-semibold text-(--ink) mb-1.5">
            No results for &ldquo;{query}&rdquo;
          </div>
          <div className="text-[13px] text-(--ink-3)">
            Try a different search term.
          </div>
        </>
      ) : (
        <>
          <div className="w-11 h-11 rounded-xl bg-(--paper-2) border border-(--border) flex items-center justify-center text-(--ink-3) mx-auto mb-4">
            <Building size={20} />
          </div>
          <div className="text-[15px] font-semibold text-(--ink) mb-1.5">
            No active assignments
          </div>
          <div className="text-[13px] text-(--ink-3)">
            You don&rsquo;t have any jobs assigned right now.
          </div>
        </>
      )}
    </div>
  );
}
