'use client';

import { useState } from "react";
import type { ExPhoto } from "@/store/api/endpoints/submissions";

const HATCH =
  "repeating-linear-gradient(135deg, oklch(0.86 0.01 70) 0 10px, oklch(0.82 0.012 70) 10px 20px)";

function ExpandIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ArrowLIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
function ArrowRIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

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
  const [fsOpen, setFsOpen] = useState(false);
  const [fsIdx, setFsIdx]   = useState(0);

  const openFs = () => {
    setFsIdx(activeIndex);
    setFsOpen(true);
  };

  return (
    <>
      <div
        className={`relative w-full ${mainClass} rounded-(--r-md) overflow-hidden flex items-center justify-center`}
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

        {photos.length > 0 && (
          <button
            type="button"
            onClick={openFs}
            className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(4px)', color: '#fff' }}
          >
            <ExpandIcon size={14} />
          </button>
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

      {/* ── Fullscreen overlay ──────────────────────────────────── */}
      {fsOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: '#000' }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="font-mono text-[13px] text-white/50 tabular-nums">
              {String(fsIdx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
            </span>
            <button
              onClick={() => setFsOpen(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0"
              style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 min-h-0 flex items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[fsIdx]?.cloudinaryUrl || photos[fsIdx]?.previewCloudinaryUrl}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Bottom nav */}
          {photos.length > 1 && (
            <div className="flex items-center justify-between px-6 py-5 shrink-0">
              <button
                onClick={() => setFsIdx((i) => Math.max(0, i - 1))}
                disabled={fsIdx === 0}
                className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border-0 disabled:opacity-25"
                style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
              >
                <ArrowLIcon size={20} />
              </button>

              <div className="flex items-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFsIdx(i)}
                    className="rounded-full border-0 cursor-pointer p-0 transition-all"
                    style={{
                      width:   i === fsIdx ? 20 : 6,
                      height:  6,
                      background: i === fsIdx ? '#fff' : 'rgba(255,255,255,.3)',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => setFsIdx((i) => Math.min(photos.length - 1, i + 1))}
                disabled={fsIdx === photos.length - 1}
                className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border-0 disabled:opacity-25"
                style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
              >
                <ArrowRIcon size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
