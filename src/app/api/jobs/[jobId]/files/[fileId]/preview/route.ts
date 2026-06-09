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
      return badRequest('File is not ready yet');
    }

    const url = await r2.getSignedPreviewUrl(file.r2Path);
    return new Response(JSON.stringify({ url, fileType: file.fileType }), { status: 200 });
  } catch (e: any) {
    console.error('[Preview API Error]:', e);
    return err('Failed to generate preview link', 500);
  }
}
