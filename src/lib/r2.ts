import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3Client;
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME!;
}

export async function getR2Usage() {
  let totalBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const res = await getS3Client().send(new ListObjectsV2Command({
      Bucket: getBucket(),
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents ?? []) totalBytes += obj.Size ?? 0;
    objectCount += res.KeyCount ?? 0;
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return { usedBytes: totalBytes, fileCount: objectCount };
}

export const r2 = {
  upload: async (key: string, body: Buffer, contentType: string) => {
    await getS3Client().send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return key;
  },

  // Fetch the raw object bytes (used to stream a file same-origin so the browser
  // can build a real File for the Web Share API without hitting R2 CORS).
  getObjectBuffer: async (key: string): Promise<Buffer> => {
    const res = await getS3Client().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  },

  getSignedPreviewUrl: async (key: string) => {
    const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
    return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  },

  getSignedDownloadUrl: async (key: string, customFileName?: string) => {
    const filename = customFileName || key.split('/').pop() || 'download';
    const command = new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });
    return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  },

  delete: async (key: string) => {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  },
};
