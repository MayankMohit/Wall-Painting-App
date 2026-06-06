import type { ExPhoto } from "@/store/api/endpoints/submissions";

const HATCH =
  "repeating-linear-gradient(135deg, oklch(0.86 0.01 70) 0 10px, oklch(0.82 0.012 70) 10px 20px)";

interface PhotoViewerProps {
  photos: ExPhoto[];
  activeIndex: number;
  onSelect: (i: number) => void;
  mainClass: string;
  thumbSize: string;
  thumbGap?: string;
}

export function PhotoViewer({
  photos,
  activeIndex,
  onSelect,
  mainClass,
  thumbSize,
  thumbGap = "gap-1.5",
}: PhotoViewerProps) {
  return (
    <>
      <div
        className={`w-full ${mainClass} rounded-(--r-md) overflow-hidden flex items-center justify-center`}
        style={{ background: HATCH }}
      >
        {photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[activeIndex]?.previewCloudinaryUrl || photos[activeIndex]?.cloudinaryUrl}
            alt="Wall"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-(--mono) text-[11px] text-[oklch(0.58_0.008_80)] tracking-[.04em] uppercase">
            No photos
          </span>
        )}
      </div>

      {photos.length > 1 && (
        <div className={`flex ${thumbGap} mt-2 overflow-x-auto`}>
          {photos.map((photo, idx) => (
            <button
              key={photo._id}
              onClick={() => onSelect(idx)}
              className={[
                `shrink-0 ${thumbSize} rounded-(--r) overflow-hidden border-2 cursor-pointer p-0`,
                activeIndex === idx ? "border-(--ink) opacity-100" : "border-transparent opacity-55",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewCloudinaryUrl || photo.cloudinaryUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
