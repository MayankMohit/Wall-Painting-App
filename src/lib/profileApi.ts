export function authHdrs(): Record<string, string> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

export async function apiPost(url: string, body: object) {
  const res  = await fetch(url, { method: 'POST', headers: authHdrs(), body: JSON.stringify(body) });
  const json = await res.json();
  return { ok: res.ok, data: json.data ?? json };
}

export async function apiPut(url: string, body: object) {
  const res  = await fetch(url, { method: 'PUT', headers: authHdrs(), body: JSON.stringify(body) });
  const json = await res.json();
  return { ok: res.ok, data: json.data ?? json };
}

// The API error envelope is `{ error: { code, message, requestId } }` (or sometimes a
// plain string). Pull out a renderable string — never the object, which would crash React.
export function errMsg(data: unknown, fallback: string): string {
  const e = (data as { error?: unknown } | null | undefined)?.error;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}
