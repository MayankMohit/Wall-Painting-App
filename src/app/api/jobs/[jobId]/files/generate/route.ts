import { requireAuth } from '@/lib/rbac';
import { err, forbidden, badRequest } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { Job } from '@/lib/models/Job';
import { getOwnerStorageBytes, STORAGE_LIMIT_BYTES } from '@/lib/storage';
import { fileGenQueue } from '@/lib/queues';

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId } = await params;
  const body = await request.json().catch(() => ({}));
  
  // Accepts an array so the UI can request Excel AND PDF at the same time
  const { types, ownerInput } = body; 
  
  const VALID_TYPES = ['excel', 'excel_painters', 'pdf_file', 'pdf_photos'];
  if (!Array.isArray(types) || types.length === 0 || !types.every(t => VALID_TYPES.includes(t))) {
    return badRequest('Please select at least one valid file type to generate.');
  }

  await connectDB();

  try {
    // Resolve the owner of this job (admin may trigger generation on behalf of an owner)
    const job = await Job.findById(jobId).select('ownerId').lean();
    if (!job) return badRequest('Job not found');

    const ownerId = auth.role === 'owner' ? auth.userId : job.ownerId.toString();
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
        fileType: type, // Matching your updated schema
        status: 'generating', // Matching your updated schema
        generatedBy: auth.userId,
      });

      await fileGenQueue.add('generate', {
        jobId,
        fileId: fileDoc._id.toString(),
        type,
        ownerId, // resolved owner (admins may generate on an owner's behalf)
        ownerInput: ownerInput || {}
      });

      createdFiles.push(fileDoc);
    }

    return new Response(JSON.stringify({ 
      message: 'File generation added to queue', 
      files: createdFiles 
    }), { status: 202 });

  } catch (e: any) {
    console.error('[File Gen API Error]:', e);
    return err('Failed to enqueue file generation', 500);
  }
}