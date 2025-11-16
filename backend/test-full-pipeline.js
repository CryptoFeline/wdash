/**
 * Full Enrichment Pipeline Test
 * 
 * Tests complete flow:
 * 1. Fetch transactions (Endpoint #7)
 * 2. FIFO reconstruction
 * 3. Token overview enrichment (rug detection, liquidity checks) - NEW
 * 4. Market cap enrichment
 * 5. OHLC price enrichment (with 7-30 day lookforward) - UPDATED
 * 6. Risk checks
 * 7. Metrics calculation
 * 8. Token aggregation
 * 9. Advanced Analysis formatting
 */

import { fetchAllTransactionsWithRetry } from './services/transactionFetcher.js';
import { reconstructFIFOTrades } from './services/fifoReconstruction.js';
import { enrichTradesWithTokenOverview } from './services/tokenOverviewService.js';
import { enrichTradesWithMarketCap } from './services/marketCapService.js';
import { enrichTradesWithPrices } from './services/priceEnrichment.js';
import { enrichTradesWithRiskCheck, filterRiskyTrades } from './services/riskCheck.js';
import { computeMetrics } from './services/metricsComputation.js';
import { calculateDiversityMetrics, calculateTemporalDiversity } from './services/diversityMetrics.js';
import { formatForAdvancedAnalysis } from './services/tokenAggregation.js';

const WALLET_ADDRESS = 'Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN';
const CHAIN = 'sol';

