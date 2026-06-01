import 'dotenv/config';
import { Worker } from 'bullmq';
import { createHash } from 'crypto';
import { connectDB } from '@/lib/db';
import { Notification, User } from '@/lib/models';
import { notifyQueue } from '@/lib/queues';
import { sendFcmToUser } from '@/lib/fcm';
import { sendNotificationEmail } from '@/lib/email';
import { templates } from '@/lib/templates/notifications';
import { NOTIF_EVENTS, type Channel } from '@/lib/notify/events';
import { eachUserBatch } from '@/lib/notify/audiences';
import { getPreference, channelAllowed } from '@/lib/notify/preferences';

// BullMQ workers need maxRetriesPerRequest: null — passed via plain config so
// BullMQ's internal ioredis connection applies it automatically.
function redisConnection() {
  const raw = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const url  = new URL(raw);
  const isTls = url.protocol === 'rediss:';
  return {
    host:     url.hostname,
    port:     Number(url.port) || (isTls ? 6380 : 6379),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    maxRetriesPerRequest: null as unknown as number,
  };
}

async function processPush(data: {
  recipientId: string;
  title: string;
  body: string;
  eventId: string;
}) {
  await sendFcmToUser(data.recipientId, { title: data.title, body: data.body });
}

async function processEmail(data: {
  recipientId: string;
  eventId: string;
  data: Record<string, unknown>;
}) {
  const user = await User.findById(data.recipientId, 'email name').lean();
  if (!user) return;

  const tpl = templates[data.eventId];
  if (!tpl?.email) return;

  const { subject, html } = tpl.email(data.data);
  await sendNotificationEmail(user.email, subject, html);
}

async function processFanout(data: {
  eventId: string;
  data: Record<string, unknown>;
  actorId?: string;
}) {
  const ev = NOTIF_EVENTS[data.eventId];
  if (!ev) return;

  const tpl = templates[data.eventId];
  const allTarget = ev.targets.find((t) => t.audience.kind === 'all');
  const channels = new Set<Channel>(allTarget?.channels ?? ['inApp']);

  const pushContent  = tpl?.push?.(data.data)  ?? { title: ev.id, body: '' };
  const inAppContent = tpl?.inApp?.(data.data) ?? pushContent;

  await eachUserBatch(async (users) => {
    const ids = users
      .map((u) => String(u._id))
      .filter((id) => id !== data.actorId);

    if (ids.length === 0) return;

    await Notification.insertMany(
      ids.map((userId) => ({
        userId,
        eventId: ev.id,
        title:   inAppContent.title,
        body:    inAppContent.body,
        data:    data.data,
      })),
      { ordered: false }
    );

    const now = new Date();
    for (const userId of ids) {
      for (const ch of channels) {
        if (ch === 'inApp') continue;

        const deliveryCh = ch as 'push' | 'email';
        const pref = ev.mandatory ? null : await getPreference(userId);
        if (!ev.mandatory && pref && !channelAllowed(pref, ev, deliveryCh, now)) continue;

        const hash = createHash('sha1')
          .update(`${ch}:${ev.id}:${userId}:${JSON.stringify(data.data)}`)
          .digest('hex');

        const jobPayload =
          ch === 'push'
            ? { recipientId: userId, title: pushContent.title, body: pushContent.body, eventId: ev.id }
            : { recipientId: userId, eventId: ev.id, data: data.data };

        await notifyQueue.add(ch, jobPayload, { jobId: hash });
      }
    }
  });
}

async function main() {
  await connectDB();

  const connection = redisConnection();

  const worker = new Worker(
    'notify',
    async (job) => {
      switch (job.name) {
        case 'push':
          await processPush(job.data);
          break;
        case 'email':
          await processEmail(job.data);
          break;
        case 'fanout':
          await processFanout(job.data);
          break;
        default:
          console.warn(`[notifyWorker] Unknown job type: ${job.name}`);
      }
    },
    { connection, concurrency: 10 }
  );

  worker.on('completed', (job) => {
    console.log(`[notifyWorker] ${job.name}:${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[notifyWorker] ${job?.name}:${job?.id} failed —`, err.message);
  });

  console.log('[notifyWorker] started, listening on notify queue');

  process.on('SIGTERM', async () => {
    await worker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[notifyWorker] startup error:', err);
  process.exit(1);
});
