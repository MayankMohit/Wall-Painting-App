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
    // Self-heal orphaned generations: a real job finishes in seconds, so anything
    // still 'generating' after STALE_MINUTES never got picked up by a worker.
    // Flip those to 'failed' so they don't sit in the UI's "Building" view forever.
    const STALE_MINUTES = 5;
    await GeneratedFile.updateMany(
      { jobId, status: 'generating', createdAt: { $lt: new Date(Date.now() - STALE_MINUTES * 60_000) } },
      { $set: { status: 'failed' } },
    );

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