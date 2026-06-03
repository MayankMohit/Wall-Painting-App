import { createClient } from 'redis';
import { withAuth } from '@/lib/middleware';
import { ErrorCodes } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const GET = withAuth()(
  async (req, ctx) => {
    const userId  = ctx.user!.userId;
    const channel = `notif:${userId}`;
    const encoder = new TextEncoder();

    const subscriber = createClient({ url: process.env.REDIS_URL! });
    try {
      await subscriber.connect();
    } catch {
      return ctx.fail(503, ErrorCodes.INTERNAL, 'Stream unavailable');
    }

    // ctrl is assigned in start(); messages that arrive before start() runs are
    // dropped safely via optional chaining.
    let ctrl: ReadableStreamDefaultController<Uint8Array> | undefined;
    let heartbeatId: ReturnType<typeof setInterval>;

    // Subscribe before the stream opens so no messages are missed once ctrl is set.
    await subscriber.subscribe(channel, (message) => {
      try {
        ctrl?.enqueue(encoder.encode(`data: ${message}\n\n`));
      } catch {}
    });

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        ctrl = c;
        ctrl.enqueue(encoder.encode(': connected\n\n'));
        heartbeatId = setInterval(() => {
          try {
            ctrl!.enqueue(encoder.encode(': ping\n\n'));
          } catch {
            clearInterval(heartbeatId);
          }
        }, 25_000);
      },
      cancel() {
        clearInterval(heartbeatId);
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.quit().catch(() => {});
      },
    });

    // Belt-and-suspenders cleanup on request abort (e.g. client navigates away).
    req.signal.addEventListener('abort', () => {
      clearInterval(heartbeatId);
      try { ctrl?.close(); } catch {}
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    });

    return new Response(stream, {
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache, no-transform',
        'Connection':        'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }
);
