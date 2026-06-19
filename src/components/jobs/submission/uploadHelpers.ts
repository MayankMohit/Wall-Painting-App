import imageCompression from 'browser-image-compression';

export interface UploadSig {
  signature: string;
  timestamp: number;
  folder: string;
}

export interface CloudinaryResult {
  public_id: string;
  secure_url: string;
}

// One POST to Cloudinary. Parses Cloudinary's error body so failures surface a
// real reason instead of a generic "Upload failed".
async function postToCloudinary(
  file: File,
  sig: UploadSig,
  apiKey: string,
  cloudName: string,
): Promise<CloudinaryResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("signature", sig.signature);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("api_key", apiKey);
  fd.append("folder", sig.folder);
  const r = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: fd },
  );
  if (!r.ok) {
    let reason = `HTTP ${r.status}`;
    try {
      const body = await r.json();
      if (body?.error?.message) reason = body.error.message;
    } catch { /* non-JSON error body */ }
    const err = new Error(`Cloudinary upload failed: ${reason}`);
    // 4xx (bad signature, invalid file) won't fix themselves — don't retry those.
    (err as { retryable?: boolean }).retryable = r.status === 429 || r.status >= 500;
    throw err;
  }
  return r.json();
}

// Upload with a few retries on transient failures (network blips, 429/5xx).
// A single hiccup on one of many photos must not fail the whole submission.
export async function uploadToCloudinary(
  file: File,
  sig: UploadSig,
  apiKey: string,
  cloudName: string,
  attempts = 3,
): Promise<CloudinaryResult> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await postToCloudinary(file, sig, apiKey, cloudName);
    } catch (e) {
      lastErr = e;
      // Stop early on definitive (non-retryable) errors.
      if (e instanceof Error && (e as { retryable?: boolean }).retryable === false) break;
      if (i < attempts - 1) {
        await new Promise((res) => setTimeout(res, 400 * 2 ** i));
      }
    }
  }
  throw lastErr;
}

export interface UploadedImage {
  cloudinaryId: string;
  cloudinaryUrl: string;
  previewCloudinaryId: string;
  previewCloudinaryUrl: string;
}

export async function compressAndUpload(
  file: File,
  sig: UploadSig,
  apiKey: string,
  cloudName: string,
): Promise<UploadedImage> {
  const [full, preview] = await Promise.all([
    uploadToCloudinary(
      await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 2000, initialQuality: 0.85 }),
      sig, apiKey, cloudName,
    ),
    uploadToCloudinary(
      await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, initialQuality: 0.6 }),
      sig, apiKey, cloudName,
    ),
  ]);
  return {
    cloudinaryId:         full.public_id,
    cloudinaryUrl:        full.secure_url,
    previewCloudinaryId:  preview.public_id,
    previewCloudinaryUrl: preview.secure_url,
  };
}
