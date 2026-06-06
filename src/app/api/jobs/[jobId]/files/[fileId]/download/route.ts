import { requireAuth } from '@/lib/rbac';
import { forbidden, err, notFound, badRequest } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';
import { r2 } from '@/lib/r2';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string; fileId: string }> }) {
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId, fileId } = await params;
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
  } catch (e: any) {
    console.error('[Download API Error]:', e);
    return err('Failed to generate download link', 500);
  }
}