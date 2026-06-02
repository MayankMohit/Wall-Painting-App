import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { verifyLoginOtp } from '@/lib/otp';
import { signToken } from '@/lib/auth';
import { LoginOtpVerifySchema } from '@/lib/validators';
import { ErrorCodes } from '@/lib/errors';
import { withMiddleware } from '@/lib/middleware';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import type { z } from 'zod';

type LoginOtpVerifyBody = z.infer<typeof LoginOtpVerifySchema>;

export const POST = withMiddleware({ rateLimit: 'standard', schema: LoginOtpVerifySchema, audit: 'AUTH_LOGIN_OTP' })(
  async (req, ctx) => {
    const { sessionId, otp } = ctx.body as LoginOtpVerifyBody;

    await checkRateLimit('strict', sessionId, 'id');

    const result = await verifyLoginOtp(sessionId, otp);
    if (!result) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid or expired OTP');

    await connectDB();
    const user = await User.findOne({ email: result.email });
    if (!user) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid or expired OTP');

    // Re-run status guard — admin may have changed status between send and verify
    if (user.status === 'inactive') ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, 'Account pending approval');
    if (user.status === 'suspended') {
      ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, `Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`);
    }

    if (!user.emailVerified) {
      await User.updateOne({ _id: user._id }, { emailVerified: true });
      user.emailVerified = true;
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return Response.json({
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          emailVerified: user.emailVerified,
          status: user.status,
        },
      },
    });
  }
);
