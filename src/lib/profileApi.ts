export function authHdrs(): Record<string, string> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

export async function apiPost(url: string, body: object) {
  const res  = await fetch(url, { method: 'POST', headers: authHdrs(), body: JSON.stringify(body) });
  const json = await res.json();
  return { ok: res.ok, data: json.data ?? json };
}
