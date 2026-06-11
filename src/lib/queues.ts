import { Queue } from 'bullmq';

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

function makeQueue(name: string, opts: object): Queue {
  let q: Queue | null = null;
  return new Proxy({} as Queue, {
    get(_, prop: string) {
      if (!q) q = new Queue(name, { connection: redisConnection(), ...opts });
      return (q as any)[prop];
    },
  });
}

export const fileGenQueue     = makeQueue('fileGen',      { defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 } } });
export const notifyQueue      = makeQueue('notify',       { defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } } });
export const assetCleanupQueue = makeQueue('assetCleanup', { defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
