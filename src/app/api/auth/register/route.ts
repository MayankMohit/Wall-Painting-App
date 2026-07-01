import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { hashPassword, signToken } from '@/lib/auth';
import { RegisterSchema } from '@/lib/validators';
import { verifyEmailOtp } from '@/lib/otp';
import { sendAdminNewOwnerNotification } from '@/lib/email';
import { notify } from '@/lib/notify/emit';
import { ErrorCodes } from '@/lib/errors';
import { withMiddleware } from '@/lib/middleware';
import type { z } from 'zod';

type RegisterBody = z.infer<typeof RegisterSchema>;

export const POST = withMiddleware({ rateLimit: 'strict', schema: RegisterSchema, audit: 'AUTH_REGISTER' })(
  async (req, ctx) => {
    const { name, email, phone, password, role, emailOtp, sessionId } = ctx.body as RegisterBody;

    await connectDB();

    const emailConflict = await User.findOne({ email: email.toLowerCase() });
    if (emailConflict) ctx.fail(409, ErrorCodes.EMAIL_TAKEN, 'Email already registered');

    const phoneConflict = await User.findOne({ phone });
    if (phoneConflict) ctx.fail(409, ErrorCodes.PHONE_TAKEN, 'Phone number already registered');

    let status: 'active' | 'inactive' = 'active';
    let emailVerified = false;

    if (role === 'owner') {
      const otpValid = await verifyEmailOtp(sessionId!, emailOtp!);
      if (!otpValid) ctx.fail(401, ErrorCodes.NOT_AUTHORIZED, 'Invalid or expired email OTP');
      status = 'inactive';
      emailVerified = true;
    }

    const hashed = await hashPassword(password);
    const user = await User.create({ name, email: email.toLowerCase(), phone, password: hashed, role, status, emailVerified });
    ctx.setAudit('AUTH_REGISTER', undefined, { userId: user._id.toString(), role: user.role });

    if (role === 'owner') {
      const admins = await User.find({ role: 'admin' }, 'email').lean();
      await Promise.allSettled([
        ...admins
          .filter((a): a is typeof a & { email: string } => !!a.email)
          .map((a) => sendAdminNewOwnerNotification(a.email, { name, email, phone })),
        notify.emit('owner.registered', { data: { name, email } }),
      ]);
    }

    const token = signToken({ userId: user._id.toString(), role: user.role, name: user.name, tokenVersion: user.tokenVersion });

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
    }, { status: 201 });
  }
);
