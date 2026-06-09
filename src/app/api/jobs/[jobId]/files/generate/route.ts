import { requireAuth } from '@/lib/rbac';
import { err, forbidden, badRequest } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { Job } from '@/lib/models/Job';
import { getOwnerStorageBytes, STORAGE_LIMIT_BYTES } from '@/lib/storage';
import { Queue } from 'bullmq';

// Same safe connection config
const raw = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url  = new URL(raw);
const isTls = url.protocol === 'rediss:';
const connection = {
  host:     url.hostname,
  port:     Number(url.port) || (isTls ? 6380 : 6379),
  ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
  ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
  ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  maxRetriesPerRequest: null as unknown as number,
};

const fileGenQueue = new Queue('fileGenQueue', { connection });

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId } = await params;
  const body = await request.json().catch(() => ({}));
  
  // Accepts an array so the UI can request Excel AND PDF at the same time
  const { types, ownerInput } = body; 
  
  if (!Array.isArray(types) || types.length === 0) {
    return badRequest('Please select at least one file type to generate.');
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
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
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
        ownerId: auth.userId,
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