import { err, notFound, badRequest } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { r2 } from '@/lib/r2';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';

// GET — signed preview URL for a file on an owned job (requireJobOwner).
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (_req, ctx) => {
    const jobId = ctx.job!._id;
    const { fileId } = ctx.params;
    await connectDB();

    try {
      const file = await GeneratedFile.findOne({ _id: fileId, jobId });
      if (!file) return notFound('File not found');

      if (file.status !== 'ready' || !file.r2Path) {
        return badRequest('File is not ready yet');
      }

      const url = await r2.getSignedPreviewUrl(file.r2Path);
      return new Response(JSON.stringify({ url, fileType: file.fileType }), { status: 200 });
    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to generate preview link');
      return err('Failed to generate preview link', 500);
    }
  }
);
