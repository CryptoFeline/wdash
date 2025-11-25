import { NextRequest, NextResponse } from 'next/server';

// Backend API Configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.API_KEY || 'test-api-key-12345';

// Rate limiting (simple in-memory)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute (lower for analytics - expensive)
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
  { params }: { params: Promise<{ wallet: string; chain: string }> }
) {
  try {
    const { wallet, chain } = await params;

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      );
    }

    // Validate inputs
    if (!wallet || wallet.length < 32) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid wallet address',
          message: 'Wallet address must be at least 32 characters'
        },
        { status: 400 }
      );
    }

    if (!chain || !['501', '1', '56', '137'].includes(chain)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid chain',
          message: 'Chain must be 501 (Solana), 1 (Ethereum), 56 (BSC), or 137 (Polygon)'
        },
        { status: 400 }
      );
    }

    // Proxy to backend
    const backendUrl = `${BACKEND_URL}/advanced-analysis/${wallet}/${chain}`;
    
    console.log(`[Frontend API] Proxying: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Frontend API] Backend error: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend error',
          message: `Backend returned ${response.status}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Add cache headers (5 minutes)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (error: any) {
    console.error('[Frontend API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/advanced-analysis/[wallet]/[chain]
 * Cancel an in-progress analysis job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string; chain: string }> }
) {
  try {
    const { wallet, chain } = await params;

    // Proxy DELETE to backend
    const backendUrl = `${BACKEND_URL}/advanced-analysis/${wallet}/${chain}`;
    
    console.log(`[Frontend API] Cancelling job: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Frontend API] Cancel error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
