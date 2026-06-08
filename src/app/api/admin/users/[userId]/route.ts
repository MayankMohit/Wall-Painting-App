import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { ErrorCodes } from '@/lib/errors';
import { withRole } from '@/lib/middleware';

const EXCLUDE = '-password -resetPasswordToken -resetPasswordExpires';

export const GET = withRole(['admin'], { audit: 'ADMIN_USER_VIEW' })(
  async (req, ctx) => {
    const { userId } = ctx.params;
    await connectDB();

    const user = await User.findById(userId).select(EXCLUDE).lean();
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok(user);
  }
);
