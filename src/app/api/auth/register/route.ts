import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { hashPassword, signToken } from '@/lib/auth';
import { RegisterSchema } from '@/lib/validators';
import { created, badRequest, err } from '@/lib/api-response';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  await connectDB();
  const { email, password, name, role, phone } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) return err('Email already registered', 409);

  const hashed = await hashPassword(password);
  const user = await User.create({ email, password: hashed, name, role, phone });

  const token = signToken({ userId: user._id.toString(), role: user.role });

  return created({
    token,
    user: { id: user._id, email: user.email, name: user.name, role: user.role, phone: user.phone },
  });
}
