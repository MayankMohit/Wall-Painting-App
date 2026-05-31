import { connectDB } from '@/lib/db';
import { NotificationPreference } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, badRequest } from '@/lib/api-response';
import { getPreference, type PrefLike } from '@/lib/notify/preferences';
import { NotificationPreferenceSchema } from '@/lib/validators';

function serializePref(pref: PrefLike) {
  return {
    push:       Object.fromEntries(pref.push),
    email:      Object.fromEntries(pref.email),
    quietHours: pref.quietHours,
    digest:     pref.digest,
  };
}

export async function GET(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    return e as Response;
  }

  const pref = await getPreference(payload.userId);
  return ok(serializePref(pref));
}

export async function PUT(request: Request) {
  let payload;
  try {
    payload = await requireAuth(request);
  } catch (e) {
    return e as Response;
  }

  const body = await request.json().catch(() => null);
  const parsed = NotificationPreferenceSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');

  await connectDB();

  const { push, email, quietHours, digest } = parsed.data;

  const update: Record<string, unknown> = {};
  if (push       !== undefined) update['push']       = push;
  if (email      !== undefined) update['email']      = email;
  if (quietHours !== undefined) update['quietHours'] = quietHours;
  if (digest     !== undefined) update['digest']     = digest;

  const doc = await NotificationPreference.findOneAndUpdate(
    { userId: payload.userId },
    { $set: update },
    { upsert: true, new: true }
  );

  const pref: PrefLike = {
    push:       doc.push instanceof Map ? doc.push : new Map(Object.entries(doc.push as object) as [string, boolean][]),
    email:      doc.email instanceof Map ? doc.email : new Map(Object.entries(doc.email as object) as [string, boolean][]),
    quietHours: doc.quietHours ?? null,
    digest:     doc.digest,
  };

  return ok(serializePref(pref));
}
