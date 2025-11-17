/**
 * Test Script 02: Data Fetchers
 * 
 * Purpose: Test complete data fetching with pagination, caching, and all 8 OKX endpoints
 * 
 * Usage: node test-scripts/02-test-data-fetchers.js
 */

import axios from 'axios';
import NodeCache from 'node-cache';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test wallet
const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const CHAIN_ID = '501';

// Cache with 5min TTL
const cache = new NodeCache({ stdTTL: 300 });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.okx.com/',
  'Origin': 'https://www.okx.com'
};

/**
 * Generic OKX API fetcher with caching and error handling
 */
async function fetchOKX(url, params, cacheKey = null) {
  // Check cache first
  if (cacheKey && cache.has(cacheKey)) {
    console.log(`[CACHE HIT] ${cacheKey}`);
    return cache.get(cacheKey);
  }
  
  try {
    const response = await axios.get(url, {
      params,
      headers: HEADERS,
      timeout: 30000
    });
    
    if (response.data?.code !== 0 && response.data?.code !== '0') {
      console.error(`[API ERROR] Code: ${response.data?.code}, Message: ${response.data?.msg || 'Unknown'}`);
      console.error(`[API ERROR] Full response:`, JSON.stringify(response.data, null, 2));
      throw new Error(response.data?.msg || 'API Error');
    }
    
    const data = response.data.data;
    
    // Cache the result
    if (cacheKey) {
      cache.set(cacheKey, data);
      console.log(`[CACHED] ${cacheKey}`);
    }
    
    return data;
  } catch (error) {
    console.error(`[FETCH ERROR] ${url}:`, error.message);
    if (error.response?.status === 429) {
      console.error('[RATE LIMIT] Waiting 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
    }
    throw error;
  }
}

/**
 * 1. Fetch Wallet Profile Summary (7-day metrics)
 */
export async function fetchWalletProfileSummary(walletAddress, chainId, periodType = '3') {
  console.log(`\n📊 Fetching Wallet Profile Summary...`);
  
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary',
    {
      walletAddress,
      chainId,
      periodType,
      t: Date.now()
    },
    `profile_summary_${walletAddress}_${chainId}_${periodType}`
  );
  
  console.log(`✅ Total PnL: $${data.totalPnl}`);
  console.log(`   Win Rate: ${data.totalWinRate}%`);
  console.log(`   Buys: ${data.totalTxsBuy}, Sells: ${data.totalTxsSell}`);
  
  return data;
}

/**
 * 2. Fetch Wallet Address Info (tags, labels)
 */
export async function fetchWalletAddressInfo(walletAddress, chainId) {
  console.log(`\n🏷️  Fetching Wallet Address Info...`);
  
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/query/address/info',
    {
      walletAddress,
      chainId,
      t: Date.now()
    },
    `address_info_${walletAddress}_${chainId}`
  );
  
  console.log(`✅ Tags: ${data.t?.length || 0} found`);
  
  return data;
}

/**
 * 3. Fetch Token List with pagination (held or all)
 */
export async function fetchTokenList(walletAddress, chainId, filterEmptyBalance = false) {
  console.log(`\n💰 Fetching Token List (filterEmpty=${filterEmptyBalance})...`);
  
  let allTokens = [];
  let offset = 0;
  let hasNext = true;
  let page = 1;
  
  while (hasNext) {
    const data = await fetchOKX(
      'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list',
      {
        walletAddress,
        chainId,
        filterEmptyBalance: filterEmptyBalance.toString(),
        sortType: '1',
        isAsc: 'false',
        offset: offset.toString(),
        limit: '50',
        t: Date.now()
      }
    );
    
    allTokens = allTokens.concat(data.tokenList || []);
    hasNext = data.hasNext;
    offset = data.offset || (offset + 50);
    
    console.log(`   Page ${page}: ${data.tokenList?.length || 0} tokens (total: ${allTokens.length})`);
    
    if (hasNext) {
      await new Promise(r => setTimeout(r, 200)); // Rate limit delay
      page++;
    }
  }
  
  console.log(`✅ Total tokens: ${allTokens.length}`);
  
  return allTokens;
}

/**
 * 4. Fetch Trade History with pagination (7-day window)
 */
