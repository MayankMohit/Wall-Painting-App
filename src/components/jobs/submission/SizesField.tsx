// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { UseFormRegister, FieldArrayWithId } from "react-hook-form";
import { X, Plus } from "@/components/jobs/shared/icons";
import { inputBox, innerInput, Suffix } from "./formStyles";

interface SizesFieldProps {
  fields: FieldArrayWithId<any, any, "id">[];
  register: UseFormRegister<any>;
  remove: (index: number) => void;
  append: (value: { width: string; height: string }) => void;
  busy: boolean;
  area: string;
}

export function SizesField({ fields, register, remove, append, busy, area }: SizesFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {fields.map((f, i) => (
        <div key={f.id} className="flex gap-2 items-end">
          <div className="w-7 h-12 flex items-center justify-center font-(--mono) text-[11px] text-(--ink-3) shrink-0">
            {String(i + 1).padStart(2, "0")}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className={inputBox}>
              <input
                {...register(`sizes.${i}.width` as const, { required: true })}
                type="number"
                step="any"
                placeholder="0"
                disabled={busy}
                className={innerInput}
              />
              <Suffix text="ft · length" />
            </div>
            <div className={inputBox}>
              <input
                {...register(`sizes.${i}.height` as const, { required: true })}
                type="number"
                step="any"
                placeholder="0"
                disabled={busy}
                className={innerInput}
              />
              <Suffix text="ft · height" />
            </div>
          </div>
          {i > 0 ? (
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={busy}
              className="w-12 h-12 border-0 bg-transparent text-(--rejected) cursor-pointer shrink-0 flex items-center justify-center"
            >
              <X size={18} weight={2} />
            </button>
          ) : (
            <div className="w-12 h-12 shrink-0" />
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ width: "", height: "" })}
        disabled={busy}
        className={[
          "flex items-center gap-2.5 mt-1 px-[14px] py-3 border-[1.5px] border-dashed border-(--border-3) rounded-(--r) bg-transparent text-(--ink-2) text-[13px] font-semibold font-(--font)",
          busy ? "cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <Plus size={18} weight={2.2} style={{ color: "var(--accent-deep)" }} />
        Add another size
      </button>

      <div className="mt-1 text-[11px] text-(--ink-3) flex justify-between">
        <span>Total area auto-calculated</span>
        <span className="font-(--mono) text-(--ink-2) font-semibold">= {area} ft²</span>
      </div>
    </div>
  );
}
