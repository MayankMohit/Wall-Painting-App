import { connectDB } from '@/lib/db';
import { Submission } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { withRole } from '@/lib/middleware';
import { requireJobOwner } from '@/lib/middleware/requireJobOwner';
import { Types } from 'mongoose';

// GET — List all submissions by a specific painter for a job (owner/admin view). Populates preview image fields.
export const GET = withRole(['owner', 'admin'], { access: requireJobOwner })(
  async (req, ctx) => {
    const { painterId } = ctx.params;

    if (!Types.ObjectId.isValid(painterId)) {
      ctx.fail(400, 'INVALID_PAINTER', 'Invalid painter ID');
    }

    await connectDB();

    const submissions = await Submission.find({
      jobId    : ctx.job!._id,
      painterId: new Types.ObjectId(painterId),
    })
      .populate('images', 'previewCloudinaryUrl generatedNumber')
      .sort({ submittedAt: -1 })
      .lean();

    return ok(submissions);
  }
);
