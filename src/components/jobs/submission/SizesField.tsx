// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useState, useEffect } from "react";
import type { UseFormRegister, FieldArrayWithId } from "react-hook-form";
import { X, Plus } from "@/components/jobs/shared/icons";
import { inputBox, innerInput } from "./formStyles";

const WALL_LABELS = [
  "Wall Painting - Top Wall",
  "Wall Painting - Bottom Wall",
  "Wall Painting - Front Wall",
  "Wall Painting - Side Wall",
  "Wall Painting - Pillar",
];

const VAN_LABELS = [
  "Van Painting - Side",
  "Van Painting - Other Side",
  "Van Painting - Front",
  "Van Painting - Back",
];

interface SizesFieldProps {
  fields: (FieldArrayWithId<any, any, "id"> & { width: string; height: string; label?: string })[];
  register: UseFormRegister<any>;
  remove: (index: number) => void;
  append: (value: { width: string; height: string; label?: string }) => void;
  replace: (values: { width: string; height: string; label?: string }[]) => void;
  busy: boolean;
  area: string;
  isFormatB?: boolean;
  jobType?: "Wall" | "Shutter" | "Van";
}

const MAX_SIZES = 10;

export function SizesField({
  fields,
  register,
  remove,
  append,
  replace,
  busy,
  area,
  isFormatB,
  jobType,
}: SizesFieldProps) {
  const atMax = fields.length >= MAX_SIZES;
  const isFormatBWall = isFormatB && jobType === "Wall";
  const isFormatBShutter = isFormatB && jobType === "Shutter";

  const [bType, setBType] = useState<"wall" | "van">("wall");

  // Explicit handler for user clicks so it doesn't fight the useEffect
  const handleToggle = (type: "wall" | "van") => {
    setBType(type);
    const targetLabels = type === "wall" ? WALL_LABELS : VAN_LABELS;
    
    const newFields = targetLabels.map((label) => {
      const existing = fields.find((f) => f.label === label);
      return { 
        width: existing?.width ?? "", 
        height: existing?.height ?? "", 
        label 
      };
    });
    replace(newFields);
  };

  // Robust padding and synchronization logic
  useEffect(() => {
    if (!isFormatB) return;

    if (isFormatBWall) {
      const incomingIsVan = fields.some((f) => VAN_LABELS.includes(f.label || ""));
      const incomingIsWall = fields.some((f) => WALL_LABELS.includes(f.label || ""));
      
      let currentType = bType;

      if (incomingIsVan && !incomingIsWall && bType !== "van") {
        currentType = "van";
        setBType("van");
      } else if (incomingIsWall && !incomingIsVan && bType !== "wall") {
        currentType = "wall";
        setBType("wall");
      }

      const targetLabels = currentType === "wall" ? WALL_LABELS : VAN_LABELS;
      const currentLabels = fields.map((f) => f.label);
      
      const isExactMatch = 
        currentLabels.length === targetLabels.length && 
        targetLabels.every((l, i) => l === currentLabels[i]);

      if (!isExactMatch) {
        const newFields = targetLabels.map((label) => {
          const existing = fields.find((f) => f.label === label);
          return { 
            width: existing?.width ?? "", 
            height: existing?.height ?? "", 
            label 
          };
        });
        replace(newFields);
      }
    } else if (isFormatBShutter) {
      // FIX: Allow multiple shutter sizes but ensure they all have the correct label
      const hasMissingLabel = fields.some((f) => f.label !== "Shutter Painting");
      if (fields.length === 0) {
        replace([{ width: "", height: "", label: "Shutter Painting" }]);
      } else if (hasMissingLabel) {
        replace(fields.map((f) => ({ width: f.width ?? "", height: f.height ?? "", label: "Shutter Painting" })));
      }
    }
  }, [fields, isFormatB, isFormatBWall, isFormatBShutter, bType, replace]);

  const hasData = fields.some(
    (f) => (f.width && String(f.width).trim() !== "") || (f.height && String(f.height).trim() !== "")
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Wall vs Van Toggle - Hidden if data is entered */}
      {isFormatBWall && !hasData && (
        <div className="inline-flex gap-1.5 p-1 rounded-(--r) border border-(--border-3) self-start bg-(--surface)">
          <button
            type="button"
            onClick={() => handleToggle("wall")}
            disabled={busy}
            className={[
              "px-5 py-1.5 text-[12px] font-semibold rounded-[calc(var(--r)-4px)] transition-colors",
              bType === "wall"
                ? "bg-(--ink) text-(--bg-1)"
                : "text-(--ink-3) hover:text-(--ink-2) hover:bg-black/5",
            ].join(" ")}
          >
            Wall
          </button>
          <button
            type="button"
            onClick={() => handleToggle("van")}
            disabled={busy}
            className={[
              "px-5 py-1.5 text-[12px] font-semibold rounded-[calc(var(--r)-4px)] transition-colors",
              bType === "van"
                ? "bg-(--ink) text-(--bg-1)"
                : "text-(--ink-3) hover:text-(--ink-2) hover:bg-black/5",
            ].join(" ")}
          >
            Van
          </button>
        </div>
      )}

      {/* Inputs */}
      <div className="flex flex-col gap-4">
        {fields.map((f, i) => (
          <div key={f.id} className="flex flex-col gap-1.5">
            {/* Display the fixed label if Format B */}
            {isFormatB && f.label && (
              <div className="text-[12px] font-bold text-(--ink-2)">
                {f.label}
              </div>
            )}

            <div className="flex gap-2 items-end">
              {/* Hide the number indexing for Format B so inputs take full width */}
              {!isFormatB && (
                <div className="w-7 h-12 flex items-center justify-center font-(--mono) text-[11px] text-(--ink-3) shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </div>
              )}

              <div className="flex-1 grid grid-cols-2 gap-2">
                <label className={[inputBox, "cursor-text"].join(" ")}>
                  <input
                    {...register(`sizes.${i}.width` as const, {
                      required: !isFormatB, 
                    })}
                    type="number"
                    step="any"
                    placeholder="length"
                    disabled={busy}
                    className={innerInput}
                  />
                </label>
                <label className={[inputBox, "cursor-text"].join(" ")}>
                  <input
                    {...register(`sizes.${i}.height` as const, {
                      required: !isFormatB, 
                    })}
                    type="number"
                    step="any"
                    placeholder="height"
                    disabled={busy}
                    className={innerInput}
                  />
                </label>
              </div>

              {/* FIX: Type A AND Type B Shutter get the remove button spacing */}
              {(!isFormatB || isFormatBShutter) && i > 0 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={busy}
                  className="w-12 h-12 border-0 bg-transparent text-(--rejected) cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <X size={18} weight={2} />
                </button>
              )}
              {(!isFormatB || isFormatBShutter) && i === 0 && (
                <div className="w-12 h-12 shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FIX: Add Button shows for Type A AND Type B Shutter */}
      {(!isFormatB || isFormatBShutter) && (
        <button
          type="button"
          onClick={() => append({ width: "", height: "", label: isFormatBShutter ? "Shutter Painting" : undefined })}
          disabled={busy || atMax}
          className={[
            "flex items-center gap-2.5 mt-1 px-3.5 py-3 border-[1.5px] border-dashed border-(--border-3) rounded-(--r) bg-transparent text-(--ink-2) text-[13px] font-semibold",
            busy || atMax ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          ].join(" ")}
        >
          <Plus size={18} weight={2.2} style={{ color: "var(--accent-deep)" }} />
          Add another size
        </button>
      )}

      {/* Footers */}
      <div className="mt-1 flex flex-col gap-1 text-[11px] text-(--ink-3)">
        {atMax && !isFormatB && (
          <div>Maximum of {MAX_SIZES} sizes per submission.</div>
        )}
        <div className="flex justify-between pt-3 border-t border-(--border-3)">
          <span>Total area auto-calculated</span>
          <span className="font-(--mono) text-(--ink-2)">= {area} ft²</span>
        </div>
      </div>
    </div>
  );
}