export async function fetchTradeHistory(walletAddress, chainId) {
  console.log(`\n📜 Fetching Trade History (7-day window)...`);
  
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  console.log(`   7-day cutoff: ${new Date(sevenDaysAgo).toISOString()}`);
  
  let allTrades = [];
  let page = 1;
  let hasNext = true;
  let reachedOldTrades = false;
  
  while (hasNext && !reachedOldTrades) {
    const data = await fetchOKX(
      'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history',
      {
        walletAddress,
        chainId,
        pageSize: '100', // Fetch 100 trades per page
        tradeType: '1,2', // 1=Buy, 2=Sell (exclude transfers)
        t: Date.now()
      }
    );
    
    const trades = data.rows || [];
    
    if (trades.length === 0) {
      console.log(`   Page ${page}: No more trades`);
      break;
    }
    
    // Get oldest trade in this batch
    const oldestInBatch = Math.min(...trades.map(t => t.blockTime));
    const oldestDate = new Date(oldestInBatch).toISOString();
    
    // Filter to 7-day window
    const recentTrades = trades.filter(t => t.blockTime >= sevenDaysAgo);
    allTrades = allTrades.concat(recentTrades);
    
    // Check if we've reached trades older than 7 days
    if (oldestInBatch < sevenDaysAgo) {
      reachedOldTrades = true;
      console.log(`   Page ${page}: ${trades.length} trades, ${recentTrades.length} in 7d window (total: ${allTrades.length})`);
      console.log(`   ⏹️  STOPPED: Oldest trade (${oldestDate}) is outside 7-day window`);
      break;
    }
    
    console.log(`   Page ${page}: ${trades.length} trades, ${recentTrades.length} in 7d window (total: ${allTrades.length}) - oldest: ${oldestDate}`);
    
    hasNext = data.hasNext;
    
    if (hasNext && !reachedOldTrades) {
      await new Promise(r => setTimeout(r, 200));
      page++;
    }
  }
  
  console.log(`✅ Total 7-day trades: ${allTrades.length}`);
  console.log(`   Buys: ${allTrades.filter(t => t.type === 1).length}`);
  console.log(`   Sells: ${allTrades.filter(t => t.type === 2).length}`);
  
  return allTrades;
}

/**
 * 5. Fetch Token Info (metadata, liquidity, supply)
 */
export async function fetchTokenInfo(tokenAddress, chainId) {
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v1/dx/market/v2/latest/info',
    {
      chainId,
      tokenContractAddress: tokenAddress,
      t: Date.now()
    },
    `token_info_${tokenAddress}_${chainId}`
  );
  
  return data;
}

/**
 * 6. Fetch Token OHLC Candles (1h bars)
 */
export async function fetchTokenOHLC(tokenAddress, chainId, after = null) {
  const params = {
    chainId,
    address: tokenAddress,
    bar: '1H',
    limit: '1000',
    t: Date.now()
  };
  
  if (after) {
    params.after = after.toString();
  }
  
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v5/dex/token/market/dex-token-hlc-candles',
    params,
    after ? null : `ohlc_${tokenAddress}_${chainId}` // Only cache if no 'after'
  );
  
  // Parse OHLC data
  const candles = (data || []).map(c => ({
    timestamp: parseInt(c[0]),
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
    isClosed: c[6] === '1'
  }));
  
  return candles;
}

/**
 * 7. Fetch Token Overview (liquidity monitoring, rug detection)
 */
export async function fetchTokenOverview(tokenAddress, chainId) {
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v1/dx/market/v2/token/overview',
    {
      chainId,
      tokenContractAddress: tokenAddress,
      t: Date.now()
    },
    `token_overview_${tokenAddress}_${chainId}`
  );
  
  return data;
}

/**
 * Main test
 */
