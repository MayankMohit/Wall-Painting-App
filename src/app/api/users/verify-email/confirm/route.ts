import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { verifyEmailOtp } from '@/lib/otp';
import { VerifyEmailConfirmSchema } from '@/lib/validators';
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
  const parsed = VerifyEmailConfirmSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { sessionId, otp } = parsed.data;

  const valid = await verifyEmailOtp(sessionId, otp);
  if (!valid) return err('Invalid or expired OTP', 401);

  await connectDB();
  await User.findByIdAndUpdate(payload.userId, { emailVerified: true });

  return ok({ message: 'Email verified successfully' });
}
