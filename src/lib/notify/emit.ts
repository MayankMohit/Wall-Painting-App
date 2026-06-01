import { createHash } from 'crypto';
import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { getRedis } from '@/lib/redis';
import { notifyQueue } from '@/lib/queues';
import { NOTIF_EVENTS, type NotifEvent, type Channel } from '@/lib/notify/events';
import { RESOLVERS, usersByRole } from '@/lib/notify/audiences';
import { getPreference, channelAllowed } from '@/lib/notify/preferences';
import { templates } from '@/lib/templates/notifications';

export async function deliver(
  userId: string,
  ev: NotifEvent,
  channels: Set<Channel>,
  data: Record<string, unknown>
): Promise<void> {
  await connectDB();

  const tpl          = templates[ev.id];
  const pushContent  = tpl?.push?.(data)  ?? { title: ev.id, body: '' };
  const inAppContent = tpl?.inApp?.(data) ?? pushContent;

  // Synchronous in-app row — always written regardless of channel preferences
  const notif = await Notification.create({
    userId,
    eventId: ev.id,
    title:   inAppContent.title  || ev.id,
    body:    inAppContent.body   || '—',
    data,
  });

  // Real-time SSE update — fire-and-forget
  getRedis()
    .then((redis) =>
      redis.publish(
        `notif:${userId}`,
        JSON.stringify({
          id:        notif._id,
          title:     inAppContent.title,
          body:      inAppContent.body,
          eventId:   ev.id,
          createdAt: notif.createdAt,
        })
      )
    )
    .catch(() => {});

  // Async delivery via notifyQueue
  const pref = ev.mandatory ? null : await getPreference(userId);
  const now  = new Date();

  for (const ch of channels) {
    if (ch === 'inApp') continue;

    const deliveryChannel = ch as 'push' | 'email';
    if (!ev.mandatory && pref && !channelAllowed(pref, ev, deliveryChannel, now)) continue;

    const hash = createHash('sha1')
      .update(`${ch}:${ev.id}:${userId}:${JSON.stringify(data)}`)
      .digest('hex');

    const jobData =
      ch === 'push'
        ? { recipientId: userId, title: pushContent.title, body: pushContent.body, eventId: ev.id }
        : { recipientId: userId, eventId: ev.id, data };

    await notifyQueue.add(ch, jobData, { jobId: hash });
  }
}

export async function emit(
  eventId: string,
  {
    data = {},
    actorId,
    recipientId,
    recipientIds,
  }: {
    data?:         Record<string, unknown>;
    actorId?:      string;
    recipientId?:  string;
    recipientIds?: string[];
  } = {}
): Promise<void> {
  const ev = NOTIF_EVENTS[eventId];
  if (!ev) throw new Error(`Unknown notification event: ${eventId}`);

  const recipients = new Map<string, Set<Channel>>();

  for (const target of ev.targets) {
    let ids: string[];

    switch (target.audience.kind) {
      case 'explicit':
        ids = recipientIds ?? (recipientId ? [recipientId] : []);
        break;
      case 'role':
        ids = await usersByRole(target.audience.role);
        break;
      case 'resolver':
        ids = await RESOLVERS[target.audience.name](data);
        break;
      case 'all':
        await notifyQueue.add('fanout', { eventId, data, actorId });
        continue;
    }

    for (const id of ids) {
      const existing = recipients.get(id) ?? new Set<Channel>();
      for (const ch of target.channels) existing.add(ch);
      recipients.set(id, existing);
    }
  }

  // Actor never receives their own notification
  if (actorId) recipients.delete(actorId);

  await Promise.allSettled(
    [...recipients.entries()].map(([uid, channels]) => deliver(uid, ev, channels, data))
  );
}

export const notify = { emit };
