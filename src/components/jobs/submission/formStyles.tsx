export const inputBox =
  "bg-(--surface) rounded-(--r) border border-(--border-2) h-12 px-[14px] flex items-center gap-2";

export const innerInput =
  "flex-1 border-0 bg-transparent outline-none text-[16px] text-(--ink) font-(--font) min-w-0";

export function Suffix({ text }: { text: string }) {
  return (
    <span className="text-[13px] text-(--ink-3) shrink-0 whitespace-nowrap">
      {text}
    </span>
  );
}
