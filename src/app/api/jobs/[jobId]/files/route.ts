export const dynamic = 'force-dynamic';

import { requireAuth } from '@/lib/rbac';
import { forbidden, err } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { GeneratedFile } from '@/lib/models/GeneratedFile';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId } = await params;
  await connectDB();

  try {
    // Fetch all files for this job, newest first
    const files = await GeneratedFile.find({ jobId })
      .sort({ createdAt: -1 })
      .lean();

    return new Response(JSON.stringify({ files }), { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (e: any) {
    console.error('[Get Files Error]:', e);
    return err('Failed to fetch files', 500);
  }
}