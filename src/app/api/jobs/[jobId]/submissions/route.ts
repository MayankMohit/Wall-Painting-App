import mongoose, { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Photo, Submission, User } from '@/lib/models';
import { ok, created } from '@/lib/api-response';
import { CreateSubmissionSchema } from '@/lib/validators';
import { withAuth, withRole } from '@/lib/middleware';
import { requireJobAccess } from '@/lib/middleware/requireJobAccess';
import { cloudinary } from '@/lib/cloudinary';
import type { z } from 'zod';
import { notify } from '@/lib/notify/emit';

// GET — List submissions for a job. Painters only see their own. Populates preview image fields for the list view.
export const GET = withAuth({ access: requireJobAccess })(
  async (req, ctx) => {
    await connectDB();

    const query: Record<string, unknown> = { jobId: ctx.job!._id };
    if (ctx.user!.role === 'painter') {
      query.painterId = new Types.ObjectId(ctx.user!.userId);
    }

    const submissions = await Submission.aggregate([
      { $match: query },
      { $sort: { submittedAt: -1 } },
      { $addFields: { imageCount: { $size: '$images' } } },
      {
        $lookup: {
          from: 'photos',
          let: { firstId: { $arrayElemAt: ['$images', 0] } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$firstId'] } } },
            { $project: { _id: 0, previewCloudinaryUrl: 1 } },
          ],
          as: 'firstPhoto',
        },
      },
      {
        $project: {
          photoNo: 1, location: 1, status: 1, submittedAt: 1, painterId: 1,
          imageCount: 1,
          previewUrl: { $arrayElemAt: ['$firstPhoto.previewCloudinaryUrl', 0] },
        },
      },
    ]);

    return ok(submissions);
  }
);

// POST — Create a new submission. Painter must be assigned to an active job. Atomically inserts
//        photo documents and the submission in a transaction. Cleans up Cloudinary assets on any
//        failure so uploaded images never become orphaned.
export const POST = withRole(['painter'], { schema: CreateSubmissionSchema, access: requireJobAccess, audit: 'SUBMISSION_CREATE' })(
  async (req, ctx) => {
    const { photoNo, location, sizes, uploadedImages } = ctx.body as z.infer<typeof CreateSubmissionSchema>;

    // Everything from here is wrapped in try so the compensating Cloudinary cleanup
    // runs on any failure, including job status rejection and DB errors.
    let session: mongoose.ClientSession | null = null;
    try {
      if (ctx.job!.status !== 'active') {
        ctx.fail(400, 'JOB_NOT_ACTIVE', 'Submissions can only be added to active jobs');
      }

      await connectDB();

      const photoNoTaken = await Submission.exists({
        jobId    : ctx.job!._id,
        painterId: new Types.ObjectId(ctx.user!.userId),
        photoNo,
      });
      if (photoNoTaken) {
        ctx.fail(409, 'DUPLICATE_PHOTO_NO', `Photo number ${photoNo} is already used in this job`);
      }

      session = await mongoose.startSession();
      session.startTransaction();

      const photoDocs = uploadedImages.map(img => ({
        jobId               : ctx.job!._id,
        cloudinaryId        : img.cloudinaryId,
        cloudinaryUrl       : img.cloudinaryUrl,
        previewCloudinaryId : img.previewCloudinaryId,
        previewCloudinaryUrl: img.previewCloudinaryUrl,
      }));

      const savedPhotos     = await Photo.insertMany(photoDocs, { session });
      const [newSubmission] = await Submission.create([{
        painterId: new Types.ObjectId(ctx.user!.userId),
        jobId    : ctx.job!._id,
        photoNo,
        location,
        sizes,
        images  : savedPhotos.map(p => p._id),
      }], { session });

      await session.commitTransaction();

      User.findById(ctx.user!.userId, 'name').lean().then((painterDoc) => {
        notify.emit('submission.create', {
          actorId: ctx.user!.userId,
          recipientId: ctx.job!.ownerId.toString(),
          data: {
            painter: (painterDoc as { name?: string } | null)?.name ?? 'A painter',
            code: photoNo,
            location,
          },
        }).catch(() => {});
      }).catch(() => {});

      return created({ submissionId: newSubmission._id });

    } catch (e) {
      // abortTransaction wrapped so its own failure can't mask the original error
      if (session) await session.abortTransaction().catch(() => {});

      // Best-effort cleanup — allSettled so a Cloudinary failure doesn't swallow
      // the original error that caused the rollback
      const destroys: Promise<unknown>[] = uploadedImages.flatMap(img => {
        const ops: Promise<unknown>[] = [cloudinary.uploader.destroy(img.cloudinaryId)];
        if (img.previewCloudinaryId) ops.push(cloudinary.uploader.destroy(img.previewCloudinaryId));
        return ops;
      });
      await Promise.allSettled(destroys);

      throw e;
    } finally {
      if (session) await session.endSession();
    }
  }
);
