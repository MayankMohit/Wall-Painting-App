"use client";

import { useState, use, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useCreateSubmissionMutation, useGetSubmissionsQuery } from "@/store/api/endpoints/submissions";
import { X } from "@/components/jobs/shared/icons";
import { SizesField } from "@/components/jobs/submission/SizesField";
import { PhotoPicker } from "@/components/jobs/submission/PhotoPicker";
import { SubmitButton } from "@/components/jobs/submission/SubmitButton";
import { inputBox, innerInput, Suffix } from "@/components/jobs/submission/formStyles";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import type { FV } from "@/components/jobs/submission/submissionTypes";

// RTK Query surfaces API failures as { status, data: { error: { code, message } } }.
// These read that envelope safely, falling back to a plain Error's message.
function errEnvelope(e: unknown): { code?: string; message?: string } {
  if (e && typeof e === "object" && "data" in e) {
    const data = (e as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      return (data as { error: { code?: string; message?: string } }).error ?? {};
    }
  }
  return {};
}
const errCode = (e: unknown): string | undefined => errEnvelope(e).code;
const errMessage = (e: unknown): string =>
  errEnvelope(e).message ??
  (e instanceof Error ? e.message : "Something went wrong. Please try again.");

export default function NewSubmissionPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const [createSubmission] = useCreateSubmissionMutation();

  // Photo numbers this painter has already used on this job — used to validate the
  // photoNo field inline before uploading, so a duplicate never wastes an upload.
  const { data: mySubmissions } = useGetSubmissionsQuery(jobId);
  const usedPhotoNos = new Set(
    (mySubmissions ?? []).map((s) => s.photoNo).filter((n): n is number => n != null),
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<FV>({
    defaultValues: { location: "", photoNo: "", sizes: [{ width: "", height: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "sizes" });
  const loc = watch("location");
  const ws = watch("sizes");
  const area = ws
    .reduce((s, sz) => s + (Number(sz.width) || 0) * (Number(sz.height) || 0), 0)
    .toFixed(1);

  const { uploadFiles, step, setStep } = usePhotoUpload();

  const [files, setFiles]       = useState<File[]>([]);
  const [prevs, setPrevs]       = useState<string[]>([]);
  const [photoErr, setPhotoErr] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [busy, setBusy]         = useState(false);
  const urlsRef                 = useRef<string[]>([]);

  useEffect(() => () => { urlsRef.current.forEach(URL.revokeObjectURL); }, []);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    urlsRef.current.forEach(URL.revokeObjectURL);
    const arr  = Array.from(e.target.files);
    const urls = arr.map((f) => URL.createObjectURL(f));
    urlsRef.current = urls;
    setFiles(arr);
    setPrevs(urls);
    setPhotoErr(false);
  };

  const drop = (i: number) => {
    URL.revokeObjectURL(prevs[i]);
    setFiles((p) => p.filter((_, j) => j !== i));
    setPrevs((p) => {
      const n = p.filter((_, j) => j !== i);
      urlsRef.current = n;
      return n;
    });
  };

  const onSubmit = async (d: FV) => {
    if (!files.length) { setPhotoErr(true); return; }
    setSubmitErr("");
    setBusy(true);
    try {
      const uploadedImages = await uploadFiles(files, jobId);
      setStep("Saving…");
      await createSubmission({
        jobId,
        body: {
          photoNo: Number(d.photoNo),
          location: d.location,
          sizes: d.sizes.map((s) => [Number(s.width), Number(s.height)]),
          uploadedImages,
        },
      }).unwrap();

      router.push(`/painter/jobs/${jobId}`);
    } catch (e: unknown) {
      const code = errCode(e);
      if (code === "DUPLICATE_PHOTO_NO") {
        // Server rejected a photo number that slipped past the inline check (e.g. a
        // parallel submission). Point the painter straight at the field to fix.
        setError("photoNo", {
          type: "duplicate",
          message: `Photo number ${d.photoNo} is already used on this job. Pick a different one.`,
        });
      } else {
        setSubmitErr(errMessage(e));
      }
      setBusy(false);
    }
  };

  return (
    <div className="bg-(--paper) min-h-svh">
      {/* ── MOBILE TopBar ────────────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-10 bg-(--paper) border-b border-(--border) px-4 py-2.5 flex items-center gap-2.5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 border-0 rounded-full bg-transparent text-(--ink) cursor-pointer flex items-center justify-center shrink-0"
        >
          <X size={22} weight={1.8} />
        </button>
        <div className="text-[17px] font-semibold tracking-[-0.015em] text-(--ink)">
          New submission
        </div>
      </div>

      {/* ── DESKTOP Header ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-3 max-w-180 mx-auto px-8 pt-11 pb-7">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 border border-(--border-2) rounded-full bg-transparent text-(--ink) cursor-pointer flex items-center justify-center shrink-0"
        >
          <X size={18} weight={1.8} />
        </button>
        <div className="text-[22px] font-bold tracking-[-0.02em] text-(--ink)">
          New submission
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-4 pt-1 pb-26 lg:px-8 lg:pt-0 lg:pb-11 flex flex-col gap-3.5 lg:gap-5 lg:max-w-180 lg:mx-auto">
          {/* Location */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Wall location</div>
            <div className={[inputBox, errors.location ? "border-(--rejected)" : ""].join(" ")}>
              <input
                {...register("location", { required: true, maxLength: 100 })}
                placeholder="Hallway 8A — north wall"
                disabled={busy}
                className={innerInput}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className={["text-[11px]", errors.location ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
                {errors.location?.type === "maxLength" ? "100 character limit reached." : errors.location ? "Location is required." : "Where is this wall on the job site? Be specific."}
              </span>
              <span className={["text-[11px] font-(--mono) tabular-nums shrink-0 ml-2", (loc?.length ?? 0) > 100 ? "text-(--rejected)" : (loc?.length ?? 0) > 80 ? "text-amber-500" : "text-(--ink-4)"].join(" ")}>
                {loc?.length ?? 0} / 100
              </span>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
              Wall sizes <span className="text-(--ink-4) font-medium">· at least one</span>
            </div>
            <SizesField fields={fields} register={register} remove={remove} append={append} busy={busy} area={area} />
          </div>

          {/* Photo number */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Photo number</div>
            <div className={[inputBox, "max-w-55 lg:max-w-none lg:w-60", errors.photoNo ? "border-(--rejected)" : ""].join(" ")}>
              <input
                {...register("photoNo", {
                  required: "Required.",
                  validate: (v) =>
                    usedPhotoNos.has(Number(v))
                      ? `Photo number ${v} is already used on this job. Pick a different one.`
                      : true,
                })}
                type="number"
                min="1"
                placeholder="07"
                disabled={busy}
                className={[innerInput, "font-(--mono)"].join(" ")}
              />
              <Suffix text="of submission" />
            </div>
            <div className={["text-[11px] mt-1.5", errors.photoNo ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
              {errors.photoNo?.message ?? "Sequence number for this submission's photos."}
            </div>
          </div>

          {/* Photos */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
              Photos <span className="text-(--ink-4) font-medium">· {files.length} of 20</span>
            </div>
            <PhotoPicker files={files} prevs={prevs} photoErr={photoErr} busy={busy} onPick={pick} onDrop={drop} />
            <div className={["text-[11px] mt-1.5", photoErr ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
              {photoErr ? "Pick at least one photo." : "Pick photos from your gallery · max 20 per submission."}
            </div>
          </div>

          {/* Submit error (network / server failures that aren't a duplicate photo no.) */}
          {submitErr && (
            <div className="rounded-xl border border-(--rejected) bg-(--rejected)/8 px-3.5 py-3 text-[13px] text-(--rejected)">
              {submitErr}
            </div>
          )}

          {/* Desktop submit */}
          <div className="hidden lg:block">
            <SubmitButton busy={busy} step={step} />
          </div>
        </div>

        {/* Mobile fixed submit */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-51 px-4 pt-3 pb-7 bg-(--paper) border-t border-(--border)">
          <SubmitButton busy={busy} step={step} />
        </div>
      </form>
    </div>
  );
}
