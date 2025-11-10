import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { solveTurnstile } from '../../lib/scraper/solver-turnstile';

/**
 * Netlify Function: Test Stealth Plugin
 * Tests @sparticuz/chromium-min with puppeteer-extra stealth
 * 
 * GET /api/test-stealth
 * Query params:
 *   - url (optional): Custom URL to test
 * 
 * Returns:
 *   - success: boolean
 *   - duration: number (seconds)
 *   - walletsFound: number
 *   - logs: string[]
 */
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  
  try {
    // Get custom URL from query params
    const url = event.queryStringParameters?.url || null;
    
    console.log('[test-stealth] Starting test...');
    console.log(`[test-stealth] URL: ${url || 'default'}`);
    
    // Run the stealth solver
    const result = await solveTurnstile(url);
    
    const duration = (Date.now() - startTime) / 1000;
    const walletsFound = result.response.body?.data?.rank?.length || 0;
    
    console.log(`[test-stealth] Completed in ${duration}s`);
    console.log(`[test-stealth] Success: ${result.success}`);
    console.log(`[test-stealth] Wallets: ${walletsFound}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
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
      }, null, 2)
    };
    
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    
    console.error('[test-stealth] Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        duration,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};
