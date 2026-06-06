import { requireAuth } from '@/lib/rbac';
import { forbidden, err, notFound } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { r2 } from '@/lib/r2';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string; fileId: string }> }) {
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId, fileId } = await params;
  await connectDB();

  try {
    const file = await GeneratedFile.findOne({ _id: fileId, jobId }).lean();
    if (!file) return notFound('File not found');
    
    return new Response(JSON.stringify({ file }), { status: 200 });
  } catch (e: any) {
    return err('Failed to fetch file metadata', 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ jobId: string; fileId: string }> }) {
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId, fileId } = await params;
  await connectDB();

  try {
    const file = await GeneratedFile.findOne({ _id: fileId, jobId });
    if (!file) return notFound('File not found');

    // 1. Delete the actual file bytes from Cloudflare R2
    if (file.r2Path) {
      try {
        await r2.delete(file.r2Path);
      } catch (r2Error) {
        console.error(`[R2 Delete Error] Failed to delete ${file.r2Path}:`, r2Error);
        // We log the error but still proceed to delete the DB record so the UI doesn't get stuck
      }
    }

    // 2. Delete the record from MongoDB
    await file.deleteOne();

    return new Response(JSON.stringify({ success: true, message: 'File deleted' }), { status: 200 });
  } catch (e: any) {
    console.error('[Delete File Error]:', e);
    return err('Failed to delete file', 500);
  }
}