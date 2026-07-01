export const dynamic = 'force-dynamic';

import { err } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';

// GET — list generated files for a job. requireJobOwner guarantees the job belongs to
// the requesting owner (admins pass the role gate), closing the cross-owner IDOR.
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (_req, ctx) => {
    const jobId = ctx.job!._id;
    await connectDB();

    try {
      // Self-heal orphaned generations: a real job finishes in seconds, so anything
      // still 'generating' after STALE_MINUTES never got picked up by a worker.
      // Flip those to 'failed' so they don't sit in the UI's "Building" view forever.
      const STALE_MINUTES = 5;
      await GeneratedFile.updateMany(
        { jobId, status: 'generating', createdAt: { $lt: new Date(Date.now() - STALE_MINUTES * 60_000) } },
        { $set: { status: 'failed' } },
      );

      // Fetch all files for this job, newest first
      const files = await GeneratedFile.find({ jobId })
        .sort({ createdAt: -1 })
        .lean();

      return new Response(JSON.stringify({ files }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to fetch files');
      return err('Failed to fetch files', 500);
    }
  }
);
