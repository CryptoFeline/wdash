import { NextRequest, NextResponse } from 'next/server';

// Backend API Configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Rate limiting (simple in-memory)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
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

    console.log(`[OKX API Proxy] ${endpoint} request for wallet: ${address}, chain: ${chainId}`);

    // Route different endpoints
    let backendUrl: string;
    
    if (endpoint === 'summary' || endpoint === 'tokenList') {
      // Use comprehensive backend endpoint that fetches everything
      backendUrl = `${BACKEND_URL}/okx/wallet/${address}?chainId=${chainId}`;
    } else if (endpoint === 'tokenHistory') {
      // For token history, we might need a separate endpoint or handle it differently
      // For now, return the comprehensive data which includes top token histories
      backendUrl = `${BACKEND_URL}/okx/wallet/${address}?chainId=${chainId}`;
    } else {
      return NextResponse.json(
        { code: 1, msg: `Unknown endpoint: ${endpoint}`, data: null },
        { status: 400 }
      );
    }

    // Call backend
    const response = await fetch(backendUrl, {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error('[OKX API Proxy] Backend error:', response.status, response.statusText);
      const errorText = await response.text().catch(() => '');
      
      return NextResponse.json(
        { 
          code: 1,
          msg: `Backend error: ${response.statusText}`,
          data: null
        },
        { status: response.status }
      );
    }

    const backendData = await response.json();

    // Transform backend response to match OKX API format expected by frontend
    if (endpoint === 'summary') {
      // Return summary in OKX format
      return NextResponse.json({
        code: 0,
        data: backendData.data?.summary || {},
        msg: ''
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    } else if (endpoint === 'tokenList') {
      // Combine holdings and historical trades
      const holdings = backendData.data?.holdings || [];
      const historicalTrades = backendData.data?.historicalTrades || [];
      const allTokens = [...holdings, ...historicalTrades];
      
      return NextResponse.json({
        code: 0,
        data: {
          hasNext: false, // For now, we don't support pagination through backend
          tokenList: allTokens
        },
        msg: ''
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    } else {
      // Return full data for other endpoints
      return NextResponse.json({
        code: 0,
        data: backendData.data,
        msg: ''
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

  } catch (error) {
    console.error('[OKX API Proxy] Error:', error);
    
    return NextResponse.json(
      { 
        code: 1,
        msg: 'Failed to fetch data from backend',
        data: null,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}