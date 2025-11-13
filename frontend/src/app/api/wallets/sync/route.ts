import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.API_KEY;

export async function GET(request: NextRequest) {
  // Check origin/referer (defense in depth)
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const allowedDomains = ['wdashboard.netlify.app', 'localhost', '127.0.0.1'];
  
  const isAllowed = allowedDomains.some(domain => 
    referer?.includes(domain) || origin?.includes(domain)
  );
  
  // Allow local development, but block cross-origin abuse
  if (process.env.NODE_ENV === 'production' && !isAllowed) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Rate limit: 600 requests per minute per IP (10 per second - for sync engine)
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP, 600, 60 * 1000);

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
  const address = searchParams.get('address');
  const chain = searchParams.get('chain') || 'sol';

  if (!address) {
    return NextResponse.json(
      { error: 'Missing required parameter: address' },
      { status: 400 }
    );
  }

  // Build URL to backend sync endpoint
  const url = `${API_BASE_URL}/wallets/sync?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(chain)}`;

  console.log('[API Route] Fetching wallet sync data:', `address=${address.substring(0, 8)}..., chain=${chain}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY || '',
      },
    });

    if (!response.ok) {
      console.error('[API Route] Backend responded with status:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch wallet sync data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Route] Error fetching wallet sync data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
