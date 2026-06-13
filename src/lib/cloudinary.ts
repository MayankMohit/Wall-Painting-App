import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { STORAGE_ENV } from '@/lib/storageEnv';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export async function getCloudinaryUsage() {
  return cloudinary.api.usage();
}

export async function getCloudinaryPhotoBreakdown(
  printIds: string[],
  thumbnailIds: string[],
) {
  const BATCH = 100;

  async function sumIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const res = await cloudinary.api.resources_by_ids(ids.slice(i, i + BATCH));
      for (const r of res.resources as { bytes: number }[]) total += r.bytes ?? 0;
    }
    return total;
  }

  const [printBytes, thumbnailBytes] = await Promise.all([
    sumIds(printIds),
    sumIds(thumbnailIds),
  ]);
  return { printBytes, thumbnailBytes };
}

interface SignParams {
  folder?: string;
}

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  uploadPreset: string | null;
  folder: string | null;
}

export function signUpload(params: SignParams = {}): CloudinarySignature {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? null;

  // Enforce a per-environment top-level folder server-side (never trust the
  // client) so dev and prod assets never collide in a shared Cloudinary cloud.
  const folder = params.folder ? `${STORAGE_ENV}/${params.folder}` : STORAGE_ENV;

  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  if (uploadPreset) paramsToSign.upload_preset = uploadPreset;

  const paramStr = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(paramStr + apiSecret)
    .digest('hex');

  return {
    signature,
    timestamp,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    uploadPreset,
    folder,
  };
}
