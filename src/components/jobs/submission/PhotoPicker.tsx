import { ImageIcon, X } from "@/components/jobs/shared/icons";

interface PhotoPickerProps {
  files: File[];
  prevs: string[];
  photoErr: boolean;
  busy: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (index: number) => void;
}

export function PhotoPicker({ files, prevs, photoErr, busy, onPick, onDrop }: PhotoPickerProps) {
  return (
    <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
      <label
        className={[
          "h-[76px] rounded-(--r) flex flex-col items-center justify-center gap-[3px]",
          busy ? "cursor-not-allowed" : "cursor-pointer",
          photoErr
            ? "border-[1.5px] border-dashed border-(--rejected) bg-(--rejected-soft)"
            : "border-[1.5px] border-dashed border-(--border-3) bg-transparent",
        ].join(" ")}
      >
        <ImageIcon
          size={20}
          style={{ color: photoErr ? "var(--rejected)" : "var(--accent-deep)" }}
        />
        <div
          className={[
            "text-[10px] font-semibold",
            photoErr ? "text-(--rejected)" : "text-(--ink-2)",
          ].join(" ")}
        >
          {files.length ? "Replace" : "Pick"}
        </div>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={onPick}
        />
      </label>
      {prevs.map((url, i) => (
        <div
          key={i}
          className="relative h-[76px] rounded-(--r) overflow-hidden border border-(--border)"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
          {!busy && (
            <button
              type="button"
              onClick={() => onDrop(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white border-0 flex items-center justify-center cursor-pointer"
            >
              <X size={11} weight={2.4} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
