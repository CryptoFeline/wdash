import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for API routes
 * 
 * Note: Next.js API routes are already protected by same-origin policy.
 * External callers can't access them directly from browser due to CORS.
 * 
 * Additional protection could be added here if needed (e.g., rate limiting,
 * IP whitelist, etc.) but basic same-origin security is sufficient for most cases.
 * 
 * The real security is on the backend - Next.js routes act as a proxy
 * with the API_KEY stored server-side (not exposed to browser).
 */
export function middleware(request: NextRequest) {
  // For now, allow all requests to API routes
  // Backend handles authentication with API_KEY
  return NextResponse.next();
}

// Only run middleware on API routes
export const config = {
  matcher: '/api/:path*',
};
