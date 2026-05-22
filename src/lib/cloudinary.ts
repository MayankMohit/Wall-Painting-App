import crypto from 'crypto';

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

  const paramsToSign: Record<string, string | number> = { timestamp };
  if (params.folder) paramsToSign.folder = params.folder;
  if (uploadPreset) paramsToSign.upload_preset = uploadPreset;

  const paramStr = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
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
    folder: params.folder ?? null,
  };
}
