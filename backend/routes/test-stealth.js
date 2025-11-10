/**
 * Test Route for Stealth Plugin
 * 
 * Tests if puppeteer-extra-plugin-stealth works on Render
 * Uses the exact scripts from /test folder that have 95% success rate locally
 * 
 * IMPORTANT: This does NOT use the existing fetcher.js
 * It's a standalone test to verify stealth plugin works in production
 */

import express from 'express';
import { solveTurnstile } from '../scraper/solver-turnstile-test.js';
import { scrapeParallel } from '../scraper/scraper-parallel.js';

const router = express.Router();

/**
 * GET /api/test-stealth
 * Test single URL with stealth plugin (uses solver-turnstile.js)
 */
router.get('/', async (req, res) => {
  try {
    const testUrl = req.query.url || 'https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?orderby=pnl_7d&direction=desc&limit=200';
    
    console.log('[Test-Stealth] Starting test with URL:', testUrl);
    console.log('[Test-Stealth] Calling solveTurnstile...');
    
    const result = await solveTurnstile(testUrl);
    
    console.log('[Test-Stealth] Result:', {
      success: result.success,
      walletsCount: result.response?.body?.data?.rank?.length || 0,
      statusCode: result.response?.statusCode,
      error: result.error
    });
    
    res.json({
      test: 'stealth-plugin',
      environment: process.env.NODE_ENV || 'development',
      result: {
        success: result.success,
        walletsFound: result.response?.body?.data?.rank?.length || 0,
        statusCode: result.response?.statusCode,
        timing: result.timing,
        turnstileDetected: result.turnstile?.detected,
        logs: result.logs.slice(-10) // Last 10 log entries
      },
      error: result.error
    });
    
  } catch (error) {
    console.error('[Test-Stealth] Error:', error);
    res.status(500).json({
      test: 'stealth-plugin',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * GET /api/test-stealth/parallel
 * Test parallel processing with stealth plugin
 */
router.get('/parallel', async (req, res) => {
  try {
    console.log('[Test-Stealth-Parallel] Starting parallel test...');
    
    // Test URLs
    const urls = [
      'https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?orderby=pnl_7d&direction=desc&limit=200',
      'https://gmgn.ai/defi/quotation/v1/rank/eth/wallets/7d?orderby=pnl_7d&direction=desc&limit=200'
    ];
    
    console.log('[Test-Stealth-Parallel] Testing', urls.length, 'URLs...');
    const results = await scrapeParallel(urls);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    res.json({
      test: 'stealth-plugin-parallel',
      environment: process.env.NODE_ENV || 'development',
      summary: {
        total: urls.length,
        successful: successful.length,
        failed: failed.length,
        successRate: `${((successful.length / urls.length) * 100).toFixed(1)}%`
      },
      results: results.map(r => ({
        url: r.url,
        success: r.success,
        wallets: r.wallets || 0,
        error: r.error
      }))
    });
    
  } catch (error) {
    console.error('[Test-Stealth-Parallel] Error:', error);
    res.status(500).json({
      test: 'stealth-plugin-parallel',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
