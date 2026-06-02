import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { comparePassword, signToken } from '@/lib/auth';
import { LoginSchema } from '@/lib/validators';
import { HttpError, ErrorCodes } from '@/lib/errors';
import { withMiddleware } from '@/lib/middleware';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import type { z } from 'zod';

type LoginBody = z.infer<typeof LoginSchema>;

export const POST = withMiddleware({ rateLimit: 'standard', schema: LoginSchema, audit: 'AUTH_LOGIN' })(
  async (req, ctx) => {
    const { identifier, password } = ctx.body as LoginBody;

    await checkRateLimit('strict', identifier.toLowerCase(), 'id');

    await connectDB();
    const isEmail = identifier.includes('@');
    const user = await User.findOne(isEmail ? { email: identifier.toLowerCase() } : { phone: identifier });

    if (!user) throw new HttpError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid credentials');

    if (isEmail && !user.emailVerified) {
      ctx.fail(403, ErrorCodes.NOT_AUTHORIZED, 'Email not verified — please log in with your phone number or verify your email first');
    }
    if (user.status === 'inactive') ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, 'Account pending approval');
    if (user.status === 'suspended') {
      ctx.fail(403, ErrorCodes.ACCOUNT_DISABLED, `Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`);
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid credentials');

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
