/**
 * Parallel Multi-URL Scraper
 * 
 * Processes multiple URLs in parallel using separate browser instances.
 * This achieves speed through parallelization instead of session reuse.
 * 
 * Performance: N URLs in ~85-90s (vs ~85s * N sequentially)
 * 
 * Usage:
 *   node scraper-parallel.js <url1> [url2] [url3] ...
 * 
 * Example:
 *   node scraper-parallel.js \
 *     "https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?orderby=pnl_7d&direction=desc&limit=200" \
 *     "https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/30d?orderby=pnl_30d&direction=desc&limit=200"
 */

import { solveTurnstile } from './solver-turnstile.js';

async function scrapeParallel(urls) {
  const startTime = Date.now();
  
  console.log('═'.repeat(80));
  console.log(`🚀 PARALLEL SCRAPER - Processing ${urls.length} URLs`);
  console.log('═'.repeat(80));
  console.log();
  
  // Launch all scrapers in parallel
  const promises = urls.map(async (url, index) => {
    const urlNum = index + 1;
    console.log(`[URL ${urlNum}] Starting: ${url.substring(0, 80)}...`);
    
    try {
      const result = await solveTurnstile(url);
      
      if (result.success && result.response.body) {
        const wallets = result.response.body.data?.rank?.length || 0;
        console.log(`[URL ${urlNum}] ✅ Success: ${wallets} wallets`);
        return {
          url,
          success: true,
          wallets,
          data: result.response.body
        };
      } else {
        console.log(`[URL ${urlNum}] ❌ Failed: ${result.error || 'No data'}`);
        return {
          url,
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.log(`[URL ${urlNum}] ❌ Error: ${error.message}`);
      return {
        url,
        success: false,
        error: error.message
      };
    }
  });
  
  // Wait for all to complete
  const results = await Promise.all(promises);
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Print summary
  console.log();
  console.log('═'.repeat(80));
  console.log('PARALLEL SCRAPING RESULTS');
  console.log('═'.repeat(80));
  console.log();
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`📊 Total URLs: ${urls.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Total Time: ${totalTime}s`);
  console.log(`⚡ Avg per URL: ${(parseFloat(totalTime) / urls.length).toFixed(1)}s (parallel)`);
  console.log(`🐌 Sequential would take: ~${(urls.length * 85).toFixed(0)}s`);
  console.log(`🚀 Speedup: ${(urls.length * 85 / parseFloat(totalTime)).toFixed(1)}x`);
  console.log();
  
  // Show details
  results.forEach((result, index) => {
    const urlNum = index + 1;
    if (result.success) {
      console.log(`[URL ${urlNum}] ✅ ${result.wallets} wallets`);
    } else {
      console.log(`[URL ${urlNum}] ❌ ${result.error}`);
    }
  });
  
  console.log('═'.repeat(80));
  
  return results;
}

// Export function for module usage
export { scrapeParallel };

// Only run directly if this is the main script
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  const urls = process.argv.slice(2);
  
  if (urls.length === 0) {
    console.error('Usage: node scraper-parallel.js <url1> [url2] [url3] ...');
    console.error();
    console.error('Example:');
    console.error('  node scraper-parallel.js \\');
    console.error('    "https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?orderby=pnl_7d&direction=desc&limit=200" \\');
    console.error('    "https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/30d?orderby=pnl_30d&direction=desc&limit=200"');
    process.exit(1);
  }
  
  scrapeParallel(urls)
    .then(results => {
      const allSuccessful = results.every(r => r.success);
      process.exit(allSuccessful ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
