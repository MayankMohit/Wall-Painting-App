import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';

// One-off cleanup for GeneratedFile docs orphaned at status 'generating' —
// e.g. jobs enqueued while the worker was on a different queue name, so they
// were never picked up and will sit "generating" forever in the UI.
//
// Only touches docs older than STALE_MINUTES so a genuinely in-progress
// generation (seconds-to-a-minute old) is never affected.
//
// Run:  npx tsx scripts/cleanupStuckFiles.ts
const STALE_MINUTES = Number(process.env.STALE_MINUTES ?? 5);

async function main() {
  await connectDB();

  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000);
  const filter = { status: 'generating', createdAt: { $lt: cutoff } };

  const stuck = await GeneratedFile.find(filter).select('_id jobId fileType createdAt').lean();
  if (stuck.length === 0) {
    console.log(`No stuck 'generating' files older than ${STALE_MINUTES} min. Nothing to do.`);
    return;
  }

  console.log(`Found ${stuck.length} stuck file(s):`);
  for (const f of stuck) {
    console.log(`  - ${f._id} (${f.fileType}) job=${f.jobId} created=${new Date(f.createdAt).toISOString()}`);
  }

  const res = await GeneratedFile.updateMany(filter, { $set: { status: 'failed' } });
  console.log(`Marked ${res.modifiedCount} file(s) as 'failed'. They will drop out of the "Building" view.`);
}

main()
  .catch((err) => {
    console.error('[cleanupStuckFiles] error:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
