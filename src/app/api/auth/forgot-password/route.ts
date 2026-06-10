import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ForgotPasswordSchema } from '@/lib/validators';
import { sendPasswordResetEmail } from '@/lib/email';
import { withMiddleware } from '@/lib/middleware';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import type { z } from 'zod';

type ForgotPasswordBody = z.infer<typeof ForgotPasswordSchema>;

const NEUTRAL_MSG = 'If that account exists, a reset link has been sent';

export const POST = withMiddleware({ rateLimit: 'strict', schema: ForgotPasswordSchema })(
  async (req, ctx) => {
    const { email } = ctx.body as ForgotPasswordBody;

    await checkRateLimit('strict', email.toLowerCase(), 'id');

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    // Neutral response — prevent email enumeration
    if (!user) return Response.json({ data: { message: NEUTRAL_MSG } });

    if (!user.emailVerified) return Response.json({ data: { message: NEUTRAL_MSG } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return Response.json({ data: { message: NEUTRAL_MSG } });
  }
);
