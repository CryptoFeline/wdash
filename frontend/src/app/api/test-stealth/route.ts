import { NextRequest, NextResponse } from 'next/server';
import { solveTurnstile } from '@/lib/scraper/solver-turnstile';

/**
 * Next.js API Route: Test Stealth Plugin
 * Tests @sparticuz/chromium-min with puppeteer-extra stealth
 * 
 * GET /api/test-stealth
 * Query params:
 *   - url (optional): Custom URL to test
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get custom URL from query params
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url') || null;
    
    console.log('[test-stealth] Starting test...');
    console.log(`[test-stealth] URL: ${url || 'default'}`);
    
    // Run the stealth solver
    const result = await solveTurnstile(url);
    
    const duration = (Date.now() - startTime) / 1000;
    const walletsFound = result.response.body?.data?.rank?.length || 0;
    
    console.log(`[test-stealth] Completed in ${duration}s`);
    console.log(`[test-stealth] Success: ${result.success}`);
    console.log(`[test-stealth] Wallets: ${walletsFound}`);
    
    return NextResponse.json({
      success: result.success,
      duration,
      walletsFound,
      statusCode: result.response.statusCode,
      turnstile: {
        detected: result.turnstile.detected,
        iframeFound: result.turnstile.iframeFound,
        tokenObtained: result.turnstile.responseTokenObtained
      },
      logs: result.logs,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    
    console.error('[test-stealth] Error:', error);
    
    return NextResponse.json({
      success: false,
      duration,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
