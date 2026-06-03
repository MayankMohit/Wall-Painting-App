import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Job } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';

export const GET = withRole(['owner', 'admin'])(
  async (req, ctx) => {
    await connectDB();

    const matchStage = ctx.user!.role === 'admin'
      ? {}
      : { ownerId: new Types.ObjectId(ctx.user!.userId) };

    const stats = await Job.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = { all: 0, active: 0, completed: 0, invoiced: 0 };
    stats.forEach(stat => {
      if (stat._id === 'active')    counts.active    = stat.count;
      if (stat._id === 'completed') counts.completed = stat.count;
      if (stat._id === 'invoiced')  counts.invoiced  = stat.count;
      counts.all += stat.count;
    });

    return ok(counts);
  }
);
