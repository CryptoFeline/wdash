import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.API_KEY;
const FRONTEND_API_KEY = process.env.FRONTEND_API_KEY || process.env.API_KEY; // Key to protect frontend routes

/**
 * Validate request is authorized
 * Checks for X-API-Key header or x-api-key query param
 */
function validateRequest(request: NextRequest): boolean {
  // In development, allow without key
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const headerKey = request.headers.get('x-api-key');
  const queryKey = request.nextUrl.searchParams.get('x-api-key');
  
  return headerKey === FRONTEND_API_KEY || queryKey === FRONTEND_API_KEY;
}

export async function GET(request: NextRequest) {
  // Validate request
  if (!validateRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing API key' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const chain = searchParams.get('chain') || 'eth';
  const timeframe = searchParams.get('timeframe') || '7d';
  const tag = searchParams.get('tag') || 'all';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '50';

  // Don't add cacheOnly=true - let backend decide if it needs to fetch
  const url = `${API_BASE_URL}/wallets?chain=${chain}&timeframe=${timeframe}&tag=${tag}&page=${page}&limit=${limit}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch wallets' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
