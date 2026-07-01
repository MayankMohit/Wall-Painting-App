import { err, notFound } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { r2 } from '@/lib/r2';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';

// GET — file metadata. Scoped to a job the requester owns (requireJobOwner).
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (_req, ctx) => {
    const jobId = ctx.job!._id;
    const { fileId } = ctx.params;
    await connectDB();

    try {
      const file = await GeneratedFile.findOne({ _id: fileId, jobId }).lean();
      if (!file) return notFound('File not found');

      return new Response(JSON.stringify({ file }), { status: 200 });
    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to fetch file metadata');
      return err('Failed to fetch file metadata', 500);
    }
  }
);

// DELETE — remove the R2 object and the DB record for a file on an owned job.
export const DELETE = withRole(['owner', 'admin'], { access: requireJobOwner, audit: 'FILE_DELETE' })(
  async (_req, ctx) => {
    const jobId = ctx.job!._id;
    const { fileId } = ctx.params;
    await connectDB();

    try {
      const file = await GeneratedFile.findOne({ _id: fileId, jobId });
      if (!file) return notFound('File not found');

      // 1. Delete the actual file bytes from Cloudflare R2
      if (file.r2Path) {
        try {
          await r2.delete(file.r2Path);
        } catch (r2Error) {
          ctx.logger.error({ err: r2Error, r2Path: file.r2Path }, 'R2 delete failed');
          // We log the error but still proceed to delete the DB record so the UI doesn't get stuck
        }
      }

      // 2. Delete the record from MongoDB
      await file.deleteOne();

      ctx.setAudit('FILE_DELETE', { type: 'GeneratedFile', id: fileId }, { jobId: jobId.toString() });

      return new Response(JSON.stringify({ success: true, message: 'File deleted' }), { status: 200 });
    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to delete file');
      return err('Failed to delete file', 500);
    }
  }
);
