import { Queue } from 'bullmq';

// BullMQ manages its own ioredis connection internally — do not pass a Redis instance.
// Passing a plain config object avoids the dual-ioredis type conflict.
function redisConnection() {
  const raw = process.env.REDIS_URL || 'redis://localhost:6379';
  const url  = new URL(raw);
  const isTls = url.protocol === 'rediss:';
  return {
    host:     url.hostname,
    port:     Number(url.port) || (isTls ? 6380 : 6379),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

export const fileGenQueue = new Queue('fileGen', {
  connection: redisConnection(),
  defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
});

export const notifyQueue = new Queue('notify', {
  connection: redisConnection(),
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } },
});

export const assetCleanupQueue = new Queue('assetCleanup', {
  connection: redisConnection(),
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
});
