import { err, notFound } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';

// GET — generation status for a file on an owned job (requireJobOwner).
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (_req, ctx) => {
    const jobId = ctx.job!._id;
    const { taskId } = ctx.params;
    await connectDB();

    try {
      const file = await GeneratedFile.findOne({ _id: taskId, jobId }).lean();
      if (!file) return notFound('File task not found');

      // If it's ready, progress is 100. Otherwise, let the frontend animate 50%
      const progress = file.status === 'ready' ? 100 : 50;

      return new Response(JSON.stringify({
        status: file.status,
        progress,
        taskId: file._id,
        r2Url: file.r2Url, // Will be present if ready
      }), { status: 200 });
    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to check file status');
      return err('Failed to check file status', 500);
    }
  }
);
