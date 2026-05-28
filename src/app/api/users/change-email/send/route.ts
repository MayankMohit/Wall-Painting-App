import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { comparePassword } from '@/lib/auth';
import { generateOtp, storeChangeEmailOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { ChangeEmailSendSchema } from '@/lib/validators';
import { ok, badRequest, err } from '@/lib/api-response';

export async function POST(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await request.json();
  const parsed = ChangeEmailSendSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { newEmail, password } = parsed.data;

  await connectDB();

  const user = await User.findById(payload.userId);
  if (!user) return err('User not found', 404);

  const passwordValid = await comparePassword(password, user.password);
  if (!passwordValid) return err('Incorrect password', 401);

  const conflict = await User.findOne({ email: newEmail.toLowerCase() });
  if (conflict) return err('Email already in use', 409);

  const sessionId = crypto.randomUUID();
  const otp = generateOtp();
  await storeChangeEmailOtp(sessionId, otp, newEmail.toLowerCase(), payload.userId);
  await sendOtpEmail(newEmail, otp, 'change-email');

  return ok({ sessionId });
}
