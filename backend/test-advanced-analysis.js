/**
 * Test Advanced Analysis Pipeline
 * 
 * Tests the complete data enrichment pipeline using actual OKX API calls
 * for a real Solana wallet to verify all calculations work correctly.
 * 
 * Test wallet: 2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo
 */

import axios from 'axios';
import { computeMetrics } from './services/metricsComputation.js';
import { enrichTradesWithPrices } from './services/priceEnrichment.js';
import { enrichTradesWithMarketCap, calculateMcapDistribution } from './services/marketCapService.js';
import { calculateDiversityMetrics, calculateTemporalDiversity } from './services/diversityMetrics.js';
import { enrichTradesWithRiskCheck, filterRiskyTrades } from './services/riskCheck.js';

const TEST_WALLET = 'Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN';
const CHAIN = 'sol';
const CHAIN_ID = '501';

console.log('🧪 Advanced Analysis Pipeline Test');
console.log('=' .repeat(80));
console.log(`📍 Test Wallet: ${TEST_WALLET}`);
console.log(`⛓️  Chain: ${CHAIN.toUpperCase()} (${CHAIN_ID})`);
console.log('=' .repeat(80));
console.log('');

async function fetchOKXTokenList(walletAddress, chainId) {
  console.log('📡 Step 1: Fetching token list from OKX...');
  
  const url = 'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list';
  const response = await axios.get(url, {
    params: {
      walletAddress,
      chainId,
      isAsc: false,
      sortType: 1,
      filterEmptyBalance: false,
      offset: 0,
      limit: 100,
      t: Date.now()
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json'
    },
    timeout: 15000
  });

  if (response.data?.code !== '0' && response.data?.code !== 0) {
    throw new Error(`OKX API error: ${response.data?.msg || 'Unknown error'}`);
  }

  if (!response.data?.data?.tokenList) {
    throw new Error('No token list in OKX response');
  }

  const tokenList = response.data.data.tokenList;
  console.log(`✅ Fetched ${tokenList.length} tokens from OKX`);
  console.log('');
  
  return tokenList;
}

function mapTokensToTrades(tokenList) {
  console.log('🔄 Step 2: Mapping tokens to trade format...');
  
  const trades = tokenList.map((token, index) => {
    const buyVolume = parseFloat(token.buyVolume || 0);
    const sellVolume = parseFloat(token.sellVolume || 0);
    const balance = parseFloat(token.balance || 0);
    const realizedPnl = parseFloat(token.realizedPnl || 0);
    const realizedPnlPct = parseFloat(token.realizedPnlPercentage || 0);
    const holdingTime = parseInt(token.holdingTime || 0);
    const latestTime = parseInt(token.latestTime || Date.now());
    
    const exitTimestamp = balance > 0 ? null : latestTime;
    const entryTimestamp = latestTime - (holdingTime * 1000);
    
    return {
      trade_id: `${token.tokenContractAddress || token.tokenAddress}_${index}`,
      token_address: token.tokenContractAddress || token.tokenAddress,
      token_symbol: token.tokenSymbol,
      token_name: token.tokenSymbol,
      entry_price: parseFloat(token.buyAvgPrice || 0),
      exit_price: parseFloat(token.sellAvgPrice || 0),
      quantity: sellVolume,
      entry_value: buyVolume,
      exit_value: sellVolume,
      realized_pnl: realizedPnl,
      realized_roi: realizedPnlPct,
      holding_seconds: holdingTime,
      holding_hours: holdingTime / 3600,
      holding_days: holdingTime / 86400,
      entry_timestamp: entryTimestamp,
      exit_timestamp: exitTimestamp,
      latest_time: latestTime,
      win: realizedPnl > 0,
      status: balance > 0 ? 'open' : 'closed',
      mcap_bracket: 1,
      riskLevel: parseInt(token.riskLevel || token.riskControlLevel || 1),
      max_price_during_hold: 0,
      max_potential_roi: 0,
      time_to_peak_seconds: 0,
      time_to_peak_hours: 0,
      early_exit: false
    };
  });

  const closedTrades = trades.filter(t => t.status === 'closed');
  const openTrades = trades.filter(t => t.status === 'open');
  
  console.log(`✅ Mapped to ${trades.length} trades:`);
  console.log(`   - ${closedTrades.length} closed trades`);
  console.log(`   - ${openTrades.length} open positions`);
  console.log('');
  
  return { trades, closedTrades, openTrades };
}

