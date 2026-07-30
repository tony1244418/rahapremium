import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'www.rahapremium.com';
const APEX_HOST = 'rahapremium.com';

// The adult-site domain. Falls back to an env var so it can be overridden per
// deployment without a code change.
const ADULT_DOMAIN = process.env.NEXT_PUBLIC_ADULT_DOMAIN || 'adult.rahapremium.site';

/** True when a hostname belongs to the adult site. */
function isAdultDomain(host: string): boolean {
  const bare = host.split(':')[0].toLowerCase();
  const adultBare = ADULT_DOMAIN.split(':')[0].toLowerCase();
  return bare === adultBare || bare === `www.${adultBare}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Force the apex domain (rahapremium.com) to redirect to the canonical
  // www host. OneSignal is registered for https://www.rahapremium.com, and
  // serving the app on the apex also causes mixed-MIME issues from Apache.
  // We do this before any other matching so it applies to every page request.
  if (host === APEX_HOST) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();

  // Tag requests arriving on the adult domain so the app can render the
  // adult-only experience. This header is readable server-side and we also
  // expose it as a client-readable custom request header.
  if (isAdultDomain(host)) {
    response.headers.set('x-is-adult-site', '1');
  }

  // Allow PWA files without authentication (static files are served before middleware)
  // This check is here for safety but static files bypass middleware
  if (pathname === '/manifest.json' || pathname === '/sw.js') {
    return response;
  }

  // Allow setup page without authentication
  if (pathname === '/setup') {
    return response;
  }

  // Allow auth page without authentication
  if (pathname === '/auth') {
    return response;
  }

  // Allow home page without authentication (but content will be restricted)
  if (pathname === '/') {
    return response;
  }

  // Protected admin routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return response;
  }

  // Allow admin login page
  if (pathname === '/admin/login') {
    return response;
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
    return response;
  }

  return response;
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
