import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { verifyEmailOtp } from '@/lib/otp';
import { VerifyEmailConfirmSchema } from '@/lib/validators';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type VerifyEmailConfirmBody = z.infer<typeof VerifyEmailConfirmSchema>;

export const POST = withAuth({ schema: VerifyEmailConfirmSchema, audit: 'USER_VERIFY_EMAIL' })(
  async (req, ctx) => {
    const { sessionId, otp } = ctx.body as VerifyEmailConfirmBody;

    const valid = await verifyEmailOtp(sessionId, otp);
    if (!valid) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid or expired OTP');

    await connectDB();
    const user = await User.findByIdAndUpdate(ctx.user!.userId, { emailVerified: true });
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    return ok({ message: 'Email verified successfully' });
  }
);
