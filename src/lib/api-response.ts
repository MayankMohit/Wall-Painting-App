export function ok(data: unknown, status = 200): Response {
  return Response.json({ data }, { status });
}

export function created(data: unknown): Response {
  return Response.json({ data }, { status: 201 });
}

export function err(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function notFound(msg = 'Not found'): Response {
  return Response.json({ error: msg }, { status: 404 });
}

export function forbidden(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

export function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function badRequest(msg: string): Response {
  return Response.json({ error: msg }, { status: 400 });
}
