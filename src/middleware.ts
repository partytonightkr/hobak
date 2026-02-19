import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/feed', '/notifications', '/settings', '/profile'];

// Routes that should redirect to /feed if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for access token in cookies or authorization header
  // Note: The actual token is in localStorage (client-side), so this middleware
  // uses a lightweight session cookie set by the client after login
  const hasSession = request.cookies.get('has_session')?.value === 'true';

  // Protect authenticated routes
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files, api routes, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
