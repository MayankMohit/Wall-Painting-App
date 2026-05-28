import { createClient, RedisClientType } from 'redis';

declare global {
  var _redis: RedisClientType | null;
}

export async function getRedis(): Promise<RedisClientType> {
  if (global._redis) return global._redis;

  const client = createClient({ url: process.env.REDIS_URL! }) as RedisClientType;
  await client.connect();
  global._redis = client;
  return client;
}
