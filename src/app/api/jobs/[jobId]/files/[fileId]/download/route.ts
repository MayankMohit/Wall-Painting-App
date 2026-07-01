import { err, notFound, badRequest } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { r2 } from '@/lib/r2';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';

// GET — signed download URL for a file on an owned job (requireJobOwner).
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (_req, ctx) => {
    const jobId = ctx.job!._id;
    const { fileId } = ctx.params;
    await connectDB();

    try {
      const file = await GeneratedFile.findOne({ _id: fileId, jobId });
      if (!file) return notFound('File not found');

      if (file.status !== 'ready' || !file.r2Path) {
        return badRequest('File is not ready for download yet');
      }

      // 1. Generate a secure, expiring URL directly from Cloudflare R2
      const downloadUrl = await r2.getSignedDownloadUrl(file.r2Path, file.fileName);

      // 2. Increment the download counter for your analytics
      file.downloadCount += 1;
      await file.save();

      // 3. Send the secure URL to the frontend so the browser can download it
      return new Response(JSON.stringify({ url: downloadUrl }), { status: 200 });
    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to generate download link');
      return err('Failed to generate download link', 500);
    }
  }
);
