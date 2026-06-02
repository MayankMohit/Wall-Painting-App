import { connectDB } from '@/lib/db';
import { Job, User, Submission } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden, badRequest, err } from '@/lib/api-response';
import { AddPainterSchema } from '@/lib/validators';
import mongoose from 'mongoose';

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  // 1. FAIL FAST: Validate authorization immediately
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  const { jobId } = await context.params;
  await connectDB();

  // 2. THE BOUNCER: Check job existence and ownership with minimum data transfer
  const job = await Job.findById(jobId).select('ownerId painters').lean();
  if (!job) return notFound('Job not found');
  if (auth.role === 'owner' && job.ownerId.toString() !== auth.userId) return forbidden();

  try {
    // 3. HEAVY BACKPACK & LASER FOCUS: Offload join and count calculations directly to MongoDB
    const paintersWithCounts = await User.aggregate([
      { 
        $match: { _id: { $in: job.painters } } 
      },
      // Select ONLY what the UI needs
      { 
        $project: { name: 1, email: 1, phone: 1, status: 1 } 
      },
      // Correlate submission metrics atomically
      {
        $lookup: {
          from: 'submissions',
          let: { painterId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$jobId', new mongoose.Types.ObjectId(jobId)] },
                    { $eq: ['$painterId', '$$painterId'] }
                  ]
                } 
              } 
            },
            { $count: 'count' }
          ],
          as: 'submissionCountData'
        }
      },
      // Flatten count fields safely
      {
        $addFields: {
          submissionCount: { 
            $ifNull: [{ $arrayElemAt: ['$submissionCountData.count', 0] }, 0] 
          }
        }
      },
      { $project: { submissionCountData: 0 } }
    ]);

    return ok(paintersWithCounts);
  } catch (e) {
    console.error('[GET Job Painters]', e);
    return err('Failed to fetch assigned painters', 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  // 1. FAIL FAST: Validate authentication and roles
  const auth = await requireAuth(request);
  if (auth.role !== 'owner' && auth.role !== 'admin') return forbidden();

  // 2. FAIL FAST: Parse body safely without risking json payload exceptions
  const body = await request.json().catch(() => ({}));
  const parsed = AddPainterSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { jobId } = await context.params;
  await connectDB();

  try {
    // 3. THE BOUNCER: Verify Job Ownership
    const job = await Job.findById(jobId).select('ownerId').lean();
    if (!job) return notFound('Job not found');
    if (auth.role === 'owner' && job.ownerId.toString() !== auth.userId) return forbidden();

    // Verify target painter exists and has correct role
    const painterExists = await User.exists({ _id: parsed.data.painterId, role: 'painter' });
    if (!painterExists) return badRequest('Valid painter not found');

    // 4. ATOMIC UPDATE: Append using Mongo sets to avoid overlapping race conditions
    await Job.updateOne(
      { _id: jobId },
      { $addToSet: { painters: new mongoose.Types.ObjectId(parsed.data.painterId) } }
    );

    return ok({ message: 'Painter added successfully' });
  } catch (e) {
    console.error('[POST Add Painter]', e);
    return err('Failed to assign painter', 500);
  }
}