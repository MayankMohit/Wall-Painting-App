import { getRedis } from '@/lib/redis';
import { HttpError, ErrorCodes } from '@/lib/errors';

export type RateLimitTier = 'strict' | 'standard' | 'relaxed';

// Production caps. In dev these are loosened heavily so repeated login/register/
// invite-claim testing doesn't trip the 5-per-15-min `strict` wall.
const IS_PROD = process.env.NODE_ENV === 'production';

const TIERS: Record<RateLimitTier, { max: number; windowMs: number }> = IS_PROD
  ? {
      strict  : { max: 5,   windowMs:      60_000 },
      standard: { max: 100, windowMs:      60_000 },
      relaxed : { max: 300, windowMs:      60_000 },
    }
  : {
      strict  : { max: 1000, windowMs:      60_000 },
      standard: { max: 5000, windowMs:      60_000 },
      relaxed : { max: 5000, windowMs:      60_000 },
    };

export async function checkRateLimit(
  tier    : RateLimitTier,
  keyValue: string,
  keyType : 'ip' | 'user' | 'id' = 'ip'
): Promise<void> {
  const redis          = await getRedis();
  const { max, windowMs } = TIERS[tier];
  const key            = `rl:${keyType}:${keyValue}:${tier}`;
  const now            = Date.now();
  const floor          = now - windowMs;

  // Sliding window: evict expired, record this request, count, set TTL — all atomic
  const pipe = redis.multi();
  pipe.zRemRangeByScore(key, 0, floor);
  pipe.zAdd(key, { score: now, value: `${now}-${Math.random().toString(36).slice(2)}` });
  pipe.zCount(key, floor, '+inf');
  pipe.expire(key, Math.ceil(windowMs / 1000));
  const results = await pipe.exec();
  const count   = results[2] as unknown as number;

  if (count > max) {
    const retryAfter = Math.ceil(windowMs / 1000);
    throw new HttpError(429, ErrorCodes.RATE_LIMITED,
      `Too many requests. Try again in ${retryAfter}s.`,
      { retryAfter, limit: max }
    );
  }
}
