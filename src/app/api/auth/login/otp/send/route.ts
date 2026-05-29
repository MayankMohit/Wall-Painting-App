import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { generateOtp, storeLoginOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { LoginOtpSendSchema } from '@/lib/validators';
import { ok, badRequest, err } from '@/lib/api-response';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LoginOtpSendSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const { identifier } = parsed.data;

  const user = await User.findOne({ email: identifier.toLowerCase() });
  if (!user) return err('No account found with that email', 404);

  if (!user.emailVerified && user.role !== 'painter') {
    return err('Email not verified — log in with your phone number instead', 403);
  }
  if (user.status === 'inactive') return err('Account pending approval', 403);
  if (user.status === 'suspended') {
    return err(`Account suspended. Contact ${process.env.ADMIN_CONTACT_EMAIL} if you think this is a mistake.`, 403);
  }

  const sessionId = crypto.randomUUID();
  const otp = generateOtp();
  await storeLoginOtp(sessionId, otp, user.email);
  await sendOtpEmail(user.email, otp, 'login');

  return ok({ sessionId });
}
