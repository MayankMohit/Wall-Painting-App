import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { comparePassword } from '@/lib/auth';
import { generateOtp, storeChangeEmailOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { ChangeEmailSendSchema } from '@/lib/validators';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';
import type { z } from 'zod';

type ChangeEmailSendBody = z.infer<typeof ChangeEmailSendSchema>;

export const POST = withAuth({ schema: ChangeEmailSendSchema, audit: 'USER_CHANGE_EMAIL_REQUEST' })(
  async (req, ctx) => {
    const { newEmail, password } = ctx.body as ChangeEmailSendBody;

    await connectDB();

    const user = await User.findById(ctx.user!.userId);
    if (!user) return ctx.fail(404, ErrorCodes.NOT_FOUND, 'User not found');

    // Password-less (owner-provisioned) painters must set a password before they can
    // change their email through this flow — they use the add-email/verify path instead.
    if (!user.password) return ctx.fail(400, ErrorCodes.INVALID_CREDENTIALS, 'Set a password before changing your email');

    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) return ctx.fail(401, ErrorCodes.INVALID_CREDENTIALS, 'Incorrect password');

    const conflict = await User.findOne({ email: newEmail.toLowerCase() });
    if (conflict) return ctx.fail(409, ErrorCodes.EMAIL_TAKEN, 'Email already in use');

    const sessionId = crypto.randomUUID();
    const otp = generateOtp();
    await storeChangeEmailOtp(sessionId, otp, newEmail.toLowerCase(), ctx.user!.userId);
    await sendOtpEmail(newEmail, otp, 'change-email');

    return ok({ sessionId });
  }
);
