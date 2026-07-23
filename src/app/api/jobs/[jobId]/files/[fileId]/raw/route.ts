import { err, notFound, badRequest } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { r2 } from '@/lib/r2';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';

// GET — stream the raw file bytes for an owned job, same-origin. This lets the
// browser build a real File object (for the Web Share API / WhatsApp file share)
// without needing CORS on the R2 bucket. requireJobOwner enforces ownership.
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

      const buffer = await r2.getObjectBuffer(file.r2Path);
      const ext = file.r2Path.split('.').pop();
      const mime = ext === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to stream file');
      return err('Failed to stream file', 500);
    }
  }
);
