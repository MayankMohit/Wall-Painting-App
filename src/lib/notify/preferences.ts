import { connectDB } from '@/lib/db';
import { NotificationPreference } from '@/lib/models';
import type { NotifEvent } from '@/lib/notify/events';

export type PrefLike = {
  push:  Map<string, boolean>;
  email: Map<string, boolean>;
  quietHours: { start: string; end: string; tz: string } | null;
  digest: boolean;
};

const DEFAULT_PREF: PrefLike = {
  push:  new Map([['*', true]]),
  email: new Map([['*', true]]),
  quietHours: null,
  digest: false,
};

function toMap(value: unknown): Map<string, boolean> {
  if (value instanceof Map) return value as Map<string, boolean>;
  if (value && typeof value === 'object') {
    return new Map(Object.entries(value as Record<string, boolean>));
  }
  return new Map([['*', true]]);
}

export async function getPreference(userId: string): Promise<PrefLike> {
  await connectDB();
  const doc = await NotificationPreference.findOne({ userId });
  if (!doc) return { ...DEFAULT_PREF };
  return {
    push:       toMap(doc.push),
    email:      toMap(doc.email),
    quietHours: doc.quietHours ?? null,
    digest:     doc.digest,
  };
}

export function channelAllowed(
  pref: PrefLike,
  event: NotifEvent,
  channel: 'push' | 'email',
  now: Date
): boolean {
  if (event.mandatory) return true;

  const map = pref[channel];
  const allowed = map.get(event.id) ?? map.get('*') ?? true;
  if (!allowed) return false;

  if (event.urgency === 'normal' && pref.quietHours && isInQuietHours(pref.quietHours, now)) {
    return false;
  }
  return true;
}

function isInQuietHours(
  qh: { start: string; end: string; tz: string },
  now: Date
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: qh.tz,
      hour:     '2-digit',
      minute:   '2-digit',
      hour12:   false,
    });
    const parts  = formatter.formatToParts(now);
    const hour   = parts.find((p) => p.type === 'hour')?.value   ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const current = `${hour}:${minute}`;
    const { start, end } = qh;
    // Overnight range (e.g. 22:00 → 08:00)
    if (start > end) return current >= start || current <= end;
    return current >= start && current <= end;
  } catch {
    return false;
  }
}
