import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

function makeClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function getR2Usage() {
  const client = makeClient();
  const bucket = process.env.R2_BUCKET_NAME!;

  let totalBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents ?? []) totalBytes += obj.Size ?? 0;
    objectCount += res.KeyCount ?? 0;
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return { bucket, objectCount, totalBytes };
}
