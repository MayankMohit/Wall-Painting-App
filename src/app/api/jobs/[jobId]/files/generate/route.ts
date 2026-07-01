import { err, badRequest } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { getOwnerStorageBytes, STORAGE_LIMIT_BYTES } from '@/lib/storage';
import { fileGenQueue } from '@/lib/queues';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';
import { GenerateFilesSchema } from '@/lib/validators';

// POST — enqueue file generation for an owned job. requireJobOwner verifies ownership
// and populates ctx.job, so we no longer trust a caller-supplied jobId blindly.
export const POST = withRole(['owner', 'admin'], { access: requireJobOwner, audit: 'FILE_GENERATE' })(
  async (req, ctx) => {
    const job = ctx.job!;
    const jobId = job._id;
    const rawBody = await req.json().catch(() => ({}));

    // Validate the requested types AND the owner-supplied letterhead text (trimmed,
    // length-capped). Parsed inline so the response keeps its existing { error: string }
    // shape (the UI reads body.error directly). Formula-injection is neutralised at
    // cell-write time by sanitizeCell().
    const parsed = GenerateFilesSchema.safeParse(rawBody);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
    }
    const { types, ownerInput } = parsed.data;

    await connectDB();

    try {
      // requireJobOwner already loaded the job; its owner is the storage owner
      // (an admin may trigger generation on an owner's behalf).
      const ownerId = job.ownerId.toString();
      const usedBytes = await getOwnerStorageBytes(ownerId);

      if (usedBytes >= STORAGE_LIMIT_BYTES) {
        return new Response(
          JSON.stringify({ error: 'STORAGE_LIMIT', usedBytes, limitBytes: STORAGE_LIMIT_BYTES }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const createdFiles = [];

      for (const type of types) {
        const ext = type.startsWith('excel') ? 'xlsx' : 'pdf';
        const fileName = `export_${type}_${Date.now()}.${ext}`;

        const fileDoc = await GeneratedFile.create({
          jobId,
          fileName,
          fileType: type,
          status: 'generating',
          generatedBy: ctx.user!.userId,
        });

        await fileGenQueue.add('generate', {
          jobId: jobId.toString(),
          fileId: fileDoc._id.toString(),
          type,
          ownerId, // resolved owner (admins may generate on an owner's behalf)
          ownerInput: ownerInput || {},
        });

        createdFiles.push(fileDoc);
      }

      ctx.setAudit('FILE_GENERATE', { type: 'Job', id: jobId.toString() }, { types });

      return new Response(JSON.stringify({
        message: 'File generation added to queue',
        files: createdFiles,
      }), { status: 202 });

    } catch (e) {
      ctx.logger.error({ err: e }, 'Failed to enqueue file generation');
      return err('Failed to enqueue file generation', 500);
    }
  }
);
