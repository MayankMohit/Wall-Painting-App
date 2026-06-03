import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { verifyChangeEmailOtp } from '@/lib/otp';
import { ChangeEmailConfirmSchema } from '@/lib/validators';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type ChangeEmailConfirmBody = z.infer<typeof ChangeEmailConfirmSchema>;

export const POST = withAuth({ schema: ChangeEmailConfirmSchema, audit: 'USER_CHANGE_EMAIL_CONFIRM' })(
  async (req, ctx) => {
    const { sessionId, otp } = ctx.body as ChangeEmailConfirmBody;

    const result = await verifyChangeEmailOtp(sessionId, otp);
    if (!result) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid or expired OTP');

    // Defense-in-depth: ensure the OTP session belongs to the requesting user
    if (result.userId !== ctx.user!.userId) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid or expired OTP');

    await connectDB();

    const conflict = await User.findOne({ email: result.newEmail });
    if (conflict) return ctx.fail(409, ErrorCodes.EMAIL_TAKEN, 'Email already in use');

    try {
      const user = await User.findByIdAndUpdate(ctx.user!.userId, {
        email:         result.newEmail,
        emailVerified: true,
      });
      if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');
    } catch (e: unknown) {
      // Another request claimed the same email between our conflict check and this update
      if ((e as { code?: number }).code === 11000) return ctx.fail(409, ErrorCodes.EMAIL_TAKEN, 'Email already in use');
      throw e;
    }

    return ok({ message: 'Email updated successfully' });
  }
);
