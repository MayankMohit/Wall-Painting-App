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

export async function uploadToCloudinary(
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
  if (!r.ok) throw new Error("Upload failed");
  return r.json();
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
