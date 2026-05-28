import { getRedis } from '@/lib/redis';

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- Email OTP (registration + post-reg verify/change) ---

export async function storeEmailOtp(sessionId: string, otp: string, ttl = 600): Promise<void> {
  const redis = await getRedis();
  await redis.set(`otp:email:${sessionId}`, otp, { EX: ttl });
}

export async function verifyEmailOtp(sessionId: string, otp: string): Promise<boolean> {
  const redis = await getRedis();
  const stored = await redis.get(`otp:email:${sessionId}`);
  if (!stored || stored !== otp) return false;
  await redis.del(`otp:email:${sessionId}`);
  return true;
}

// --- Change-email OTP (stores newEmail + userId so confirm never trusts client) ---

export async function storeChangeEmailOtp(
  sessionId: string,
  otp: string,
  newEmail: string,
  userId: string,
  ttl = 600
): Promise<void> {
  const redis = await getRedis();
  await redis.set(`otp:change-email:${sessionId}`, JSON.stringify({ otp, newEmail, userId }), { EX: ttl });
}

export async function verifyChangeEmailOtp(
  sessionId: string,
  otp: string
): Promise<{ newEmail: string; userId: string } | null> {
  const redis = await getRedis();
  const raw = await redis.get(`otp:change-email:${sessionId}`);
  if (!raw) return null;
  const stored = JSON.parse(raw) as { otp: string; newEmail: string; userId: string };
  if (stored.otp !== otp) return null;
  await redis.del(`otp:change-email:${sessionId}`);
  return { newEmail: stored.newEmail, userId: stored.userId };
}

// --- Login OTP (separate prefix prevents cross-purpose reuse) ---

export async function storeLoginOtp(sessionId: string, otp: string, email: string, ttl = 600): Promise<void> {
  const redis = await getRedis();
  await redis.set(`otp:login:email:${sessionId}`, JSON.stringify({ otp, email }), { EX: ttl });
}

export async function verifyLoginOtp(sessionId: string, otp: string): Promise<{ email: string } | null> {
  const redis = await getRedis();
  const raw = await redis.get(`otp:login:email:${sessionId}`);
  if (!raw) return null;
  const stored = JSON.parse(raw) as { otp: string; email: string };
  if (stored.otp !== otp) return null;
  await redis.del(`otp:login:email:${sessionId}`);
  return { email: stored.email };
}
