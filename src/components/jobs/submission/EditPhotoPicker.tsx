import type { ExPhoto } from "@/store/api/endpoints/submissions";
import { ImageIcon, X } from "@/components/jobs/shared/icons";

interface EditPhotoPickerProps {
  exPhotos: ExPhoto[];
  newFiles: File[];
  newPrevs: string[];
  busy: boolean;
  onPickNew: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropNew: (index: number) => void;
  onDeleteExisting: (photoId: string) => void;
}

export function EditPhotoPicker({
  exPhotos,
  newFiles,
  newPrevs,
  busy,
  onPickNew,
  onDropNew,
  onDeleteExisting,
}: EditPhotoPickerProps) {
  const canDeletePhoto = exPhotos.length + newPrevs.length > 1;
  return (
    <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
      <label
        className={[
          "h-[76px] rounded-(--r) border-[1.5px] border-dashed border-(--border-3) bg-transparent flex flex-col items-center justify-center gap-[3px]",
          busy ? "cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <ImageIcon size={20} style={{ color: "var(--accent-deep)" }} />
        <div className="text-[10px] font-semibold text-(--ink-2)">Add</div>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={onPickNew}
        />
      </label>

      {exPhotos.map((photo) => (
        <div
          key={photo._id}
          className="relative h-[76px] rounded-(--r) overflow-hidden border border-(--border)"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewCloudinaryUrl || photo.cloudinaryUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          {!busy && canDeletePhoto && (
            <button
              type="button"
              onClick={() => onDeleteExisting(photo._id)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white border-0 flex items-center justify-center cursor-pointer"
            >
              <X size={11} weight={2.4} />
            </button>
          )}
        </div>
      ))}

      {newPrevs.map((url, i) => (
        <div
          key={`new-${i}`}
          className="relative h-[76px] rounded-(--r) overflow-hidden border-[1.5px] border-(--accent)"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
          {!busy && canDeletePhoto && (
            <button
              type="button"
              onClick={() => onDropNew(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white border-0 flex items-center justify-center cursor-pointer"
            >
              <X size={11} weight={2.4} />
            </button>
          )}
          <div className="absolute bottom-[3px] left-1 text-[9px] font-bold text-white bg-(--accent) rounded-[4px] px-[5px] py-px font-(--mono)">
            NEW
          </div>
        </div>
      ))}
    </div>
  );
}
