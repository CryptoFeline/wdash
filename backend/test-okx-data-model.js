/**
 * Detailed OKX Data Structure Test
 * 
 * Examines what OKX actually returns and how it maps to our trade model
 */

import axios from 'axios';

const TEST_WALLET = 'Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN';

console.log('🔍 OKX Data Structure Analysis');
console.log('='.repeat(80));
console.log(`Wallet: ${TEST_WALLET}`);
console.log('='.repeat(80));
console.log('');

async function fetchAndAnalyzeOKXData() {
  const url = 'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list';
  const response = await axios.get(url, {
    params: {
      walletAddress: TEST_WALLET,
      chainId: '501',
      isAsc: false,
      sortType: 1,
      filterEmptyBalance: false,
      offset: 0,
      limit: 10,
      t: Date.now()
    },
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const tokenList = response.data.data.tokenList;

  console.log(`📊 Found ${tokenList.length} tokens\n`);

  // Analyze first 3 tokens in detail
  tokenList.slice(0, 3).forEach((token, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Token ${index + 1}: ${token.tokenSymbol}`);
    console.log(`${'='.repeat(80)}`);
    console.log('');
    
    console.log('📍 IDENTIFICATION:');
    console.log(`  Contract Address: ${token.tokenContractAddress}`);
    console.log(`  Symbol: ${token.tokenSymbol}`);
    console.log('');
    
    console.log('💰 BUY SIDE (Aggregated):');
    console.log(`  Buy Avg Price: $${token.buyAvgPrice}`);
    console.log(`  Buy Volume (USD): $${token.buyVolume}`);
    console.log(`  Total Buy Txs: ${token.totalTxBuy}`);
    console.log('');
    
    console.log('💸 SELL SIDE (Aggregated):');
    console.log(`  Sell Avg Price: $${token.sellAvgPrice}`);
    console.log(`  Sell Volume (USD): $${token.sellVolume}`);
    console.log(`  Total Sell Txs: ${token.totalTxSell}`);
    console.log('');
    
    console.log('📊 PNL METRICS:');
    console.log(`  Realized PnL: $${token.realizedPnl}`);
    console.log(`  Realized PnL %: ${token.realizedPnlPercentage}%`);
    console.log(`  Unrealized PnL: $${token.unrealizedPnl}`);
    console.log(`  Unrealized PnL %: ${token.unrealizedPnlPercentage}%`);
    console.log(`  Total PnL: $${token.totalPnl}`);
    console.log(`  Total PnL %: ${token.totalPnlPercentage}%`);
    console.log('');
    
    console.log('💼 CURRENT POSITION:');
    console.log(`  Current Balance: ${token.balance}`);
    console.log(`  Balance USD: $${token.balanceUsd}`);
    console.log(`  Hold Avg Price: $${token.holdAvgPrice}`);
    console.log(`  Holding Time (seconds): ${token.holdingTime}`);
    console.log(`  Latest Trade Time: ${new Date(parseInt(token.latestTime)).toISOString()}`);
    console.log('');
    
    console.log('⚠️  RISK:');
    console.log(`  Risk Level: ${token.riskLevel || token.riskControlLevel || 'N/A'}`);
    console.log('');
    
    // Analysis
    const buyQty = parseFloat(token.buyVolume) / parseFloat(token.buyAvgPrice);
    const sellQty = parseFloat(token.sellVolume) / parseFloat(token.sellAvgPrice);
    const balance = parseFloat(token.balance || 0);
    const isClosed = balance === 0;
    
    console.log('🔬 ANALYSIS:');
    console.log(`  Status: ${isClosed ? 'CLOSED' : 'OPEN'}`);
    console.log(`  Total Buy Transactions: ${token.totalTxBuy}`);
    console.log(`  Total Sell Transactions: ${token.totalTxSell}`);
    console.log(`  Estimated Buy Quantity: ${buyQty.toFixed(2)}`);
    console.log(`  Estimated Sell Quantity: ${sellQty.toFixed(2)}`);
    console.log(`  Current Balance: ${balance}`);
    console.log('');
    
    console.log('💡 INTERPRETATION:');
    if (isClosed && token.totalTxBuy === 1 && token.totalTxSell === 1) {
      console.log(`  ✅ Simple: 1 buy → 1 sell (complete round trip)`);
    } else if (isClosed && token.totalTxBuy > 1 && token.totalTxSell === 1) {
      console.log(`  📊 Multiple buys (${token.totalTxBuy}) → 1 sell (DCA then exit)`);
    } else if (isClosed && token.totalTxBuy === 1 && token.totalTxSell > 1) {
      console.log(`  📊 1 buy → Multiple sells (${token.totalTxSell}) (gradual exit)`);
    } else if (isClosed && token.totalTxBuy > 1 && token.totalTxSell > 1) {
      console.log(`  📊 Complex: ${token.totalTxBuy} buys → ${token.totalTxSell} sells (multiple entries/exits)`);
    } else if (!isClosed && balance > 0) {
      console.log(`  🔄 Position still open (balance: ${balance})`);
      console.log(`  📊 ${token.totalTxBuy} buys, ${token.totalTxSell} partial sells so far`);
    }
    console.log('');
    
    console.log('⚖️  WHAT OKX PROVIDES:');
    console.log(`  - Aggregated average buy price across ALL ${token.totalTxBuy} buys`);
    console.log(`  - Aggregated average sell price across ALL ${token.totalTxSell} sells`);
    console.log(`  - Total realized PnL (completed portion only)`);
    console.log(`  - Total unrealized PnL (open position only)`);
    console.log(`  - Holding time (time between first buy and last sell/now)`);
    console.log('');
    
    console.log('❌ WHAT OKX DOES NOT PROVIDE:');
    console.log(`  - Individual buy timestamps (we only have latestTime)`);
    console.log(`  - Individual sell timestamps`);
    console.log(`  - FIFO matching between specific buys and sells`);
    console.log(`  - Entry timestamp per buy (only holdingTime total)`);
    console.log(`  - Exit timestamp per sell`);
    console.log('');
    
    console.log('🎯 OUR MAPPING APPROACH:');
    console.log(`  - Treat entire token history as ONE "aggregated trade"`);
    console.log(`  - entry_price = buyAvgPrice (average of all buys)`);
    console.log(`  - exit_price = sellAvgPrice (average of all sells)`);
    console.log(`  - entry_timestamp ≈ latestTime - holdingTime`);
    console.log(`  - exit_timestamp ≈ latestTime (for closed) or null (for open)`);
    console.log(`  - realized_pnl = OKX's realizedPnl`);
    console.log(`  - realized_roi = OKX's realizedPnlPercentage`);
    console.log('');
    
    console.log('⚠️  LIMITATIONS:');
    console.log(`  - Cannot reconstruct individual FIFO trades`);
    console.log(`  - Timestamps are approximations`);
    console.log(`  - "trade_count" in diversity = number of TOKENS traded`);
    console.log(`  - Each token counts as 1 "trade" regardless of buy/sell count`);
    console.log('');
  });

  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY OF OKX DATA MODEL');
  console.log('='.repeat(80));
  console.log('');
  console.log('✅ OKX provides: Per-Token Aggregated Analytics');
  console.log('   - One entry per unique token address');
  console.log('   - Aggregates ALL buys into buyAvgPrice and buyVolume');
  console.log('   - Aggregates ALL sells into sellAvgPrice and sellVolume');
  console.log('   - Counts total buy transactions and sell transactions');
  console.log('   - Calculates overall realized and unrealized PnL per token');
  console.log('');
  console.log('❌ OKX does NOT provide: Individual Transaction History');
  console.log('   - No individual buy/sell timestamps');
  console.log('   - No FIFO matching between buys and sells');
  console.log('   - No per-transaction PnL breakdown');
  console.log('');
  console.log('🎯 Our Metrics Interpretation:');
  console.log('   - total_trades = number of TOKENS traded (not transactions)');
  console.log('   - win_rate = % of tokens with positive realized PnL');
  console.log('   - avg_realized_roi = average of all token ROIs');
  console.log('   - "trade_count" in diversity = tokens traded (e.g., if someone');
  console.log('     traded BONK 10 times, it counts as 1 token, 10 transactions)');
  console.log('');
  console.log('📚 For TRUE transaction-level data:');
  console.log('   - Would need OKX Endpoint 6: Trading History (kline-bs-point)');
  console.log('   - That endpoint provides individual buy/sell events with timestamps');
  console.log('   - Could then reconstruct proper FIFO trades');
  console.log('   - But would require 1 API call per token (50+ calls)');
  console.log('');
  console.log('💡 Current Approach is CORRECT for OKX aggregated data:');
  console.log('   - We treat each token as an "aggregated trade"');
  console.log('   - Metrics are per-token, not per-transaction');
  console.log('   - This is what OKX wallet profile UI also shows');
  console.log('   - Matches DEEP_ANALYSIS_PLAN.md "aggregated trade record"');
  console.log('');
}

fetchAndAnalyzeOKXData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
