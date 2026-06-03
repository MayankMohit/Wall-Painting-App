import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { generateOtp, storeEmailOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';

export const POST = withAuth({ rateLimit: 'strict' })(
  async (req, ctx) => {
    await connectDB();
    const user = await User.findById(ctx.user!.userId);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    if (user.emailVerified) return ctx.fail(409, ErrorCodes.VALIDATION_ERROR, 'Email is already verified');

    const sessionId = crypto.randomUUID();
    const otp = generateOtp();
    await storeEmailOtp(sessionId, otp);
    await sendOtpEmail(user.email, otp, 'verify');

    return ok({ sessionId });
  }
);
