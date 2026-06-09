import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getRedis } from '@/lib/redis';

// Public endpoint — no auth. Used by external cron pinger to keep MongoDB Atlas warm
// and as a liveness probe for the VM / any uptime monitor.
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function checkMongo(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t = Date.now();
  try {
    await withTimeout(connectDB(), TIMEOUT_MS);
    await withTimeout(
      mongoose.connection.db!.admin().command({ ping: 1 }),
      TIMEOUT_MS
    );
    return { ok: true, latencyMs: Date.now() - t };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: (e as Error).message };
  }
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t = Date.now();
  try {
    const redis = await withTimeout(getRedis(), TIMEOUT_MS);
    const pong = await withTimeout(redis.ping(), TIMEOUT_MS);
    if (pong !== 'PONG') throw new Error(`unexpected response: ${pong}`);
    return { ok: true, latencyMs: Date.now() - t };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: (e as Error).message };
  }
}

export async function GET() {
  const [mongo, redis] = await Promise.all([checkMongo(), checkRedis()]);

  const allOk = mongo.ok && redis.ok;
  const status = allOk ? 200 : 503;

  return Response.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { mongo, redis },
    },
    { status }
  );
}
