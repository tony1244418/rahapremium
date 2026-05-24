import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow PWA files without authentication (static files are served before middleware)
  // This check is here for safety but static files bypass middleware
  if (pathname === '/manifest.json' || pathname === '/sw.js') {
    return NextResponse.next();
  }

  // Allow setup page without authentication
  if (pathname === '/setup') {
    return NextResponse.next();
  }

  // Allow auth page without authentication
  if (pathname === '/auth') {
    return NextResponse.next();
  }

  // Allow home page without authentication (but content will be restricted)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Protected admin routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // In a real app, you would check for admin authentication here
    // For now, we'll rely on the ProtectedRoute component
    return NextResponse.next();
  }

  // Allow admin login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Protected user routes - require authentication
  const protectedUserRoutes = [
    '/movies',
    '/series',
    '/profile',
    '/subscriptions',
    '/settings'
  ];

  if (protectedUserRoutes.some(route => pathname.startsWith(route))) {
    // In a real app, you would check for user authentication here
    // For now, we'll rely on the ProtectedRoute component
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest - handled by rewrite)
     * - sw.js (service worker)
     * - public files (public folder - images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.webp$|.*\\.json$).*)',
  ],
};