async function testMarketCapEnrichment(closedTrades) {
  console.log('💰 Step 3: Testing Market Cap Enrichment...');
  console.log(`   Enriching ${closedTrades.length} trades (max 5 for test)...`);
  
  // Limit to 5 trades for testing to avoid rate limits
  const testTrades = closedTrades.slice(0, Math.min(5, closedTrades.length));
  
  const enriched = await enrichTradesWithMarketCap(testTrades, CHAIN);
  
  console.log('✅ Market cap enrichment complete:');
  enriched.forEach((trade, i) => {
    console.log(`   ${i + 1}. ${trade.token_symbol}: $${trade.mcap_usd.toLocaleString()} (Bracket ${trade.mcap_bracket})`);
  });
  console.log('');
  
  return enriched;
}

async function testOHLCEnrichment(enrichedTrades) {
  console.log('📈 Step 4: Testing OHLC Price Enrichment...');
  console.log(`   Enriching ${enrichedTrades.length} trades with historical price data...`);
  
  const ohlcEnriched = await enrichTradesWithPrices(enrichedTrades, CHAIN);
  
  console.log('✅ OHLC enrichment complete:');
  ohlcEnriched.forEach((trade, i) => {
    if (trade.max_potential_roi > 0) {
      console.log(`   ${i + 1}. ${trade.token_symbol}:`);
      console.log(`      - Realized ROI: ${trade.realized_roi.toFixed(2)}%`);
      console.log(`      - Max Potential ROI: ${trade.max_potential_roi.toFixed(2)}%`);
      console.log(`      - Time to Peak: ${trade.time_to_peak_hours.toFixed(2)} hours`);
      console.log(`      - Max Price: $${trade.max_price_during_hold.toFixed(8)}`);
    }
  });
  console.log('');
  
  return ohlcEnriched;
}

async function testRiskEnrichment(enrichedTrades) {
  console.log('⚠️  Step 5: Testing Risk Check Enrichment...');
  console.log(`   Checking risk for ${enrichedTrades.length} trades...`);
  
  const riskEnriched = await enrichTradesWithRiskCheck(enrichedTrades, CHAIN);
  
  const highRisk = riskEnriched.filter(t => t.risk_level >= 3);
  const lowRisk = riskEnriched.filter(t => t.risk_level < 3);
  
  console.log('✅ Risk check complete:');
  console.log(`   - ${highRisk.length} high risk tokens`);
  console.log(`   - ${lowRisk.length} low/medium risk tokens`);
  
  if (highRisk.length > 0) {
    console.log('   High risk tokens:');
    highRisk.forEach((trade, i) => {
      console.log(`      ${i + 1}. ${trade.token_symbol} (Risk Level: ${trade.risk_level})`);
    });
  }
  console.log('');
  
  return riskEnriched;
}

function testMetricsComputation(enrichedTrades) {
  console.log('📊 Step 6: Testing Metrics Computation...');
  
  const metrics = computeMetrics(enrichedTrades);
  
  console.log('✅ Metrics computed:');
  console.log(`   Total Trades: ${metrics.total_trades}`);
  console.log(`   Win Rate: ${metrics.win_rate.toFixed(2)}%`);
  console.log(`   Total Realized PnL: $${metrics.total_realized_pnl.toLocaleString()}`);
  console.log(`   Avg Realized ROI: ${metrics.avg_realized_roi.toFixed(2)}%`);
  console.log(`   Median Realized ROI: ${metrics.median_realized_roi.toFixed(2)}%`);
  console.log(`   Avg Holding Hours: ${metrics.avg_holding_hours.toFixed(2)}`);
  console.log(`   Entry Skill Score: ${metrics.entry_skill_score.toFixed(2)}/10`);
  console.log(`   Exit Skill Score: ${metrics.exit_skill_score.toFixed(2)}/10`);
  console.log(`   Overall Skill Score: ${metrics.overall_skill_score.toFixed(2)}/10`);
  console.log('');
  
  return metrics;
}

function testMarketCapDistribution(enrichedTrades) {
  console.log('📊 Step 7: Testing Market Cap Distribution...');
  
  const distribution = calculateMcapDistribution(enrichedTrades);
  
  console.log('✅ Market cap distribution:');
  Object.entries(distribution).forEach(([bracket, stats]) => {
    if (stats.count > 0) {
      const bracketNames = {
        1: '<$100K',
        2: '$100K-$1M',
        3: '$1M-$10M',
        4: '$10M-$100M',
        5: '>$100M'
      };
      console.log(`   Bracket ${bracket} (${bracketNames[bracket]}):`);
      console.log(`      - Trades: ${stats.count}`);
      console.log(`      - Wins: ${stats.wins}, Losses: ${stats.losses}`);
      console.log(`      - Win Rate: ${stats.winRate.toFixed(2)}%`);
      console.log(`      - Avg ROI: ${stats.avgRoi.toFixed(2)}%`);
      console.log(`      - Total PnL: $${stats.totalPnl.toLocaleString()}`);
    }
  });
  console.log('');
  
  return distribution;
}