async function runTests() {
  console.log('\n🚀 Testing OKX Data Fetchers');
  console.log(`Wallet: ${TEST_WALLET}`);
  console.log(`Chain: Solana (${CHAIN_ID})`);
  console.log('='.repeat(80));
  
  try {
    // Phase 1: Core wallet data
    const profileSummary = await fetchWalletProfileSummary(TEST_WALLET, CHAIN_ID);
    const addressInfo = await fetchWalletAddressInfo(TEST_WALLET, CHAIN_ID);
    const heldTokens = await fetchTokenList(TEST_WALLET, CHAIN_ID, true);
    const allTokens = await fetchTokenList(TEST_WALLET, CHAIN_ID, false);
    const tradeHistory = await fetchTradeHistory(TEST_WALLET, CHAIN_ID);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 CORE DATA SUMMARY');
    console.log('='.repeat(80));
    console.log(`Held Tokens: ${heldTokens.length}`);
    console.log(`All Tokens: ${allTokens.length}`);
    console.log(`7-Day Trades: ${tradeHistory.length}`);
    console.log(`Unique Tokens Traded: ${new Set(tradeHistory.map(t => t.tokenContractAddress)).size}`);
    
    // Phase 2: Test enrichment on first token
    if (tradeHistory.length > 0) {
      const firstTrade = tradeHistory[0];
      console.log('\n' + '='.repeat(80));
      console.log('🔬 TESTING ENRICHMENT ENDPOINTS');
      console.log('='.repeat(80));
      console.log(`Sample Token: ${firstTrade.tokenSymbol} (${firstTrade.tokenContractAddress})`);
      
      console.log(`\n📊 Fetching Token Info...`);
      const tokenInfo = await fetchTokenInfo(firstTrade.tokenContractAddress, CHAIN_ID);
      console.log(`✅ Price: $${tokenInfo.price}`);
      console.log(`   Market Cap: $${tokenInfo.marketCap}`);
      console.log(`   Liquidity: $${tokenInfo.liquidity}`);
      console.log(`   Holders: ${tokenInfo.holders}`);
      
      await new Promise(r => setTimeout(r, 1000));
      
      console.log(`\n📈 Fetching OHLC Candles...`);
      const candles = await fetchTokenOHLC(firstTrade.tokenContractAddress, CHAIN_ID);
      console.log(`✅ Candles: ${candles.length} bars`);
      if (candles.length > 0) {
        console.log(`   Oldest: ${new Date(candles[candles.length - 1].timestamp).toISOString()}`);
        console.log(`   Newest: ${new Date(candles[0].timestamp).toISOString()}`);
        console.log(`   Latest Price: $${candles[0].close}`);
      }
      
      await new Promise(r => setTimeout(r, 1000));
      
      console.log(`\n🔍 Fetching Token Overview...`);
      const overview = await fetchTokenOverview(firstTrade.tokenContractAddress, CHAIN_ID);
      console.log(`✅ Total Liquidity: $${overview.marketInfo?.totalLiquidity || 'N/A'}`);
      console.log(`   Dev Holdings: ${overview.devHoldingRatio || 0}%`);
      console.log(`   Risk Level: ${overview.marketInfo?.riskLevel || 'N/A'}`);
      console.log(`   Tags: ${overview.tagList?.map(t => t[0]).join(', ') || 'None'}`);
      
      // Check for rug indicators
      const isLowLiquidity = overview.tagList?.some(t => t[0] === 'lowLiquidity');
      const devRugCount = overview.basicInfo?.devRugPullTokenCount || 0;
      console.log(`\n🚨 Rug Detection:`);
      console.log(`   Low Liquidity: ${isLowLiquidity ? 'YES' : 'NO'}`);
      console.log(`   Dev Rug History: ${devRugCount > 0 ? `YES (${devRugCount} rugs)` : 'NO'}`);
    }
    
    // Save summary
    const summary = {
      wallet: TEST_WALLET,
      chain: CHAIN_ID,
      timestamp: new Date().toISOString(),
      core_data: {
        profile_summary: {
          total_pnl: profileSummary.totalPnl,
          win_rate: profileSummary.totalWinRate,
          total_buys: profileSummary.totalTxsBuy,
          total_sells: profileSummary.totalTxsSell
        },
        held_tokens_count: heldTokens.length,
        all_tokens_count: allTokens.length,
        trade_history_count: tradeHistory.length,
        unique_tokens_traded: new Set(tradeHistory.map(t => t.tokenContractAddress)).size
      },
      enrichment_tested: tradeHistory.length > 0
    };
    
    await fs.writeFile(
      path.join(__dirname, '..', 'schemas', 'test_02_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log(`\n📁 Summary saved to: backend/schemas/test_02_summary.json`);
    console.log(`\nNext: Run test-scripts/03-test-fifo-algorithm.js`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
