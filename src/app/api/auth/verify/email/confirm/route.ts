import { peekEmailOtp } from '@/lib/otp';
import { VerifyEmailConfirmSchema } from '@/lib/validators';
import { ErrorCodes } from '@/lib/errors';
import { withMiddleware } from '@/lib/middleware';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import type { z } from 'zod';

type ConfirmBody = z.infer<typeof VerifyEmailConfirmSchema>;

export const POST = withMiddleware({ rateLimit: 'strict', schema: VerifyEmailConfirmSchema })(
  async (req, ctx) => {
    const { sessionId, otp } = ctx.body as ConfirmBody;

    // Strict per-session limit — prevents brute-forcing the 6-digit OTP
    await checkRateLimit('strict', sessionId, 'id');

    const valid = await peekEmailOtp(sessionId, otp);
    if (!valid) ctx.fail(400, ErrorCodes.VALIDATION_ERROR, 'Invalid or expired OTP');

    return Response.json({ data: { verified: true } });
  }
);
