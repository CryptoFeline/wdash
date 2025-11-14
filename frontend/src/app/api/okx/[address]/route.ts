import { NextRequest, NextResponse } from 'next/server';

// OKX API Configuration
const OKX_BASE_URL = 'https://www.okx.com/priapi/v1/dx/market/v2/pnl';

// Rate limiting (simple in-memory)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute (increased for OKX API)
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
        { code: 1, msg: 'Rate limit exceeded. Please try again in a moment.', data: null },
        { status: 429 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '501';
    const endpoint = searchParams.get('endpoint') || 'summary';
    const tokenAddress = searchParams.get('tokenAddress');
    const offset = searchParams.get('offset') || '0';
    const limit = searchParams.get('limit') || '100';

    console.log(`[OKX API] ${endpoint} request for wallet: ${address}, chain: ${chainId}`);

    // Build OKX API URL based on endpoint
    let okxUrl: string;
    
    switch (endpoint) {
      case 'summary':
        // Endpoint 1: Wallet Profile Summary
        okxUrl = `${OKX_BASE_URL}/wallet-profile/summary?address=${address}&chainId=${chainId}`;
        break;
        
      case 'tokenList':
        // Endpoint 4: Token List
        okxUrl = `${OKX_BASE_URL}/token-list?address=${address}&chainId=${chainId}&offset=${offset}&limit=${limit}`;
        break;
        
      case 'tokenHistory':
        // Endpoint 6: Token Trading History
        if (!tokenAddress) {
          return NextResponse.json(
            { code: 1, msg: 'tokenAddress is required for tokenHistory endpoint', data: null },
            { status: 400 }
          );
        }
        okxUrl = `${OKX_BASE_URL}/kline-bs-point?address=${address}&chainId=${chainId}&tokenAddress=${tokenAddress}`;
        break;
        
      default:
        return NextResponse.json(
          { code: 1, msg: `Unknown endpoint: ${endpoint}`, data: null },
          { status: 400 }
        );
    }

    // Call OKX API
    const response = await fetch(okxUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.okx.com/'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error('[OKX API] Error response:', response.status, response.statusText);
      
      // Return OKX-compatible error format
      return NextResponse.json(
        { 
          code: 1,
          msg: `OKX API error: ${response.statusText}`,
          data: null
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return data with cache headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('[OKX API] Error:', error);
    
    return NextResponse.json(
      { 
        code: 1,
        msg: 'Failed to fetch data from OKX',
        data: null,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}