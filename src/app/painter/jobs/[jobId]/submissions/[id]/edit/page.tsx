"use client";

import { useState, useEffect, use, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  useGetSubmissionQuery,
  useUpdateSubmissionMutation,
  useDeletePhotoMutation,
  type ExPhoto,
} from "@/store/api/endpoints/submissions";
import { X } from "@/components/jobs/shared/icons";
import { SizesField } from "@/components/jobs/submission/SizesField";
import { EditPhotoPicker } from "@/components/jobs/submission/EditPhotoPicker";
import { SubmitButton } from "@/components/jobs/submission/SubmitButton";
import { inputBox, innerInput } from "@/components/jobs/submission/formStyles";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { normalizePickedImages, skippedMessage } from "@/components/jobs/submission/imagePick";
import type { EditFV } from "@/components/jobs/submission/submissionTypes";

export default function EditSubmissionPage({
  params,
}: {
  params: Promise<{ jobId: string; id: string }>;
}) {
  const { jobId, id: subId } = use(params);
  const router = useRouter();
  const [updateSubmission] = useUpdateSubmissionMutation();
  const [deletePhoto]      = useDeletePhotoMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditFV>({
    defaultValues: { location: "", photoNo: "", sizes: [{ width: "", height: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "sizes" });
  const loc  = watch("location");
  const ws   = watch("sizes");
  const area = ws
    .reduce((s, sz) => s + (Number(sz.width) || 0) * (Number(sz.height) || 0), 0)
    .toFixed(1);

  const { uploadFiles, step, setStep } = usePhotoUpload();

  const [exPhotos, setExPhotos] = useState<ExPhoto[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPrevs, setNewPrevs] = useState<string[]>([]);
  const [pickErr, setPickErr]   = useState("");
  const [picking, setPicking]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const urlsRef                 = useRef<string[]>([]);

  useEffect(() => () => { urlsRef.current.forEach(URL.revokeObjectURL); }, []);

  const { data: sub, isLoading, isError, error } = useGetSubmissionQuery({ jobId, subId });

  useEffect(() => {
    if (!sub) return;
    setExPhotos(sub.images ?? []);
    reset({
      location: sub.location,
      photoNo: sub.photoNo != null ? String(sub.photoNo) : "", 
      sizes: sub.sizes?.map((s) => ({ width: String(s[0]), height: String(s[1]) })) ??
        [{ width: "", height: "" }],
    });
  }, [sub, reset]);

  const pickNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files ?? []);
    // Reset so re-picking the same photos fires another change event.
    e.target.value = "";
    if (!arr.length) return;
    setPicking(true);
    setPickErr("");
    try {
      // Decode-test each photo and convert HEIC → JPEG so previews always
      // render and compression can't crash at save (Android can't read HEIC).
      const { files: good, skipped } = await normalizePickedImages(arr);
      if (good.length) {
        urlsRef.current.forEach(URL.revokeObjectURL);
        const urls = good.map((f) => URL.createObjectURL(f));
        urlsRef.current = urls;
        setNewFiles(good);
        setNewPrevs(urls);
      }
      if (skipped) setPickErr(skippedMessage(skipped));
    } finally {
      setPicking(false);
    }
  };

  const dropNew = (i: number) => {
    URL.revokeObjectURL(newPrevs[i]);
    setNewFiles((p) => p.filter((_, j) => j !== i));
    setNewPrevs((p) => {
      const n = p.filter((_, j) => j !== i);
      urlsRef.current = n;
      return n;
    });
  };

  const deleteExisting = async (photoId: string) => {
    if (!confirm("Delete this photo permanently?")) return;
    try {
      await deletePhoto({ jobId, subId, photoId }).unwrap();
      setExPhotos((p) => p.filter((ph) => ph._id !== photoId));
    } catch {
      alert("Failed to delete photo");
    }
  };

  const onSubmit = async (d: EditFV) => {
    setBusy(true);
    try {
      const uploadedImages = newFiles.length ? await uploadFiles(newFiles, jobId) : [];
      setStep("Saving…");
      await updateSubmission({
        jobId,
        subId,
        body: {
          location: d.location,
          photoNo: Number(d.photoNo),
          sizes: d.sizes.map((s) => [Number(s.width), Number(s.height)]),
          uploadedImages,
        },
      }).unwrap();

      router.push(`/painter/jobs/${jobId}/submissions/${subId}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="landing-spinner" />
      </div>
    );
  }

  if (isError || !sub) {
    const msg =
      (error as { data?: { error?: { message?: string } } })?.data?.error?.message ??
      "Failed to load submission";
    return (
      <div className="m-6 p-4 rounded-(--r) bg-(--rejected-soft) text-(--rejected) text-[13px] font-medium border border-[oklch(0.55_0.17_25/0.2)]">
        {msg}
      </div>
    );
  }

  const totalPhotos = exPhotos.length + newFiles.length;

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
          Edit submission
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
          Edit submission
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-4 pt-1 pb-26 lg:px-8 lg:pt-0 lg:pb-11 flex flex-col gap-3.5 lg:gap-5 lg:max-w-180 lg:mx-auto">
          
          {/* Photo Number */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Photo number</div>
            <div className={[inputBox, errors.photoNo ? "border-(--rejected)" : ""].join(" ")}>
              <input
                type="number"
                {...register("photoNo", { required: true, min: 1 })}
                placeholder="e.g. 12"
                disabled={busy}
                className={innerInput}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className={["text-[11px]", errors.photoNo ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
                {errors.photoNo ? "Valid photo number is required." : "The sequence number assigned to this wall."}
              </span>
            </div>
          </div>

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
              Wall sizes <span className="text-(--ink-4) font-medium">· at least one · in feet</span>
            </div>
            <SizesField fields={fields} register={register} remove={remove} append={append} busy={busy} area={area} />
          </div>

          {/* Photos */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
              Photos <span className="text-(--ink-4) font-medium">· {totalPhotos} of 20</span>
            </div>
            <EditPhotoPicker
              exPhotos={exPhotos}
              newFiles={newFiles}
              newPrevs={newPrevs}
              busy={busy || picking}
              onPickNew={pickNew}
              onDropNew={dropNew}
              onDeleteExisting={deleteExisting}
            />
            <div className={["text-[11px] mt-1.5", pickErr && !picking ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
              {picking
                ? "Processing photos…"
                : pickErr || "Tap the × on a photo to remove it · Add more from your gallery."}
            </div>
          </div>

          {/* Desktop submit */}
          <div className="hidden lg:block">
            <SubmitButton busy={busy} step={step} label="Save changes" />
          </div>
        </div>

        {/* Mobile fixed submit */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-51 px-4 pt-3 pb-7 bg-(--paper) border-t border-(--border)">
          <SubmitButton busy={busy} step={step} label="Save changes" />
        </div>
      </form>
    </div>
  );
}
