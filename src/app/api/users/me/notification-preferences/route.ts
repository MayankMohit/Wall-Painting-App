import { connectDB } from '@/lib/db';
import { NotificationPreference } from '@/lib/models';
import { ok } from '@/lib/api-response';
import { NotificationPreferenceSchema } from '@/lib/validators';
import { getPreference, encodeMapKey, type PrefLike } from '@/lib/notify/preferences';
import { withAuth } from '@/lib/middleware';
import type { z } from 'zod';

type NotificationPreferenceBody = z.infer<typeof NotificationPreferenceSchema>;

function serializePref(pref: PrefLike) {
  return {
    push:       Object.fromEntries(pref.push),
    email:      Object.fromEntries(pref.email),
    quietHours: pref.quietHours,
    digest:     pref.digest,
  };
}

function encodeKeys(obj: Record<string, boolean>): Record<string, boolean> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [encodeMapKey(k), v]));
}

export const GET = withAuth()(
  async (req, ctx) => {
    const pref = await getPreference(ctx.user!.userId);
    return ok(serializePref(pref));
  }
);

export const PUT = withAuth({ schema: NotificationPreferenceSchema, audit: 'USER_UPDATE_NOTIFICATION_PREFS' })(
  async (req, ctx) => {
    const { push, email, quietHours, digest } = ctx.body as NotificationPreferenceBody;

    const rawUpdate: Record<string, unknown> = {};
    if (push       !== undefined) rawUpdate['push']       = encodeKeys(push);
    if (email      !== undefined) rawUpdate['email']      = encodeKeys(email);
    if (quietHours !== undefined) rawUpdate['quietHours'] = quietHours ?? null;
    if (digest     !== undefined) rawUpdate['digest']     = digest;

    if (Object.keys(rawUpdate).length > 0) {
      await connectDB();
      await NotificationPreference.findOneAndUpdate(
        { userId: ctx.user!.userId },
        { $set: rawUpdate },
        { upsert: true }
      );
    }

    const pref = await getPreference(ctx.user!.userId);
    return ok(serializePref(pref));
  }
);
