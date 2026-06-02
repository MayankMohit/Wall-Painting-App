import { connectDB } from '@/lib/db';
import { Job, Submission, Photo, GeneratedFile } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, notFound, forbidden, badRequest, err } from '@/lib/api-response';
import { UpdateJobSchema } from '@/lib/validators';
import { Types } from 'mongoose';

// Note: Ensure `RouteContext` is properly imported in your actual file if it's a global type in your setup.
// If it errors, you can replace `RouteContext<...>` with `{ params: Promise<{ jobId: string }> }`

export async function GET(request: Request, context: any) {
  try {
    const payload = await requireAuth(request);
    const { jobId } = await context.params;

    await connectDB();

    const result = await Job.aggregate([
      { $match: { _id: new Types.ObjectId(jobId) } },
      
      { $lookup: { from: 'submissions', localField: '_id', foreignField: 'jobId', as: 'subs' } },
      { $lookup: { from: 'users', localField: 'painters', foreignField: '_id', as: 'painterDocs' } },
      
      { 
        $addFields: {
          stats: {
             submitted: { $size: '$subs' },
             approved: { $size: { $filter: { input: '$subs', as: 's', cond: { $eq: ['$$s.status', 'approved'] } } } },
             pending: { $size: { $filter: { input: '$subs', as: 's', cond: { $eq: ['$$s.status', 'pending'] } } } }
          },
          mappedPainters: {
             $map: {
                input: '$painterDocs',
                as: 'p',
                in: {
                   _id: '$$p._id',
                   name: '$$p.name',
                   phone: '$$p.phone', // Only extracting safe fields! No passwords/tokens.
                   stats: {
                      submitted: { $size: { $filter: { input: '$subs', as: 's', cond: { $eq: ['$$s.painterId', '$$p._id'] } } } },
                      approved: { $size: { $filter: { input: '$subs', as: 's', cond: { $and: [ { $eq: ['$$s.painterId', '$$p._id'] }, { $eq: ['$$s.status', 'approved'] } ] } } } },
                      pending: { $size: { $filter: { input: '$subs', as: 's', cond: { $and: [ { $eq: ['$$s.painterId', '$$p._id'] }, { $eq: ['$$s.status', 'pending'] } ] } } } }
                   }
                }
             }
          }
        }
      },
      // THIS IS THE EQUIVALENT OF .select()
      // We explicitly declare ONLY the fields the frontend is allowed to see.
      { 
        $project: { 
          companyName: 1,
          description: 1, 
          status: 1, 
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          ownerId: 1,
          stats: 1, 
          painters: '$mappedPainters' // Replace original ID array with our new mapped objects
        } 
      }
    ]);

    if (!result || result.length === 0) return notFound('Job not found');
    const job = result[0];

    // Security Checks
    if (payload.role === 'owner' && job.ownerId.toString() !== payload.userId) return forbidden();
    // In aggregate, painters is now an array of objects, so we check p._id
    if (payload.role === 'painter' && !job.painters.some((p: any) => p._id.toString() === payload.userId)) return forbidden();

    return ok(job);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[GET /api/jobs/[jobId]]', e);
    return err('Failed to fetch job details', 500);
  }
}


export async function PUT(request: Request, context: any) {
  try {
    // 1. FAIL FAST & THE BOUNCER
    const payload = await requireAuth(request);
    if (payload.role !== 'owner') return forbidden();

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON body'); }

    const parsed = UpdateJobSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { jobId } = await context.params;

    // 2. Open DB Connection ONLY after payload is fully validated
    await connectDB();

    // 3. LASER FOCUS & HEAVY BACKPACK: Use .select() and .lean() for speed
    const job = await Job.findById(jobId).select('ownerId endDate').lean();
    if (!job) return notFound('Job not found');
    if (job.ownerId.toString() !== payload.userId) return forbidden();

    const { painterIds, ...rest } = parsed.data;
    const update: Record<string, unknown> = { ...rest };
    
    if (painterIds !== undefined) update.painters = painterIds.map((id) => new Types.ObjectId(id));
    if (rest.status === 'invoiced' && !job.endDate) update.endDate = new Date();

    const updated = await Job.findByIdAndUpdate(jobId, { $set: update }, { new: true }).lean();
    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[PUT /api/jobs/[jobId]]', e);
    return err('Failed to update job', 500);
  }
}


export async function DELETE(request: Request, context: any) {
  try {
    // 1. FAIL FAST & THE BOUNCER
    const payload = await requireAuth(request);
    if (payload.role !== 'owner') return forbidden();

    const { jobId } = await context.params;

    // 2. Open DB Connection
    await connectDB();

    const job = await Job.findById(jobId).select('_id ownerId generatedExcel generatedPDFFile generatedPDFPhotos').lean();
    if (!job) return notFound('Job not found');
    if (job.ownerId.toString() !== payload.userId) return forbidden();

    // 3. Delete related resources efficiently
    const submissions = await Submission.find({ jobId: job._id }).select('_id images').lean();
    const photoIds = submissions.flatMap((s) => s.images);
    await Promise.all([
      Photo.deleteMany({ _id: { $in: photoIds } }),
      Submission.deleteMany({ jobId: job._id }),
      GeneratedFile.deleteMany({
        _id: { $in: [job.generatedExcel, job.generatedPDFFile, job.generatedPDFPhotos].filter(Boolean) },
      }),
      Job.findByIdAndDelete(jobId),
    ]);

    return ok({ message: 'Job deleted' });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[DELETE /api/jobs/[jobId]]', e);
    return err('Failed to delete job', 500);
  }
}