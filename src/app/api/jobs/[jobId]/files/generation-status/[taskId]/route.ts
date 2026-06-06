import { requireAuth } from '@/lib/rbac';
import { forbidden, err, notFound } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string; taskId: string }> }) {
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  // Using taskId exactly as you named it in your folder structure
  const { jobId, taskId } = await params;
  await connectDB();

  try {
    const file = await GeneratedFile.findOne({ _id: taskId, jobId }).lean();
    if (!file) return notFound('File task not found');

    // If it's ready, progress is 100. Otherwise, let the frontend animate 50%
    const progress = file.status === 'ready' ? 100 : 50;

    return new Response(JSON.stringify({ 
      status: file.status,
      progress,
      taskId: file._id,
      r2Url: file.r2Url // Will be present if ready
    }), { status: 200 });
  } catch (e: any) {
    console.error('[Status API Error]:', e);
    return err('Failed to check file status', 500);
  }
}