import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.API_KEY;

/**
 * GET /api/wallets/db
 * 
 * Fetch wallets directly from Supabase via backend
 * Used on initial page load to hydrate localStorage with all accumulated wallets
 * Much faster than waiting for full GMGN API fetch (15-30s)
 * 
 * Returns all wallets in database, paginated
 */
export async function GET(request: NextRequest) {
  // Check origin/referer
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const allowedDomains = ['wdashboard.netlify.app', 'localhost', '127.0.0.1'];
  
  const isAllowed = allowedDomains.some(domain => 
    referer?.includes(domain) || origin?.includes(domain)
  );
  
  if (process.env.NODE_ENV === 'production' && !isAllowed) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Rate limit: 100 requests per minute per IP
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP, 100, 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
        }
      }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const chain = searchParams.get('chain') || 'sol';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '200';

  // Call backend /wallets/db endpoint to fetch from Supabase
  const url = `${API_BASE_URL}/wallets/db?chain=${chain}&page=${page}&limit=${limit}`;

  console.log('[API Route] Fetching from Supabase via:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY || '',
      },
      // 10s timeout for database fetch (should be fast)
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from database' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
