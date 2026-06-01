import { connectDB } from '@/lib/db';
import { NotificationPreference } from '@/lib/models';
import { requireAuth } from '@/lib/rbac';
import { ok, badRequest } from '@/lib/api-response';
import { getPreference, encodeMapKey, type PrefLike } from '@/lib/notify/preferences';
import { NotificationPreferenceSchema } from '@/lib/validators';

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

  // Encode dots in map keys — BSON field names cannot contain '.'.
  // decodeMapKey() in getPreference()/toMap() reverses this on read.
  const rawUpdate: Record<string, unknown> = {};
  if (push       !== undefined) rawUpdate['push']       = encodeKeys(push);
  if (email      !== undefined) rawUpdate['email']      = encodeKeys(email);
  if (quietHours !== undefined) rawUpdate['quietHours'] = quietHours ?? null;
  if (digest     !== undefined) rawUpdate['digest']     = digest;

  if (Object.keys(rawUpdate).length > 0) {
    await NotificationPreference.findOneAndUpdate(
      { userId: payload.userId },
      { $set: rawUpdate },
      { upsert: true }
    );
  }

  const pref = await getPreference(payload.userId);
  return ok(serializePref(pref));
}
