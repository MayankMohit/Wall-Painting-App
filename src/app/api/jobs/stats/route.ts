import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, forbidden, err } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    // 1. FAIL FAST & THE BOUNCER
    const payload = await requireAuth(request);
    if (payload.role !== 'owner') return forbidden();

    await connectDB();

    // 2. LASER FOCUS: Aggregation Pipeline groups and counts instantly inside Mongo
    const stats = await Job.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(payload.userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = { all: 0, active: 0, completed: 0, invoiced: 0 };
    
    stats.forEach(stat => {
      if (stat._id === 'active') counts.active = stat.count;
      if (stat._id === 'completed') counts.completed = stat.count;
      if (stat._id === 'invoiced') counts.invoiced = stat.count;
      counts.all += stat.count;
    });

    return ok(counts);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[GET /api/jobs/stats]', e);
    return err('Failed to fetch job statistics', 500);
  }
}