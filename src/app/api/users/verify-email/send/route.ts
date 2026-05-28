import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { generateOtp, storeEmailOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { ok, badRequest } from '@/lib/api-response';

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  await connectDB();
  const user = await User.findById(payload.userId);
  if (!user) return badRequest('User not found');

  if (user.emailVerified) return badRequest('Email is already verified');

  const sessionId = crypto.randomUUID();
  const otp = generateOtp();
  await storeEmailOtp(sessionId, otp);
  await sendOtpEmail(user.email, otp, 'verify');

  return ok({ sessionId });
}
