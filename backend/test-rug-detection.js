/**
 * Test script to verify rug detection works with known rugged tokens
 * 
 * This tests OKX Endpoint #14 (token/overview) integration and the 7-factor rug scoring system:
 * - Developer rug history (devRugPullTokenCount)
 * - Liquidity drainage (totalLiquidity vs marketCap)
 * - Developer dumping (devHoldingStatus)
 * - Bundle concentration (bundleHoldingRatio)
 * - Smart money exit (smartMoneyHoldingStatus)
 * - Sniper exodus (snipersClear vs snipersTotal)
 * - Catastrophic PnL (trade realized_roi < -95%)
 */

import { fetchTokenOverview, analyzeRugIndicators, analyzeLiquidityStatus } from './services/tokenOverviewService.js';

// Known token addresses for testing
const TEST_TOKENS = {
  // User mentioned this as a rugged token example
  rugged: '4qbHjy5Pg7CtXiqNhK3YLxAcgisWYB86woaLy9U5VAqr',
  
  // User provided this as example with low liquidity warning
  darkwhale: 'AkbhWcLEqWrXMWUBN7s47w8j3PfANqPEq6G9pump',
  
  // Add more test cases here
};

async function testRugDetection(tokenAddress, chain = 'sol') {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing rug detection for: ${tokenAddress}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    // Step 1: Fetch token overview data
    console.log(`[1/3] Fetching token overview from OKX Endpoint #14...`);
    const overview = await fetchTokenOverview(tokenAddress, chain);
    
    if (!overview) {
      console.error(`❌ Failed to fetch token overview`);
      return null;
    }
    
    console.log(`✅ Token overview fetched successfully\n`);
    
    // Step 2: Analyze liquidity status
    console.log(`[2/3] Analyzing liquidity status...`);
    const liquidityAnalysis = analyzeLiquidityStatus(overview);
    
    console.log(`Liquidity Status: ${liquidityAnalysis.liquidity_status.toUpperCase()}`);
    console.log(`  - Total Liquidity: $${liquidityAnalysis.liquidity_usd.toLocaleString()}`);
    console.log(`  - Market Cap: $${liquidityAnalysis.market_cap_usd.toLocaleString()}`);
    console.log(`  - Liquidity Ratio: ${(liquidityAnalysis.liquidity_ratio * 100).toFixed(2)}%`);
    console.log(`  - Can Exit: ${liquidityAnalysis.can_exit ? '✅ YES' : '❌ NO'}\n`);
    
    // Step 3: Test rug detection with different PnL scenarios
    console.log(`[3/3] Testing rug detection with various PnL scenarios...\n`);
    
    const testCases = [
      { realized_roi: -0.97, label: 'Hard Rug (PnL: -97%)' },
      { realized_roi: -0.65, label: 'Soft Rug (PnL: -65%)' },
      { realized_roi: -0.25, label: 'Losing Trade (PnL: -25%)' },
      { realized_roi: 0.50, label: 'Winning Trade (PnL: +50%)' },
    ];
    
    for (const testCase of testCases) {
      const mockTrade = {
        token_address: tokenAddress,
        realized_roi: testCase.realized_roi,
      };
      
      const rugAnalysis = analyzeRugIndicators(overview, mockTrade);
      
      console.log(`\n${'-'.repeat(60)}`);
      console.log(`Test Case: ${testCase.label}`);
      console.log(`${'-'.repeat(60)}`);
      console.log(`Is Rug: ${rugAnalysis.is_rug ? '🚨 YES' : '✅ NO'}`);
      console.log(`Rug Type: ${rugAnalysis.rug_type || 'N/A'}`);
      console.log(`Confidence: ${rugAnalysis.rug_confidence}%`);
      console.log(`Reasons (${rugAnalysis.rug_reasons.length}):`);
      
      if (rugAnalysis.rug_reasons.length === 0) {
        console.log(`  ✅ No rug indicators detected`);
      } else {
        rugAnalysis.rug_reasons.forEach(reason => {
          console.log(`  🚨 ${reason}`);
        });
      }
    }
    
    // Step 4: Display developer metrics
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Developer Metrics`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Tokens Created: ${overview.basicInfo?.devCreateTokenCount || 0}`);
    console.log(`Rugged Tokens: ${overview.basicInfo?.devRugPullTokenCount || 0}`);
    console.log(`Dev Holding Ratio: ${typeof overview.devHoldingRatio === 'number' ? overview.devHoldingRatio.toFixed(2) : overview.devHoldingRatio || 'N/A'}%`);
    console.log(`Dev Holding Status: ${overview.tokenTagVO?.devHoldingStatus || 'unknown'}`);
    
    // Step 5: Display holder metrics
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Holder Metrics`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Bundle Holding Ratio: ${typeof overview.bundleHoldingRatio === 'number' ? overview.bundleHoldingRatio.toFixed(2) : overview.bundleHoldingRatio || 'N/A'}%`);
    console.log(`Smart Money Status: ${overview.tokenTagVO?.smartMoneyHoldingStatus || 'unknown'}`);
    console.log(`Snipers Clear/Total: ${overview.marketInfo?.snipersClear || 0}/${overview.marketInfo?.snipersTotal || 0}`);
    
    if (overview.marketInfo?.snipersTotal > 0) {
      const snipersExitRatio = overview.marketInfo.snipersClear / overview.marketInfo.snipersTotal;
      console.log(`Snipers Exit Ratio: ${(snipersExitRatio * 100).toFixed(2)}%`);
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
    
    return {
      overview,
      liquidityAnalysis,
      testCases: testCases.map(tc => ({
        ...tc,
        rugAnalysis: analyzeRugIndicators(overview, { token_address: tokenAddress, realized_roi: tc.realized_roi })
      }))
    };
    
  } catch (error) {
    console.error(`\n❌ Error testing rug detection:`, error.message);
    console.error(error.stack);
    return null;
  }
}

async function runTests() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 RUG DETECTION TEST SUITE`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Testing OKX Endpoint #14 integration and 7-factor rug scoring system`);
  console.log(`\nTest tokens:`);
  console.log(`  1. Rugged: ${TEST_TOKENS.rugged}`);
  console.log(`  2. DARKWHALE: ${TEST_TOKENS.darkwhale}`);
  
  const results = [];
  
  // Test rugged token
  console.log(`\n\n📍 TEST 1: Known Rugged Token`);
  const ruggedResult = await testRugDetection(TEST_TOKENS.rugged);
  if (ruggedResult) results.push({ token: 'rugged', ...ruggedResult });
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test DARKWHALE token
  console.log(`\n\n📍 TEST 2: DARKWHALE Token (Low Liquidity Warning)`);
  const darkwhaleResult = await testRugDetection(TEST_TOKENS.darkwhale);
  if (darkwhaleResult) results.push({ token: 'darkwhale', ...darkwhaleResult });
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.overview).length}`);
  console.log(`Failed: ${results.filter(r => !r.overview).length}`);
  
  console.log(`\n✅ Rug detection testing complete!\n`);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
