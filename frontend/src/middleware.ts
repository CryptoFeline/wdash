import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FRONTEND_API_KEY = process.env.FRONTEND_API_KEY || process.env.API_KEY;

/**
 * Middleware to protect API routes in production
 * In development, allows all requests
 * In production, requires X-API-Key header
 */
export function middleware(request: NextRequest) {
  // Only protect /api/* routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Check for API key in header
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey || apiKey !== FRONTEND_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing API key' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// Only run middleware on API routes
export const config = {
  matcher: '/api/:path*',
};
