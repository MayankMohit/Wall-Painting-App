import { Types } from 'mongoose';
import { Job } from '@/lib/models/Job';
import { GeneratedFile } from '@/lib/models/GeneratedFile';

export const STORAGE_LIMIT_BYTES = 200 * 1024 * 1024; // 200 MB

/**
 * Returns total bytes of ready R2 files across all jobs owned by the given user.
 */
export async function getOwnerStorageBytes(ownerId: string | Types.ObjectId): Promise<number> {
  const ownerJobIds = await Job.find({ ownerId }).select('_id').lean();
  if (ownerJobIds.length === 0) return 0;

  const ids = ownerJobIds.map(j => j._id);
  const [row] = await GeneratedFile.aggregate<{ total: number }>([
    { $match: { jobId: { $in: ids }, status: 'ready', fileSize: { $exists: true } } },
    { $group: { _id: null, total: { $sum: '$fileSize' } } },
  ]);
  return row?.total ?? 0;
}
