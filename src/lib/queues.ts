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

// Queue names — the single source of truth shared by producers (these exports)
// and consumers (the worker processes). Import these in workers instead of
// hardcoding the string so a producer/consumer name can never drift apart.
export const FILE_GEN_QUEUE      = 'fileGenQueue';
export const NOTIFY_QUEUE        = 'notify';
export const ASSET_CLEANUP_QUEUE = 'assetCleanup';

export const fileGenQueue     = makeQueue(FILE_GEN_QUEUE,      { defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 } } });
export const notifyQueue      = makeQueue(NOTIFY_QUEUE,        { defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } } });
export const assetCleanupQueue = makeQueue(ASSET_CLEANUP_QUEUE, { defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
