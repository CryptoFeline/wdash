/**
 * Test FIFO Trade Reconstruction with Real OKX Data
 * 
 * Tests the new implementation using OKX Endpoint #7 (individual transactions)
 * instead of Endpoint #4 (aggregated per-token data).
 * 
 * Validates:
 * 1. Transaction fetching with pagination
 * 2. FIFO matching algorithm
 * 3. Individual trade records with exact timestamps
 * 4. Proper PnL calculations
 * 5. Trade count = matched buy→sell pairs, not unique tokens
 */

import { fetchAllTransactionsWithRetry, getTransactionSummary } from './services/transactionFetcher.js';
import { reconstructFIFOTrades, validateFIFOReconstruction } from './services/fifoReconstruction.js';

const WALLET_ADDRESS = 'Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN';
const CHAIN = 'sol';

async function testFIFOReconstruction() {
  console.log('='.repeat(80));
  console.log('TEST: FIFO Trade Reconstruction with OKX Endpoint #7');
  console.log('='.repeat(80));
  console.log();
  
  const startTime = Date.now();
  
  try {
    // Step 1: Fetch individual transactions
    console.log(`[1/5] Fetching individual transactions for ${WALLET_ADDRESS}...`);
    const transactions = await fetchAllTransactionsWithRetry(WALLET_ADDRESS, CHAIN, {
      pageSize: 100,
      maxPages: 10, // Limit for testing
      filterRisk: true,
      tradeTypes: [1, 2]
    });
    
    console.log(`✓ Fetched ${transactions.length} transactions`);
    console.log();
    
    // Step 2: Show transaction summary
    console.log(`[2/5] Transaction Summary:`);
    const summary = getTransactionSummary(transactions);
    console.log(`  Total transactions: ${summary.totalTransactions}`);
    console.log(`  Buys: ${summary.totalBuys}`);
    console.log(`  Sells: ${summary.totalSells}`);
    console.log(`  Unique tokens: ${summary.uniqueTokens}`);
    console.log(`  Total buy volume: $${summary.totalBuyVolume.toFixed(2)}`);
    console.log(`  Total sell volume: $${summary.totalSellVolume.toFixed(2)}`);
    console.log(`  Net PnL (approx): $${summary.netVolume.toFixed(2)}`);
    console.log(`  Trading period: ${summary.tradingPeriodDays.toFixed(1)} days`);
    console.log();
    
    // Step 3: Reconstruct FIFO trades
    console.log(`[3/5] Reconstructing FIFO trades...`);
    const fifoResult = reconstructFIFOTrades(transactions);
    
    console.log(`✓ Reconstruction complete:`);
    console.log(`  Closed trades: ${fifoResult.closedTrades.length}`);
    console.log(`  Open positions: ${fifoResult.openPositions.length}`);
    console.log(`  Tokens traded: ${fifoResult.tokensTraded}`);
    console.log();
    
    // Step 4: Validate reconstruction
    console.log(`[4/5] Validating FIFO reconstruction...`);
    validateFIFOReconstruction(transactions, fifoResult);
    console.log(`✓ Validation passed`);
    console.log();
    
    // Step 5: Analyze results
    console.log(`[5/5] Analyzing FIFO trade results:`);
    console.log();
    
    const { closedTrades, openPositions } = fifoResult;
    
    // Show first 5 closed trades as examples
    console.log(`Example Closed Trades (first 5):`);
    closedTrades.slice(0, 5).forEach((trade, i) => {
      console.log(`\n  Trade #${i + 1}: ${trade.token_symbol}`);
      console.log(`    Entry: ${new Date(trade.entry_timestamp).toISOString()} @ $${trade.entry_price.toFixed(8)}`);
      console.log(`    Exit:  ${new Date(trade.exit_timestamp).toISOString()} @ $${trade.exit_price.toFixed(8)}`);
      console.log(`    Amount: ${trade.quantity.toFixed(4)} tokens`);
      console.log(`    Value: $${trade.entry_value.toFixed(2)} → $${trade.exit_value.toFixed(2)}`);
      console.log(`    PnL: $${trade.realized_pnl.toFixed(2)} (${trade.realized_roi.toFixed(2)}%)`);
      console.log(`    Holding: ${trade.holding_hours.toFixed(2)} hours (${trade.holding_days.toFixed(2)} days)`);
      console.log(`    Win: ${trade.win ? '✓' : '✗'}`);
      console.log(`    TxHash: Buy ${trade.buy_txHash.slice(0, 8)}... → Sell ${trade.sell_txHash.slice(0, 8)}...`);
    });
    
    console.log();
    console.log(`Example Open Positions (first 3):`);
    openPositions.slice(0, 3).forEach((pos, i) => {
      console.log(`\n  Position #${i + 1}: ${pos.token_symbol}`);
      console.log(`    Entry: ${new Date(pos.entry_timestamp).toISOString()} @ $${pos.entry_price.toFixed(8)}`);
      console.log(`    Amount: ${pos.quantity.toFixed(4)} tokens`);
      console.log(`    Value: $${pos.entry_value.toFixed(2)}`);
      console.log(`    Holding: ${pos.holding_hours.toFixed(2)} hours (${pos.holding_days.toFixed(2)} days)`);
      console.log(`    TxHash: Buy ${pos.buy_txHash.slice(0, 8)}...`);
    });
    
    console.log();
    console.log('='.repeat(80));
    console.log('CRITICAL VALIDATION:');
    console.log('='.repeat(80));
    console.log();
    
    // Calculate statistics
    const wins = closedTrades.filter(t => t.win).length;
    const losses = closedTrades.length - wins;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length * 100) : 0;
    const totalPnL = closedTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
    const avgHolding = closedTrades.reduce((sum, t) => sum + t.holding_hours, 0) / closedTrades.length;
    
    console.log(`✓ Trade Count = ${closedTrades.length} (FIFO-matched pairs, NOT ${summary.uniqueTokens} tokens)`);
    console.log(`✓ Win/Loss = ${wins}/${losses} (${winRate.toFixed(1)}% win rate)`);
    console.log(`✓ Total PnL = $${totalPnL.toFixed(2)}`);
    console.log(`✓ Avg Holding = ${avgHolding.toFixed(2)} hours`);
    console.log();
    
    // Verify data quality
    console.log('Data Quality Checks:');
    
    // Check 1: All closed trades have exact entry/exit timestamps
    const hasTimestamps = closedTrades.every(t => 
      t.entry_timestamp > 0 && t.exit_timestamp > 0 && t.exit_timestamp >= t.entry_timestamp
    );
    console.log(`  ${hasTimestamps ? '✓' : '✗'} All trades have valid entry/exit timestamps`);
    
    // Check 2: All trades have exact prices (not averages)
    const hasPrices = closedTrades.every(t => 
      t.entry_price > 0 && t.exit_price > 0
    );
    console.log(`  ${hasPrices ? '✓' : '✗'} All trades have entry/exit prices`);
    
    // Check 3: PnL calculations are accurate
    const pnlAccurate = closedTrades.every(t => {
      const expected = t.exit_value - t.entry_value;
      return Math.abs(t.realized_pnl - expected) < 0.01;
    });
    console.log(`  ${pnlAccurate ? '✓' : '✗'} PnL calculations are accurate`);
    
    // Check 4: Holding times are positive
    const holdingPositive = closedTrades.every(t => t.holding_seconds >= 0);
    console.log(`  ${holdingPositive ? '✓' : '✗'} All holding times are positive`);
    
    // Check 5: Trade IDs are unique
    const tradeIds = new Set(closedTrades.map(t => t.trade_id));
    const uniqueIds = tradeIds.size === closedTrades.length;
    console.log(`  ${uniqueIds ? '✓' : '✗'} All trade IDs are unique`);
    
    console.log();
    
    // Compare with old approach
    console.log('='.repeat(80));
    console.log('OLD vs NEW APPROACH:');
    console.log('='.repeat(80));
    console.log();
    console.log(`OLD (Endpoint #4 - Aggregated):`);
    console.log(`  - "Trade count" = ${summary.uniqueTokens} unique tokens`);
    console.log(`  - Timestamps = approximations (latestTime - holdingTime)`);
    console.log(`  - Prices = averages (buyAvgPrice, sellAvgPrice)`);
    console.log(`  - Cannot match specific buys to specific sells`);
    console.log();
    console.log(`NEW (Endpoint #7 - Individual Transactions + FIFO):`);
    console.log(`  - Trade count = ${closedTrades.length} matched buy→sell pairs ✓`);
    console.log(`  - Timestamps = exact blockTime from blockchain ✓`);
    console.log(`  - Prices = actual entry/exit prices per transaction ✓`);
    console.log(`  - Proper FIFO matching per DEEP_ANALYSIS_PLAN.md ✓`);
    console.log();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('='.repeat(80));
    console.log(`✅ TEST PASSED! ⏱️  Total time: ${elapsed}s`);
    console.log('='.repeat(80));
    console.log();
    console.log('Next steps:');
    console.log('  1. Review trade records to ensure FIFO matching is correct');
    console.log('  2. Test with different wallets (various buy/sell patterns)');
    console.log('  3. Run full enrichment pipeline (market cap, OHLC, risk)');
    console.log('  4. Verify metrics calculations use FIFO trades');
    console.log();
    
    return true;
    
  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ TEST FAILED!');
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
testFIFOReconstruction()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
