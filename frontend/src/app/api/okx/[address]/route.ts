import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.API_KEY;

// Rate limiting (simple in-memory)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    // Get optional chainId from query params
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '501';

    console.log(`[API] Proxying OKX request for wallet: ${address}, chain: ${chainId}`);

    // Forward request to backend
    const backendUrl = `${BACKEND_URL}/okx/wallet/${address}?chainId=${chainId}`;
    
    const response = await fetch(backendUrl, {
      headers: {
        'x-api-key': API_KEY || '',
        'Content-Type': 'application/json'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] Backend error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || 'Failed to fetch wallet data',
          details: errorData.details 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('[API] Error proxying OKX request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to proxy request to backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
