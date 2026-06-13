import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { generateOtp, storeLoginOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { LoginOtpSendSchema } from '@/lib/validators';
import { ErrorCodes } from '@/lib/errors';
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
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'No account found with that email');

    if (!user.emailVerified && user.role !== 'painter') {
      ctx.fail(403, ErrorCodes.NOT_AUTHORIZED, 'Email not verified — log in with your phone number instead');
    }
    if (user.status === 'inactive') ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, 'Account pending approval');
    if (user.status === 'suspended') {
      ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, `Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`);
    }

    // Email-OTP login requires an email on the account (provisioned painters may not have one).
    const email = user.email;
    if (!email) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid credentials');

    const sessionId = crypto.randomUUID();
    const otp = generateOtp();
    await storeLoginOtp(sessionId, otp, email);
    await sendOtpEmail(email, otp, 'login');

    return Response.json({ data: { sessionId } });
  }
);
