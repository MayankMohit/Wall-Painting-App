import Image from "next/image";

export function PhotoThumb({ count, previewUrl }: { count: number; previewUrl?: string }) {
  return (
    <div className="relative shrink-0 w-12 h-12">
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt=""
          width={48}
          height={48}
          className="w-12 h-12 rounded-[8px] object-cover"
        />
      ) : (
        <div
          className="w-12 h-12 rounded-[8px] flex items-center justify-center text-[oklch(0.42_0.01_80)] font-(--mono) text-[10px] tracking-[.04em] uppercase"
          style={{
            background:
              "repeating-linear-gradient(135deg, oklch(0.86 0.01 70) 0 10px, oklch(0.82 0.012 70) 10px 20px)",
          }}
        >
          JPG
        </div>
      )}
      {count > 1 && (
        <div className="absolute -bottom-[3px] -right-[3px] min-w-[18px] h-[18px] px-1 bg-(--ink) text-white rounded-full text-[9px] flex items-center justify-center font-bold font-(--mono) border-2 border-(--surface)">
          ×{count}
        </div>
      )}
    </div>
  );
}
