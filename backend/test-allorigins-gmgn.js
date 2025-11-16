#!/usr/bin/env node

/**
 * Test AllOrigins CORS Proxy for GMGN API
 * 
 * Tests different approaches to bypass Cloudflare using AllOrigins public proxy
 */

import https from 'https';

const GMGN_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';

// Test different AllOrigins configurations
const tests = [
  {
    name: 'Direct /get endpoint',
    url: `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://gmgn.ai/pf/api/v1/wallet/sol/${GMGN_WALLET}/holdings?order_by=last_active_timestamp&direction=desc&limit=5`
    )}`
  },
  {
    name: 'Raw endpoint',
    url: `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://gmgn.ai/pf/api/v1/wallet/sol/${GMGN_WALLET}/holdings?order_by=last_active_timestamp&direction=desc&limit=5`
    )}`
  },
  {
    name: 'With cache disabled',
    url: `https://api.allorigins.win/get?disableCache=true&url=${encodeURIComponent(
      `https://gmgn.ai/pf/api/v1/wallet/sol/${GMGN_WALLET}/holdings?order_by=last_active_timestamp&direction=desc&limit=5`
    )}`
  }
];

/**
 * Fetch URL with timeout
 */
function fetchWithTimeout(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    https.get(url, (res) => {
      clearTimeout(timeout);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Run test
 */
async function runTest(test) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`URL: ${test.url.substring(0, 100)}...`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(test.url, 30000);
    const duration = Date.now() - startTime;

    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Headers:`, JSON.stringify(response.headers, null, 2));

    // Try to parse response
    let parsedData;
    try {
      // Check if it's wrapped in AllOrigins format
      const jsonData = JSON.parse(response.body);
      
      if (jsonData.contents) {
        // It's in AllOrigins /get format
        console.log(`\n✅ AllOrigins wrapper detected`);
        parsedData = typeof jsonData.contents === 'string' 
          ? JSON.parse(jsonData.contents) 
          : jsonData.contents;
      } else {
        // It's direct JSON (raw format)
        parsedData = jsonData;
      }

      console.log(`\n✅ GMGN Data Parsed Successfully`);
      console.log(`Data structure:`, {
        code: parsedData.code,
        message: parsedData.message,
        listCount: parsedData.data?.list?.length || 0,
        hasNext: !!parsedData.data?.next
      });

      if (parsedData.data?.list?.[0]) {
        const firstHolding = parsedData.data.list[0];
        console.log(`\nFirst holding:`, {
          token: firstHolding.token?.symbol,
          balance: firstHolding.balance,
          liquidity: firstHolding.token?.liquidity,
          unrealized_pnl: firstHolding.unrealized_profit_pnl
        });
      }

      return {
        success: true,
        duration,
        dataCount: parsedData.data?.list?.length || 0
      };

    } catch (parseError) {
      console.log(`\n❌ Failed to parse response as JSON`);
      console.log(`Response preview:`, response.body.substring(0, 500));
      
      // Check if it's an error page
      if (response.body.includes('Cloudflare') || response.body.includes('blocked')) {
        console.log(`\n⚠️  CLOUDFLARE BLOCK DETECTED`);
      }
      if (response.body.includes('error code')) {
        console.log(`\n⚠️  ERROR CODE DETECTED`);
      }

      return {
        success: false,
        error: 'Parse error',
        duration
      };
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ FAILED (${duration}ms)`);
    console.log(`Error:`, error.message);

    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   AllOrigins + GMGN API Compatibility Test                ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Testing GMGN API access through AllOrigins CORS proxy...
Wallet: ${GMGN_WALLET}
  `);

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push({ ...test, ...result });
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);

  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${i + 1}: ${result.name}`);
    console.log(`   Duration: ${result.duration}ms`);
    if (result.success) {
      console.log(`   Holdings fetched: ${result.dataCount}`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`${'='.repeat(80)}`);
  console.log(`Overall: ${successCount}/${results.length} tests passed`);
  console.log(`${'='.repeat(80)}\n`);

  if (successCount === 0) {
    console.log(`\n⚠️  RECOMMENDATION:`);
    console.log(`AllOrigins public instance cannot bypass GMGN's Cloudflare protection.`);
    console.log(`\nOptions:`);
    console.log(`1. Use browser extension (existing gmgn-scraper) - RECOMMENDED`);
    console.log(`2. Self-host AllOrigins on a fresh IP`);
    console.log(`3. Use Puppeteer/Playwright for headless browsing`);
    console.log(`4. Use paid proxy service with residential IPs\n`);
  } else {
    console.log(`\n✅ SUCCESS! AllOrigins can access GMGN API`);
    console.log(`\nNext steps:`);
    console.log(`1. Implement GMGN fetcher using successful endpoint`);
    console.log(`2. Add to backend pipeline for scam detection`);
    console.log(`3. Cache results to minimize API calls\n`);
  }
}

main().catch(console.error);