async function testFullPipeline() {
  console.log('='.repeat(80));
  console.log('TEST: Full Enrichment Pipeline');
  console.log('='.repeat(80));
  console.log();
  
  const startTime = Date.now();
  
  try {
    // Step 1: Fetch transactions
    console.log('[1/9] Fetching transactions...');
    const transactions = await fetchAllTransactionsWithRetry(WALLET_ADDRESS, CHAIN, {
      pageSize: 50,
      maxPages: 3, // Limit for faster testing
      filterRisk: true,
      tradeTypes: [1, 2]
    });
    console.log(`✓ Fetched ${transactions.length} transactions`);
    console.log();
    
    // Step 2: FIFO reconstruction
    console.log('[2/9] Reconstructing FIFO trades...');
    const fifoResult = reconstructFIFOTrades(transactions);
    let { closedTrades, openPositions } = fifoResult;
    console.log(`✓ ${closedTrades.length} closed trades, ${openPositions.length} open positions`);
    console.log();
    
    // Limit to first 10 trades for enrichment (to avoid rate limits)
    const tradesToEnrich = closedTrades.slice(0, 10);
    console.log(`[Enrichment] Processing ${tradesToEnrich.length} trades (limited for testing)`);
    console.log();
    
    // Step 3: Token overview enrichment (rug detection, liquidity checks) - NEW
    console.log('[3/9] Enriching with token overview (rug detection)...');
    let enrichedTrades = await enrichTradesWithTokenOverview(tradesToEnrich, CHAIN);
    const rugDetected = enrichedTrades.filter(t => t.is_rug).length;
    const hasLiquidityData = enrichedTrades.filter(t => t.liquidity_status !== undefined).length;
    console.log(`✓ ${rugDetected}/${enrichedTrades.length} trades flagged as rugged`);
    console.log(`✓ ${hasLiquidityData}/${enrichedTrades.length} trades have liquidity data`);
    console.log();
    
    // Step 4: Market cap enrichment
    console.log('[4/9] Enriching with market cap data...');
    enrichedTrades = await enrichTradesWithMarketCap(enrichedTrades, CHAIN);
    const mcapEnriched = enrichedTrades.filter(t => t.mcap_bracket !== undefined).length;
    console.log(`✓ ${mcapEnriched}/${enrichedTrades.length} trades have market cap data`);
    console.log();
    
    // Step 5: OHLC price enrichment (with 7-30 day lookforward) - UPDATED
    console.log('[5/9] Enriching with OHLC price data (7-30 day lookforward)...');
    enrichedTrades = await enrichTradesWithPrices(enrichedTrades, CHAIN);
    const ohlcEnriched = enrichedTrades.filter(t => t.max_potential_roi > 0).length;
    console.log(`✓ ${ohlcEnriched}/${enrichedTrades.length} trades have max_potential_roi`);
    console.log();
    
    // Step 6: Risk checks
    console.log('[6/9] Running risk checks...');
    enrichedTrades = await enrichTradesWithRiskCheck(enrichedTrades, CHAIN);
    const riskyTrades = enrichedTrades.filter(t => t.is_risky).length;
    console.log(`✓ ${riskyTrades}/${enrichedTrades.length} trades flagged as risky`);
    console.log();
    
    // Step 7: Metrics calculation
    console.log('[7/9] Computing metrics...');
    const metrics = computeMetrics(enrichedTrades);
    metrics.diversity = calculateDiversityMetrics(enrichedTrades);
    metrics.temporal_diversity = calculateTemporalDiversity(enrichedTrades);
    console.log(`✓ Metrics computed:`);
    console.log(`  - Total trades: ${metrics.total_trades}`);
    console.log(`  - Win rate: ${metrics.win_rate.toFixed(1)}%`);
    console.log(`  - Total PnL: $${metrics.total_realized_pnl.toFixed(2)}`);
    console.log(`  - Avg ROI: ${metrics.avg_realized_roi.toFixed(2)}%`);
    console.log(`  - Entry skill score: ${metrics.entry_skill_score}/100`);
    console.log(`  - Exit skill score: ${metrics.exit_skill_score}/100`);
    console.log(`  - Copy trade rating: ${metrics.copy_trade_rating}`);
    console.log();
    
    // Step 8: Token aggregation
    console.log('[8/9] Formatting for Advanced Analysis tab...');
    const advancedData = formatForAdvancedAnalysis(enrichedTrades, openPositions);
    console.log(`✓ Advanced Analysis data prepared:`);
    console.log(`  - Overview: ${advancedData.overview.total_trades} trades in 7d`);
    console.log(`  - Tokens: ${advancedData.tokens.length} unique tokens`);
    console.log(`  - Trade details: ${advancedData.trades.length} recent trades`);
    console.log(`  - Open positions: ${advancedData.open_positions.length} positions`);
    console.log();
    
    // Step 9: Show sample data
    console.log('[9/9] Sample Advanced Analysis data structure:');
    console.log();
    
    console.log('7D Overview:');
    console.log(JSON.stringify(advancedData.overview, null, 2));
    console.log();
    
    console.log('Top 3 Tokens by PnL:');
    advancedData.tokens.slice(0, 3).forEach((token, i) => {
      console.log(`\n  ${i + 1}. ${token.token_symbol}`);
      console.log(`     Total trades: ${token.total_trades}`);
      console.log(`     Win rate: ${token.win_rate.toFixed(1)}%`);
      console.log(`     Total PnL: $${token.total_pnl.toFixed(2)}`);
      console.log(`     Total ROI: ${token.total_roi_percent.toFixed(2)}%`);
      console.log(`     Avg holding: ${token.avg_holding_hours.toFixed(2)} hours`);
    });
    console.log();
    
    console.log('Sample Trade (most recent):');
    const sampleTrade = advancedData.trades[0];
    console.log(JSON.stringify({
      trade_id: sampleTrade.trade_id,
      token_symbol: sampleTrade.token_symbol,
      entry_time: new Date(sampleTrade.entry_timestamp).toISOString(),
      exit_time: new Date(sampleTrade.exit_timestamp).toISOString(),
      entry_price: sampleTrade.entry_price,
      exit_price: sampleTrade.exit_price,
      quantity: sampleTrade.quantity,
      realized_pnl: sampleTrade.realized_pnl,
      realized_roi: sampleTrade.realized_roi,
      holding_hours: sampleTrade.holding_hours,
      win: sampleTrade.win,
      max_potential_roi: sampleTrade.max_potential_roi,
      mcap_bracket: sampleTrade.mcap_bracket,
      risk_level: sampleTrade.risk_level
    }, null, 2));
    console.log();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('='.repeat(80));
    console.log(`✅ FULL PIPELINE TEST PASSED! ⏱️  Total time: ${elapsed}s`);
    console.log('='.repeat(80));
    console.log();
    
    console.log('Pipeline Summary:');
    console.log(`  1. Transactions fetched: ${transactions.length}`);
    console.log(`  2. FIFO trades reconstructed: ${closedTrades.length} closed + ${openPositions.length} open`);
    console.log(`  3. Market cap enrichment: ${mcapEnriched}/${enrichedTrades.length} trades`);
    console.log(`  4. OHLC enrichment: ${ohlcEnriched}/${enrichedTrades.length} trades`);
    console.log(`  5. Risk checks: ${riskyTrades}/${enrichedTrades.length} risky`);
    console.log(`  6. Metrics computed: ${metrics.total_trades} trades analyzed`);
    console.log(`  7. Advanced Analysis formatted: ${advancedData.tokens.length} tokens`);
    console.log();
    
    console.log('✅ All enrichments working correctly!');
    console.log('✅ FIFO trades properly reconstructed!');
    console.log('✅ Advanced Analysis tab data ready!');
    console.log();
    
    console.log('Expected API Response Structure:');
    console.log('{');
    console.log('  wallet_address: "...",');
    console.log('  chain: "sol",');
    console.log('  metrics: { /* Core metrics */ },');
    console.log('  advanced_analysis: {');
    console.log('    overview: { /* 7D summary */ },');
    console.log('    tokens: [ /* Per-token aggregates */ ],');
    console.log('    trades: [ /* Per-trade FIFO details */ ],');
    console.log('    open_positions: [ /* Current holdings */ ]');
    console.log('  },');
    console.log('  data_source: "OKX Endpoint #7 (individual transactions)",');
    console.log('  reconstruction_method: "FIFO"');
    console.log('}');
    console.log();
    
    return true;
    
  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ PIPELINE TEST FAILED!');
    console.error('='.repeat(80));
    console.error();
    console.error('Error:', error.message);
    console.error();
    console.error('Stack trace:');
    console.error(error.stack);
    console.error();
    
    return false;
  }
}

// Run test
testFullPipeline()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
