import { useGetPaintersQuery, type Painter } from '@/store/api/endpoints/painters';
import { Search, X, Check } from '@/components/owner/icons';

const PER_PAGE = 5;

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: 'var(--ink-2)' }}
    >
      {initials}
    </div>
  );
}

function SkeletonPainterRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-(--border) last:border-0 animate-pulse">
      <div className="w-5 h-5 rounded-[5px] bg-(--paper-2) shrink-0" />
      <div className="w-8 h-8 rounded-full bg-(--paper-2) shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 bg-(--paper-2) rounded" />
        <div className="h-2.5 w-20 bg-(--paper-2) rounded" />
      </div>
    </div>
  );
}

interface PainterPickerProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  searchTerm: string;
  onSearch: (q: string) => void;
  page: number;
  onPageChange: (p: number) => void;
}

export function PainterPicker({
  selectedIds,
  onToggle,
  searchTerm,
  onSearch,
  page,
  onPageChange,
}: PainterPickerProps) {
  const { data, isLoading } = useGetPaintersQuery();
  const allPainters = data?.users ?? [];

  const filtered = searchTerm.trim()
    ? allPainters.filter((p) => {
        const q = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.phone ?? '').includes(q);
      })
    : allPainters;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagePainters = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-2 h-[42px] px-3.5 bg-(--surface) border border-(--border-2) rounded-(--r) focus-within:border-(--border-3) transition-[border-color]">
        <Search size={16} style={{ color: 'var(--ink-3)' }} />
        <input
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name or phone"
          className="flex-1 text-[14px] text-(--ink) bg-transparent outline-none placeholder:text-(--ink-4)"
        />
        {searchTerm && (
          <button onClick={() => onSearch('')} className="text-(--ink-4) hover:text-(--ink-3)">
            <X size={13} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="mt-3 bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonPainterRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-(--ink-3)">
            {searchTerm ? 'No painters match your search.' : 'No painters found.'}
          </div>
        ) : (
          pagePainters.map((p: Painter) => {
            const sel = selectedIds.includes(p._id);
            return (
              <div
                key={p._id}
                onClick={() => onToggle(p._id)}
                className="flex items-center gap-3 px-4 py-3 border-b border-(--border) last:border-0 cursor-pointer hover:bg-(--paper) transition-colors select-none"
                style={{ background: sel ? 'var(--paper)' : undefined }}
              >
                <div
                  className="w-5 h-5 rounded-[5px] shrink-0 flex items-center justify-center"
                  style={{
                    background: sel ? 'var(--ink)' : 'transparent',
                    border: sel ? 'none' : '1.5px solid var(--border-3)',
                  }}
                >
                  {sel && <Check size={13} weight={2.8} style={{ color: '#fff' }} />}
                </div>
                <Avatar name={p.name} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-(--ink) truncate">{p.name}</div>
                  <div className="text-[11px] text-(--ink-3) font-(--mono) mt-0.5">
                    {p.phone ?? p.email}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between px-1 py-2 text-[12px] text-(--ink-3)">
          <button
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="font-medium disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
          >
            ← Prev
          </button>
          <span className="font-(--mono) tabular-nums">{safePage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="font-medium disabled:opacity-40 hover:text-(--ink) transition-colors cursor-pointer disabled:cursor-default"
          >
            Next →
          </button>
        </div>
      )}

      <p className="mt-2 text-[11px] text-(--ink-3)">
        Painters can be added or removed at any time from the job page.
      </p>
    </>
  );
}
