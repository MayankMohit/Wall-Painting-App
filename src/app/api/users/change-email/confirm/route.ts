import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { verifyChangeEmailOtp } from '@/lib/otp';
import { ChangeEmailConfirmSchema } from '@/lib/validators';
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
  const parsed = ChangeEmailConfirmSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { sessionId, otp } = parsed.data;

  const result = await verifyChangeEmailOtp(sessionId, otp);
  if (!result) return err('Invalid or expired OTP', 401);

  // Defense-in-depth: ensure the OTP session belongs to the requesting user
  if (result.userId !== payload.userId) return err('Invalid or expired OTP', 401);

  await connectDB();

  const conflict = await User.findOne({ email: result.newEmail });
  if (conflict) return err('Email already in use', 409);

  await User.findByIdAndUpdate(payload.userId, {
    email: result.newEmail,
    emailVerified: true,
  });

  return ok({ message: 'Email updated successfully' });
}
