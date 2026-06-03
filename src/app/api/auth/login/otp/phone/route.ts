import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { admin } from '@/lib/firebase-admin';
import { signToken } from '@/lib/auth';
import { LoginOtpPhoneSchema } from '@/lib/validators';
import { ErrorCodes } from '@/lib/errors';
import { withMiddleware } from '@/lib/middleware';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import type { z } from 'zod';

type LoginOtpPhoneBody = z.infer<typeof LoginOtpPhoneSchema>;

export const POST = withMiddleware({ rateLimit: 'standard', schema: LoginOtpPhoneSchema, audit: 'AUTH_LOGIN_PHONE' })(
  async (req, ctx) => {
    const { phone, firebaseIdToken } = ctx.body as LoginOtpPhoneBody;

    await checkRateLimit('strict', phone, 'id');

    const decoded = await admin.auth().verifyIdToken(firebaseIdToken).catch(() =>
      ctx.fail(401, ErrorCodes.NOT_AUTHORIZED, 'Phone verification failed')
    );
    if (decoded.phone_number !== phone) ctx.fail(401, ErrorCodes.NOT_AUTHORIZED, 'Phone number mismatch');

    await connectDB();
    const user = await User.findOne({ phone });
    if (!user) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid credentials');

    // No emailVerified check — user is authenticating by phone, not email
    if (user.status === 'inactive') ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, 'Account pending approval');
    if (user.status === 'suspended') {
      ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, `Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`);
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });
    ctx.setAudit('AUTH_LOGIN_PHONE', undefined, { userId: user._id.toString(), role: user.role });

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
