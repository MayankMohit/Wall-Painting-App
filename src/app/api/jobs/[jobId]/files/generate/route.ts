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
    // ADDED `companyName` to the select() so we can use it for the file name
    const job = await Job.findById(jobId).select('ownerId companyName').lean();
    if (!job) return badRequest('Job not found');

    const ownerId = auth.role === 'owner' ? auth.userId : job.ownerId.toString();
    const usedBytes = await getOwnerStorageBytes(ownerId);

    if (usedBytes >= STORAGE_LIMIT_BYTES) {
      return new Response(
        JSON.stringify({ error: 'STORAGE_LIMIT', usedBytes, limitBytes: STORAGE_LIMIT_BYTES }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const safeCompany = job.companyName ? job.companyName.replace(/\s+/g, '_') : 'Job';

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    const createdFiles = [];

    for (const type of types) {
      const ext = type.startsWith('excel') ? 'xlsx' : 'pdf';
      
      // 4. Clean up the label for the file name
      let typeLabel = type;
      if (type === 'excel') typeLabel = 'Report';
      if (type === 'excel_painters') typeLabel = 'Painter_Report';
      if (type === 'pdf_file') typeLabel = 'PDF_Report';
      if (type === 'pdf_photos') typeLabel = 'Photos';

      // Build the final custom file name!
      const fileName = `${safeCompany}_${typeLabel}_${dateStr}.${ext}`;

      const fileDoc = await GeneratedFile.create({
        jobId,
        fileName,
        fileType: type,
        status: 'generating',
        generatedBy: auth.userId,
      });

      await fileGenQueue.add('generate', {
        jobId,
        fileId: fileDoc._id.toString(),
        type,
        ownerId,
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