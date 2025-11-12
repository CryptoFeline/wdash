import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.API_KEY;
const FRONTEND_API_KEY = process.env.FRONTEND_API_KEY;

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

  // Optional: require frontend API key
  if (FRONTEND_API_KEY) {
    const providedKey = request.headers.get('x-api-key');
    if (providedKey !== FRONTEND_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  const searchParams = request.nextUrl.searchParams;
  const chain = searchParams.get('chain') || 'eth';
  const timeframe = searchParams.get('timeframe') || '7d';
  const tag = searchParams.get('tag') || 'all';

  const url = `${API_BASE_URL}/wallets/stats?chain=${chain}&timeframe=${timeframe}&tag=${tag}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
