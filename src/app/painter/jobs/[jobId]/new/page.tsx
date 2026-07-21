"use client";

import { useState, use, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useCreateSubmissionMutation, useGetSubmissionsQuery } from "@/store/api/endpoints/submissions";
import { useGetJobQuery } from "@/store/api/endpoints/jobs";
import { X } from "@/components/jobs/shared/icons";
import { SizesField } from "@/components/jobs/submission/SizesField";
import { PhotoPicker } from "@/components/jobs/submission/PhotoPicker";
import { SubmitButton } from "@/components/jobs/submission/SubmitButton";
import { inputBox, innerInput, Suffix } from "@/components/jobs/submission/formStyles";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { normalizePickedImages, skippedMessage } from "@/components/jobs/submission/imagePick";
import type { FV } from "@/components/jobs/submission/submissionTypes";

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

  const { data: job, isLoading: jobLoading } = useGetJobQuery(jobId);
  const [createSubmission] = useCreateSubmissionMutation();

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
  } = useForm<FV & { sizes: { width: string; height: string; label?: string }[] }>({
    defaultValues: { location: "", photoNo: "", sizes: [{ width: "", height: "" }] },
  });
  
  const { fields, append, remove, replace } = useFieldArray({ control, name: "sizes" });
  
  const loc = watch("location");
  const ws = watch("sizes");
  const selectedPosition = watch("aboveBelow");
  const area = ws
    .reduce((s, sz) => s + (Number(sz.width) || 0) * (Number(sz.height) || 0), 0)
    .toFixed(1);

  const { uploadFiles, step, setStep } = usePhotoUpload();

  const [files, setFiles]       = useState<File[]>([]);
  const [prevs, setPrevs]       = useState<string[]>([]);
  const [photoErr, setPhotoErr] = useState(false);
  const [pickErr, setPickErr]   = useState("");
  const [sizeErr, setSizeErr]   = useState(""); // NEW: Local state for zero-sizes error
  const [picking, setPicking]   = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [busy, setBusy]         = useState(false);
  const urlsRef                 = useRef<string[]>([]);

  useEffect(() => () => { urlsRef.current.forEach(URL.revokeObjectURL); }, []);

  // NEW: Instantly clear the size error as soon as the user types a valid size
  useEffect(() => {
    const hasFilled = ws.some((s) => s.width && s.height);
    if (hasFilled) setSizeErr("");
  }, [ws]);

  const isFormatB = job?.pdfFormat === 'B';
  const isVan = job?.jobType === 'Van';
  const showSizes = !(isFormatB && isVan); 

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!arr.length) return;
    setPicking(true);
    setPickErr("");
    try {
      const { files: good, skipped } = await normalizePickedImages(arr);
      if (good.length) {
        urlsRef.current.forEach(URL.revokeObjectURL);
        const urls = good.map((f) => URL.createObjectURL(f));
        urlsRef.current = urls;
        setFiles(good);
        setPrevs(urls);
        setPhotoErr(false);
      }
      if (skipped) setPickErr(skippedMessage(skipped));
    } finally {
      setPicking(false);
    }
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

  const onSubmit = async (d: any) => {
    if (!files.length) { setPhotoErr(true); return; }
    setSubmitErr("");
    setBusy(true);
    try {
      let finalSizes: [number, number][] | undefined = undefined;
      let finalSizeLabels: string[] | undefined = undefined;

      if (showSizes && d.sizes) {
        const filledSizes = d.sizes.filter((s: any) => s.width && s.height);
        
        if (filledSizes.length === 0) {
          // FIX: Use local state instead of hook-form's setError so it doesn't lock the form
          setSizeErr("Please enter at least one complete size.");
          setBusy(false);
          return;
        }

        finalSizes = filledSizes.map((s: any) => [Number(s.width), Number(s.height)]);
        
        if (isFormatB) {
          finalSizeLabels = filledSizes.map((s: any) => s.label).filter(Boolean);
        }
      }

      const uploadedImages = await uploadFiles(files, jobId);
      setStep("Saving…");

      await createSubmission({
        jobId,
        body: {
          photoNo: Number(d.photoNo),
          location: d.location, 
          sizes: finalSizes,
          sizeLabels: finalSizeLabels,
          shopName: isFormatB ? (d.shopName || "") : undefined,
          contactNo: isFormatB ? (d.contactNo || "") : undefined,
          vanNo: isFormatB ? (d.vanNo || "") : undefined,
          aboveBelow: (isFormatB && isVan) ? d.aboveBelow : undefined,
          uploadedImages,
        },
      }).unwrap();

      router.push(`/painter/jobs/${jobId}`);
    } catch (e: unknown) {
      const code = errCode(e);
      if (code === "DUPLICATE_PHOTO_NO") {
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

  if (jobLoading) {
    return <div className="p-8 text-center text-sm text-(--ink-3)">Loading...</div>;
  }

  return (
    <div className="bg-(--paper) min-h-svh">
      {/* ── MOBILE TopBar ────────────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-10 bg-(--paper) border-b border-(--border) px-4 py-2.5 flex items-center gap-2.5">
        <button onClick={() => router.back()} className="w-9 h-9 border-0 rounded-full bg-transparent text-(--ink) cursor-pointer flex items-center justify-center shrink-0">
          <X size={22} weight={1.8} />
        </button>
        <div className="text-[17px] font-semibold tracking-[-0.015em] text-(--ink)">
          New submission
        </div>
      </div>

      {/* ── DESKTOP Header ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-3 max-w-180 mx-auto px-8 pt-11 pb-7">
        <button onClick={() => router.back()} className="w-9 h-9 border border-(--border-2) rounded-full bg-transparent text-(--ink) cursor-pointer flex items-center justify-center shrink-0">
          <X size={18} weight={1.8} />
        </button>
        <div className="text-[22px] font-bold tracking-[-0.02em] text-(--ink)">
          New submission
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-4 pt-1 pb-26 lg:px-8 lg:pt-0 lg:pb-11 flex flex-col gap-3.5 lg:gap-5 lg:max-w-180 lg:mx-auto">
          
          {isFormatB && (
            <div>
              <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Name of the Shop/Office/Person</div>
              <div className={[inputBox, errors.shopName ? "border-(--rejected)" : ""].join(" ")}>
                <input
                  {...register("shopName", { required: true })}
                  placeholder="e.g. Prashad Hardware"
                  disabled={busy}
                  className={innerInput}
                />
              </div>
              {errors.shopName && <div className="text-[11px] text-(--rejected) mt-1.5">Name is required.</div>}
            </div>
          )}

          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
              {isFormatB ? "Address" : "Wall location"}
            </div>
            <div className={[inputBox, errors.location ? "border-(--rejected)" : ""].join(" ")}>
              <input
                {...register("location", { required: true, maxLength: 100 })}
                placeholder="e.g. Main Road - Ranchi"
                disabled={busy}
                className={innerInput}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className={["text-[11px]", errors.location ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
                {errors.location?.type === "maxLength" 
                  ? "100 character limit reached." 
                  : errors.location 
                    ? `${isFormatB ? "Address" : "Location"} is required.` 
                    : isFormatB ? "Provide the full address." : "Where is this wall on the job site? Be specific."}
              </span>
              <span className={["text-[11px] font-(--mono) tabular-nums shrink-0 ml-2", (loc?.length ?? 0) > 100 ? "text-(--rejected)" : (loc?.length ?? 0) > 80 ? "text-amber-500" : "text-(--ink-4)"].join(" ")}>
                {loc?.length ?? 0} / 100
              </span>
            </div>
          </div>

          {isFormatB && (
            <div>
              <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Contact No.</div>
              <div className={[inputBox, errors.contactNo ? "border-(--rejected)" : ""].join(" ")}>
                <input
                  {...register("contactNo", { required: true })}
                  placeholder="+91..."
                  disabled={busy}
                  className={innerInput}
                />
              </div>
              {errors.contactNo && <div className="text-[11px] text-(--rejected) mt-1.5">Contact number is required.</div>}
            </div>
          )}

          {isFormatB && isVan && (
            <div>
              <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
                Van No.
              </div>
              <div className={[inputBox, errors.vanNo ? "border-(--rejected)" : ""].join(" ")}>
                <input
                  {...register("vanNo", { required: true })}
                  placeholder="e.g. JH01AB-1234"
                  disabled={busy}
                  className={innerInput}
                />
              </div>
              {errors.vanNo && <div className="text-[11px] text-(--rejected) mt-1.5">Van number is required.</div>}
            </div>
          )}

          {isFormatB && isVan && (
            <div>
              <div className="text-[12px] font-semibold text-(--ink-2) mb-2.5">Position</div>
              <div className="flex gap-3 mb-1">
                {['Above', 'Below'].map((pos) => {
                  const isSelected = selectedPosition === pos;
                  return (
                    <label 
                      key={pos} 
                      className={`flex-1 flex items-center justify-center h-10 rounded-(--r) border text-[13px] font-medium cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-(--ink) text-(--bg-1) border-(--ink)' 
                          : 'bg-transparent text-(--ink-2) border-(--border-3) hover:border-(--ink-4)'
                      }`}
                    >
                      <input 
                        type="radio" 
                        value={pos}
                        {...register("aboveBelow", { required: true })}
                        className="hidden"
                      />
                      {pos}
                    </label>
                  );
                })}
              </div>
              {errors.aboveBelow && <div className="text-[11px] text-(--rejected) mt-1.5">Please select a position.</div>}
            </div>
          )}

          {showSizes && (
            <div>
              <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
                {isFormatB ? "Sizes" : "Wall sizes"} <span className="text-(--ink-4) font-medium">· at least one · in feet</span>
              </div>
              <SizesField 
                fields={fields} 
                register={register} 
                remove={remove} 
                append={append} 
                replace={replace}
                busy={busy} 
                area={area} 
                isFormatB={isFormatB}
                jobType={job?.jobType as "Wall" | "Shutter" | "Van"}
                errors={errors}
              />
              {/* FIX: Displays the un-stuck local error state */}
              {sizeErr && (
                <div className="text-[12px] text-(--rejected) mt-2 font-bold">
                  {sizeErr}
                </div>
              )}
            </div>
          )}

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

          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
              Photos <span className="text-(--ink-4) font-medium">· {files.length} of 20</span>
            </div>
            <PhotoPicker files={files} prevs={prevs} photoErr={photoErr} busy={busy || picking} onPick={pick} onDrop={drop} />
            <div className={["text-[11px] mt-1.5", (photoErr || pickErr) && !picking ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
              {picking
                ? "Processing photos…"
                : photoErr
                  ? "Pick at least one photo."
                  : pickErr || "Pick photos from your gallery · max 20 per submission."}
            </div>
          </div>

          {submitErr && (
            <div className="rounded-xl border border-(--rejected) bg-(--rejected)/8 px-3.5 py-3 text-[13px] text-(--rejected)">
              {submitErr}
            </div>
          )}

          <div className="hidden lg:block">
            <SubmitButton busy={busy} step={step} />
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-51 px-4 pt-3 pb-7 bg-(--paper) border-t border-(--border)">
          <SubmitButton busy={busy} step={step} />
        </div>
      </form>
    </div>
  );
}