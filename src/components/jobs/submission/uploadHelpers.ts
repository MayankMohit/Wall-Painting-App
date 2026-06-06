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
