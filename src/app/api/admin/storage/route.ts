import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getCloudinaryUsage, getCloudinaryPhotoBreakdown } from '@/lib/cloudinary';
import { getR2Usage } from '@/lib/r2';
import { Photo, GeneratedFile } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

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

    // Phase 2 — external I/O, all in parallel, each can fail independently
    const [cdRes, r2Res, dbRes, breakdownRes] = await Promise.allSettled([
      getCloudinaryUsage(),
      getR2Usage(),
      mongoose.connection.db!.command({ dbStats: 1 }),
      getCloudinaryPhotoBreakdown(printIds, thumbnailIds),
    ]);

    // Shape R2 file-type breakdown from MongoDB aggregate
    const r2Breakdown = Object.fromEntries(
      fileAgg.map((f) => [
        f._id as string,
        { bytes: f.totalBytes as number, count: f.count as number },
      ])
    );

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
          ? { ...r2Res.value, breakdown: r2Breakdown }
          : { error: 'unavailable' },

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
