import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getCloudinaryUsage, getCloudinaryPhotoBreakdown } from '@/lib/cloudinary';
import { getR2Usage } from '@/lib/r2';
import { Photo, GeneratedFile } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

// External provider calls (Cloudinary / R2) have no built-in socket timeout — a
// blocked egress or slow API would otherwise hang the whole request forever and
// leave the admin UI stuck on "Querying storage providers…". Cap each one so the
// route always responds and the failed provider degrades to "unavailable".
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export const GET = withRole(['admin'], { audit: 'ADMIN_STORAGE_VIEW' })(
  async (req, ctx) => {
    await connectDB();

    // Phase 1 — fast local queries to build lookup sets
    const [photos, fileAgg] = await Promise.all([
      Photo.find({}, { cloudinaryId: 1, previewCloudinaryId: 1 }).lean(),
      GeneratedFile.aggregate([
        { $group: { _id: '$fileType', totalBytes: { $sum: '$fileSize' }, count: { $sum: 1 } } },
      ]),
    ]);

    const printIds     = photos.map((p) => p.cloudinaryId        as string).filter(Boolean);
    const thumbnailIds = photos.map((p) => p.previewCloudinaryId as string).filter(Boolean);

    // Phase 2 — external I/O, all in parallel, each can fail (or time out) independently
    const [cdRes, r2Res, dbRes, breakdownRes] = await Promise.allSettled([
      withTimeout(getCloudinaryUsage(), 12_000, 'cloudinary'),
      withTimeout(getR2Usage(), 12_000, 'r2'),
      withTimeout(mongoose.connection.db!.command({ dbStats: 1 }), 8_000, 'dbStats'),
      withTimeout(getCloudinaryPhotoBreakdown(printIds, thumbnailIds), 15_000, 'cloudinary-breakdown'),
    ]);

    // Shape R2 file-type breakdown from MongoDB aggregate
    const r2Breakdown = Object.fromEntries(
      fileAgg.map((f) => [
        f._id as string,
        { bytes: f.totalBytes as number, count: f.count as number },
      ])
    );

    // R2's S3-compatible API doesn't report total bucket size reliably,
    // so derive it from our GeneratedFile records which track fileSize on write.
    const r2TotalFromDB = fileAgg.reduce((sum, f) => sum + (f.totalBytes as number), 0);

    return ok({
      cloudinary:
        cdRes.status === 'fulfilled'
          ? {
              ...cdRes.value,
              photoCount: photos.length,
              ...(breakdownRes.status === 'fulfilled'
                ? {
                    printBytes:     breakdownRes.value.printBytes,
                    thumbnailBytes: breakdownRes.value.thumbnailBytes,
                  }
                : {}),
            }
          : { error: 'unavailable' },

      r2:
        r2Res.status === 'fulfilled'
          ? {
              totalBytes:  r2Res.value.usedBytes || r2TotalFromDB,
              objectCount: r2Res.value.fileCount,
              breakdown:   r2Breakdown,
            }
          : { totalBytes: r2TotalFromDB, breakdown: r2Breakdown },

      mongodb:
        dbRes.status === 'fulfilled'
          ? {
              dataSize:    dbRes.value.dataSize,
              storageSize: dbRes.value.storageSize,
              collections: dbRes.value.collections,
              objects:     dbRes.value.objects,
              indexes:     dbRes.value.indexes,
              indexSize:   dbRes.value.indexSize,
            }
          : { error: 'unavailable' },
    });
  }
);
