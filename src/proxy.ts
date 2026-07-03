import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const PUBLIC_PATHS = [
  /^\/api\/auth\//,
  /^\/api\/health$/,
  /^\/api\/version$/,
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

// Role-scoped page sections — openable only with the auth status cookie that
// authStore sets at login. This is a UX guard (the bearer token lives in
// localStorage, unreadable at the edge): it stops signed-out visitors before
// any protected shell renders. Token validity + role are re-verified
// client-side by RouteGuard, and every data call is enforced by the API
// pipeline regardless.
const GUARDED_PAGE_RE = /^\/(admin|owner|painter)(\/|$)/;

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    if (GUARDED_PAGE_RE.test(pathname) && !request.cookies.get('wallpainter_auth_status')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/owner/:path*', '/painter/:path*'],
};
