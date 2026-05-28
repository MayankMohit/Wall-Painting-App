import crypto from 'crypto';
import { generateOtp, storeEmailOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { VerifyEmailSendSchema } from '@/lib/validators';
import { ok, badRequest } from '@/lib/api-response';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = VerifyEmailSendSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const sessionId = crypto.randomUUID();
  const otp = generateOtp();

  await storeEmailOtp(sessionId, otp);
  await sendOtpEmail(parsed.data.email, otp, 'register');

  return ok({ sessionId });
}
