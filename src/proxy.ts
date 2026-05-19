import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/painter/:path*', '/owner/:path*', '/admin/:path*'],
};
