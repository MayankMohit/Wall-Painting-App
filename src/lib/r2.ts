import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// --- INDIVIDUAL EXPORTS (For your Admin Dashboard) ---
export async function getR2Usage() {
  let totalBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const res = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents ?? []) totalBytes += obj.Size ?? 0;
    objectCount += res.KeyCount ?? 0;
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return { usedBytes: totalBytes, fileCount: objectCount };
}

// --- R2 OBJECT (For your new Workers and API routes) ---
export const r2 = {
  upload: async (key: string, body: Buffer, contentType: string) => {
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return key;
  },

  getSignedPreviewUrl: async (key: string) => {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  },

  getSignedDownloadUrl: async (key: string, customFileName?: string) => {
    // Fallback to the end of the key if no custom name is provided
    const filename = customFileName || key.split('/').pop() || 'download';
    
    const command = new GetObjectCommand({ 
      Bucket: BUCKET_NAME, 
      Key: key,
      // This is the magic line that forces the browser to download instead of view!
      ResponseContentDisposition: `attachment; filename="${filename}"` 
    });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  },

  delete: async (key: string) => {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  },
};