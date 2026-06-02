import crypto from 'crypto';
import { generateOtp, storeEmailOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { VerifyEmailSendSchema } from '@/lib/validators';
import { withMiddleware } from '@/lib/middleware';
import type { z } from 'zod';

type VerifyEmailSendBody = z.infer<typeof VerifyEmailSendSchema>;

export const POST = withMiddleware({ rateLimit: 'strict', schema: VerifyEmailSendSchema })(
  async (req, ctx) => {
    const { email } = ctx.body as VerifyEmailSendBody;

    const sessionId = crypto.randomUUID();
    const otp = generateOtp();

    await storeEmailOtp(sessionId, otp);
    await sendOtpEmail(email, otp, 'register');

    return Response.json({ data: { sessionId } });
  }
);
