import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { generateOtp, storeLoginOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { LoginOtpSendSchema } from '@/lib/validators';
import { withMiddleware } from '@/lib/middleware';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import type { z } from 'zod';

type LoginOtpSendBody = z.infer<typeof LoginOtpSendSchema>;

export const POST = withMiddleware({ rateLimit: 'strict', schema: LoginOtpSendSchema })(
  async (req, ctx) => {
    const { identifier } = ctx.body as LoginOtpSendBody;

    await checkRateLimit('strict', identifier.toLowerCase(), 'id');

    await connectDB();
    const user = await User.findOne({ email: identifier.toLowerCase() });

    // Always respond with an opaque sessionId, whether or not an eligible account
    // exists — the response is byte-for-byte identical either way, so an attacker
    // can't enumerate registered emails (M-1). An OTP is generated and mailed only
    // for an eligible account; every other case simply never receives a code and the
    // verify step rejects the (empty) session. Eligibility requires an active account
    // with a usable email that is either a painter or has a verified email.
    const eligible =
      !!user &&
      !!user.email &&
      user.status === 'active' &&
      (user.emailVerified || user.role === 'painter');

    const sessionId = crypto.randomUUID();

    if (eligible) {
      const otp = generateOtp();
      await storeLoginOtp(sessionId, otp, user!.email!);
      await sendOtpEmail(user!.email!, otp, 'login');
    }

    return Response.json({ data: { sessionId } });
  }
);
