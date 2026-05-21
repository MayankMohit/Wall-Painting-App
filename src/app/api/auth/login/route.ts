import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { comparePassword, signToken } from '@/lib/auth';
import { LoginSchema } from '@/lib/validators';
import { ok, badRequest, err } from '@/lib/api-response';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) return err('Invalid credentials', 401);
  if (user.status !== 'active') return err('Account suspended or inactive', 403);

  const valid = await comparePassword(password, user.password);
  if (!valid) return err('Invalid credentials', 401);

  const token = signToken({ userId: user._id.toString(), role: user.role });

  return ok({
    token,
    user: { id: user._id, email: user.email, name: user.name, role: user.role, phone: user.phone },
  });
}