function testDiversityMetrics(enrichedTrades) {
  console.log('🎯 Step 8: Testing Diversity Metrics...');
  
  const diversity = calculateDiversityMetrics(enrichedTrades);
  const temporal = calculateTemporalDiversity(enrichedTrades);
  
  console.log('✅ Diversity metrics:');
  console.log(`   Total Unique Tokens: ${diversity.total_unique_tokens}`);
  console.log(`   Token Concentration Index: ${diversity.token_concentration_index}`);
  console.log(`   Concentration Rating: ${diversity.concentration_rating}`);
  console.log(`   Top Token PnL %: ${diversity.top_token_pnl_percent.toFixed(2)}%`);
  console.log(`   Top 3 Tokens PnL %: ${diversity.top_3_tokens_pnl_percent.toFixed(2)}%`);
  console.log(`   Top 5 Tokens PnL %: ${diversity.top_5_tokens_pnl_percent.toFixed(2)}%`);
  console.log(`   Avg Trades/Token: ${diversity.avg_trades_per_token.toFixed(2)}`);
  console.log('');
  
  console.log('✅ Temporal diversity:');
  console.log(`   Trading Days: ${temporal.trading_days}`);
  console.log(`   Avg Tokens/Day: ${temporal.avg_tokens_per_day.toFixed(2)}`);
  console.log(`   Avg Tokens/Week: ${temporal.avg_tokens_per_week.toFixed(2)}`);
  console.log(`   Avg Tokens/Month: ${temporal.avg_tokens_per_month.toFixed(2)}`);
  console.log('');
  
  if (diversity.most_traded_tokens && diversity.most_traded_tokens.length > 0) {
    console.log('   Most Traded Tokens:');
    diversity.most_traded_tokens.slice(0, 5).forEach((token, i) => {
      console.log(`      ${i + 1}. ${token.symbol} (${token.address.slice(0, 8)}...):`);
      console.log(`         - Trades: ${token.trade_count}`);
      console.log(`         - PnL: $${token.total_pnl.toLocaleString()}`);
      console.log(`         - Avg ROI: ${token.avg_roi.toFixed(2)}%`);
      console.log(`         - Win Rate: ${token.win_rate.toFixed(2)}%`);
    });
  }
  console.log('');
  
  return { diversity, temporal };
}

async function runTest() {
  try {
    const startTime = Date.now();
    
    // Step 1: Fetch from OKX
    const tokenList = await fetchOKXTokenList(TEST_WALLET, CHAIN_ID);
    
    // Step 2: Map to trades
    const { trades, closedTrades, openTrades } = mapTokensToTrades(tokenList);
    
    if (closedTrades.length === 0) {
      console.log('⚠️  No closed trades found. Cannot test enrichment.');
      return;
    }
    
    // Step 3: Market cap enrichment (test with 5 trades)
    let enrichedTrades = await testMarketCapEnrichment(closedTrades);
    
    // Step 4: OHLC enrichment (uses the 5 enriched trades)
    enrichedTrades = await testOHLCEnrichment(enrichedTrades);
    
    // Step 5: Risk enrichment
    enrichedTrades = await testRiskEnrichment(enrichedTrades);
    
    // Step 6: Compute metrics
    const metrics = testMetricsComputation(enrichedTrades);
    
    // Step 7: Market cap distribution
    const distribution = testMarketCapDistribution(enrichedTrades);
    
    // Step 8: Diversity metrics
    const { diversity, temporal } = testDiversityMetrics(enrichedTrades);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('=' .repeat(80));
    console.log('✅ TEST PASSED!');
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('=' .repeat(80));
    console.log('');
    console.log('📦 Final Response Structure:');
    console.log(JSON.stringify({
      wallet_address: TEST_WALLET,
      chain: CHAIN,
      metrics: {
        ...metrics,
        market_cap_distribution: distribution,
        diversity,
        temporal_diversity: temporal
      },
      all_trades_count: closedTrades.length,
      enriched_trades_count: enrichedTrades.length,
      enriched: true,
      risk_checked: true
    }, null, 2));
    
  } catch (error) {
    console.error('');
    console.error('=' .repeat(80));
    console.error('❌ TEST FAILED!');
    console.error('=' .repeat(80));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();
