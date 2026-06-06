"use client";

import { useState, useEffect, use, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
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
import { uploadToCloudinary } from "@/components/jobs/submission/uploadHelpers";
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
    defaultValues: { location: "", sizes: [{ width: "", height: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "sizes" });
  const ws   = watch("sizes");
  const area = ws
    .reduce((s, sz) => s + (Number(sz.width) || 0) * (Number(sz.height) || 0), 0)
    .toFixed(1);

  const [exPhotos, setExPhotos] = useState<ExPhoto[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPrevs, setNewPrevs] = useState<string[]>([]);
  const [busy, setBusy]         = useState(false);
  const [step, setStep]         = useState("");
  const urlsRef                 = useRef<string[]>([]);

  useEffect(() => () => { urlsRef.current.forEach(URL.revokeObjectURL); }, []);

  const { data: sub, isLoading, isError, error } = useGetSubmissionQuery({ jobId, subId });

  useEffect(() => {
    if (!sub) return;
    setExPhotos(sub.images ?? []);
    reset({
      location: sub.location,
      sizes: sub.sizes?.map((s) => ({ width: String(s[0]), height: String(s[1]) })) ??
        [{ width: "", height: "" }],
    });
  }, [sub, reset]);

  const pickNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    urlsRef.current.forEach(URL.revokeObjectURL);
    const arr  = Array.from(e.target.files);
    const urls = arr.map((f) => URL.createObjectURL(f));
    urlsRef.current = urls;
    setNewFiles(arr);
    setNewPrevs(urls);
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
      const tok   = localStorage.getItem("wallpainter_token")!;
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
      const key   = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;
      let uploadedImages: {
        cloudinaryId: string;
        cloudinaryUrl: string;
        previewCloudinaryId: string;
        previewCloudinaryUrl: string;
      }[] = [];

      if (newFiles.length) {
        setStep("Getting signature…");
        const sr = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
          body: JSON.stringify({ folder: `jobs/${jobId}` }),
        });
        if (!sr.ok) throw new Error("Signature failed");
        const sig = (await sr.json()).data;

        setStep(`Uploading ${newFiles.length} photo${newFiles.length > 1 ? "s" : ""}…`);
        uploadedImages = await Promise.all(
          newFiles.map(async (f) => {
            const [full, preview] = await Promise.all([
              uploadToCloudinary(
                await imageCompression(f, { maxSizeMB: 2, maxWidthOrHeight: 2000, initialQuality: 0.85 }),
                sig, key, cloud,
              ),
              uploadToCloudinary(
                await imageCompression(f, { maxSizeMB: 0.3, maxWidthOrHeight: 800, initialQuality: 0.6 }),
                sig, key, cloud,
              ),
            ]);
            return {
              cloudinaryId:         full.public_id,
              cloudinaryUrl:        full.secure_url,
              previewCloudinaryId:  preview.public_id,
              previewCloudinaryUrl: preview.secure_url,
            };
          }),
        );
      }

      setStep("Saving…");
      await updateSubmission({
        jobId,
        subId,
        body: {
          location: d.location,
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
      <div className="m-6 p-4 rounded-(--r) bg-(--rejected-soft) text-(--rejected) text-[13px] font-medium border border-[oklch(0.55_0.17_25_/_0.2)]">
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
      <div className="hidden lg:flex items-center gap-3 max-w-[720px] mx-auto px-8 pt-11 pb-7">
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
        <div className="px-4 pt-1 pb-[104px] lg:px-8 lg:pt-0 lg:pb-11 flex flex-col gap-[14px] lg:gap-5 lg:max-w-[720px] lg:mx-auto">
          {/* Location */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">Wall location</div>
            <div className={[inputBox, errors.location ? "border-(--rejected)" : ""].join(" ")}>
              <input
                {...register("location", { required: true })}
                placeholder="Hallway 8A — north wall"
                disabled={busy}
                className={innerInput}
              />
            </div>
            <div className={["text-[11px] mt-1.5", errors.location ? "text-(--rejected)" : "text-(--ink-3)"].join(" ")}>
              {errors.location ? "Location is required." : "Where is this wall on the job site? Be specific."}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <div className="text-[12px] font-semibold text-(--ink-2) mb-1.5">
              Wall sizes <span className="text-(--ink-4) font-medium">· at least one</span>
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
              busy={busy}
              onPickNew={pickNew}
              onDropNew={dropNew}
              onDeleteExisting={deleteExisting}
            />
            <div className="text-[11px] mt-1.5 text-(--ink-3)">
              Tap the × on a photo to remove it · Add more from your gallery.
            </div>
          </div>

          {/* Desktop submit */}
          <div className="hidden lg:block">
            <SubmitButton busy={busy} step={step} label="Save changes" />
          </div>
        </div>

        {/* Mobile fixed submit */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[51] px-4 pt-3 pb-7 bg-(--paper) border-t border-(--border)">
          <SubmitButton busy={busy} step={step} label="Save changes" />
        </div>
      </form>
    </div>
  );
}
