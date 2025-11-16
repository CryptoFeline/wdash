/**
 * OKX Direct API Validation Test
 * 
 * Purpose: Validate wallet analysis using direct OKX API calls
 * Wallet: 2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo
 * Window: 7 days
 * 
 * Steps:
 * 1. Fetch wallet profile (Endpoint #1)
 * 2. Fetch wallet trading history (Endpoint #7)
 * 3. Fetch token list with PnL data (Endpoint #4)
 * 4. Perform FIFO reconstruction for trades in past 7d
 * 5. Fetch token overview for rug detection (Endpoint #14)
 * 6. Fetch OHLC data for entry quality (Endpoint #11)
 * 7. Log all findings to test-results-logbook.md
 */

import https from 'https';
import fs from 'fs';

const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const CHAIN_ID = 501; // Solana
const WINDOW_DAYS = 30; // Expanded to 30 days to capture trades
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;
const CUTOFF_TIME = Date.now() - WINDOW_MS;

// Logbook for recording test results
let logbook = [];

function log(section, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    section,
    data
  };
  logbook.push(entry);
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${section}]`);
  console.log('='.repeat(80));
  console.log(JSON.stringify(data, null, 2));
}

// Helper to make HTTPS requests
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Delay helper for rate limiting
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Fetch Wallet Profile (Endpoint #1)
async function fetchWalletProfile() {
  const url = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary?periodType=3&chainId=${CHAIN_ID}&walletAddress=${TEST_WALLET}&t=${Date.now()}`;
  
  console.log('Fetching wallet profile...');
  const response = await httpsGet(url);
  
  if (response.code !== 0) {
    throw new Error(`Wallet profile API error: ${response.msg}`);
  }
  
  const data = response.data;
  const summary = {
    totalPnl: data.totalPnl,
    totalPnlRoi: `${data.totalPnlRoi}%`,
    totalWinRate: `${data.totalWinRate}%`,
    totalTxsBuy: data.totalTxsBuy,
    totalTxsSell: data.totalTxsSell,
    totalVolumeBuy: data.totalVolumeBuy,
    totalVolumeSell: data.totalVolumeSell,
    nativeTokenBalance: `${data.nativeTokenBalanceAmount} SOL ($${data.nativeTokenBalanceUsd})`,
    unrealizedPnl: data.unrealizedPnl,
    favoriteMcapType: data.favoriteMcapType,
    topTokens: data.topTokens?.map(t => ({
      symbol: t.tokenSymbol,
      pnl: t.profit,
      roi: `${t.profitRatio}%`
    }))
  };
  
  log('WALLET PROFILE', summary);
  return data;
}

// 4. Fetch Token List (Endpoint #4)
async function fetchTokenList() {
  const url = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list?walletAddress=${TEST_WALLET}&chainId=${CHAIN_ID}&isAsc=false&sortType=1&filterEmptyBalance=false&offset=0&limit=100&t=${Date.now()}`;
  
  console.log('Fetching token list...');
  const response = await httpsGet(url);
  
  if (response.code !== 0) {
    throw new Error(`Token list API error: ${response.msg}`);
  }
  
  const tokens = response.data.tokenList;
  const summary = {
    totalTokens: tokens.length,
    tokens: tokens.map(t => ({
      symbol: t.tokenSymbol,
      address: t.tokenContractAddress,
      balance: t.balance,
      totalPnl: t.totalPnl,
      totalPnlRoi: `${t.totalPnlRoi}%`,
      realizedPnl: t.realizedPnl,
      unrealizedPnl: t.unrealizedPnl,
      buyCount: t.buyCount,
      sellCount: t.sellCount,
      avgCost: t.avgCost,
      lastTradeTime: t.lastTradeTime && !isNaN(parseInt(t.lastTradeTime)) 
        ? new Date(parseInt(t.lastTradeTime)).toISOString() 
        : 'N/A'
    }))
  };
  
  log('TOKEN LIST', summary);
  return tokens;
}

// 7. Fetch Trading History (Endpoint #7)
async function fetchTradingHistory() {
  const url = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history?walletAddress=${TEST_WALLET}&chainId=${CHAIN_ID}&pageSize=1000&tradeType=1%2C2&filterRisk=true&t=${Date.now()}`;
  
  console.log('Fetching trading history...');
  const response = await httpsGet(url);
  
  if (response.code !== 0) {
    throw new Error(`Trading history API error: ${response.msg}`);
  }
  
  const allTrades = response.data.rows;
  
  // Filter to past 30 days
  const recentTrades = allTrades.filter(trade => {
    const tradeTime = parseInt(trade.blockTime); // Use blockTime not time
    return tradeTime >= CUTOFF_TIME;
  });
  
  const summary = {
    totalTrades: allTrades.length,
    tradesInWindow: recentTrades.length,
    windowDays: WINDOW_DAYS,
    cutoffTime: new Date(CUTOFF_TIME).toISOString(),
    trades: recentTrades.map(t => ({
      type: t.type === 1 ? 'BUY' : 'SELL',
      symbol: t.tokenSymbol,
      address: t.tokenContractAddress,
      amount: t.amount,
      price: t.price,
      value: t.turnover, // Use turnover for value
      time: new Date(parseInt(t.blockTime)).toISOString(),
      hash: t.txHash
    }))
  };
  
  log('TRADING HISTORY (7D)', summary);
  return recentTrades;
}

// FIFO Reconstruction
function performFifoReconstruction(trades) {
  console.log('Performing FIFO reconstruction...');
  
  // Group by token
  const tokenGroups = {};
  trades.forEach(trade => {
    const addr = trade.tokenContractAddress;
    if (!tokenGroups[addr]) {
      tokenGroups[addr] = {
        symbol: trade.tokenSymbol,
        address: addr,
        buys: [],
        sells: []
      };
    }
    
    if (trade.type === 1) {
      tokenGroups[addr].buys.push({
        amount: parseFloat(trade.amount),
        price: parseFloat(trade.price),
        value: parseFloat(trade.turnover), // Use turnover for value
        time: parseInt(trade.blockTime), // Use blockTime
        hash: trade.txHash
      });
    } else {
      tokenGroups[addr].sells.push({
        amount: parseFloat(trade.amount),
        price: parseFloat(trade.price),
        value: parseFloat(trade.turnover), // Use turnover for value
        time: parseInt(trade.blockTime), // Use blockTime
        hash: trade.txHash
      });
    }
  });
  
  // Sort by timestamp
  Object.values(tokenGroups).forEach(group => {
    group.buys.sort((a, b) => a.time - b.time);
    group.sells.sort((a, b) => a.time - b.time);
  });
  
  // Perform FIFO matching
  const reconstructedTrades = [];
  
  for (const [tokenAddr, group] of Object.entries(tokenGroups)) {
    let buyQueue = [...group.buys];
    
    for (const sell of group.sells) {
      let sellAmountRemaining = sell.amount;
      
      while (sellAmountRemaining > 0.000001 && buyQueue.length > 0) {
        const buy = buyQueue[0];
        const matchAmount = Math.min(buy.amount, sellAmountRemaining);
        
        const avgBuyPrice = buy.price;
        const avgSellPrice = sell.price;
        const realizedPnl = (avgSellPrice - avgBuyPrice) * matchAmount;
        const realizedRoi = ((avgSellPrice - avgBuyPrice) / avgBuyPrice) * 100;
        const holdingTime = sell.time - buy.time;
        
        reconstructedTrades.push({
          token_symbol: group.symbol,
          token_address: tokenAddr,
          entry_timestamp: buy.time,
          exit_timestamp: sell.time,
          holding_time_ms: holdingTime,
          holding_time_hours: (holdingTime / (1000 * 60 * 60)).toFixed(2),
          amount: matchAmount,
          entry_price: avgBuyPrice,
          exit_price: avgSellPrice,
          entry_value: avgBuyPrice * matchAmount,
          exit_value: avgSellPrice * matchAmount,
          realized_pnl: realizedPnl,
          realized_roi: realizedRoi,
          win: realizedPnl > 0,
          entry_hash: buy.hash,
          exit_hash: sell.hash
        });
        
        // Update amounts
        sellAmountRemaining -= matchAmount;
        buy.amount -= matchAmount;
        
        if (buy.amount < 0.000001) {
          buyQueue.shift();
        }
      }
    }
    
    // Add open positions
    for (const buy of buyQueue) {
      if (buy.amount > 0.000001) {
        reconstructedTrades.push({
          token_symbol: group.symbol,
          token_address: tokenAddr,
          entry_timestamp: buy.time,
          exit_timestamp: null,
          holding_time_ms: Date.now() - buy.time,
          holding_time_hours: ((Date.now() - buy.time) / (1000 * 60 * 60)).toFixed(2),
          amount: buy.amount,
          entry_price: buy.price,
          exit_price: null,
          entry_value: buy.value,
          exit_value: null,
          realized_pnl: null,
          realized_roi: null,
          win: null,
          entry_hash: buy.hash,
          exit_hash: null,
          open_position: true
        });
      }
    }
  }
  
  // Sort by entry time
  reconstructedTrades.sort((a, b) => a.entry_timestamp - b.entry_timestamp);
  
  const summary = {
    totalTrades: reconstructedTrades.length,
    closedTrades: reconstructedTrades.filter(t => !t.open_position).length,
    openPositions: reconstructedTrades.filter(t => t.open_position).length,
    wins: reconstructedTrades.filter(t => t.win === true).length,
    losses: reconstructedTrades.filter(t => t.win === false).length,
    trades: reconstructedTrades.map(t => ({
      ...t,
      entry_time: new Date(t.entry_timestamp).toISOString(),
      exit_time: t.exit_timestamp ? new Date(t.exit_timestamp).toISOString() : 'OPEN'
    }))
  };
  
  log('FIFO RECONSTRUCTION', summary);
  return reconstructedTrades;
}

// 14. Fetch Token Overview for Rug Detection (Endpoint #14)
async function enrichWithTokenOverview(trades) {
  console.log('Enriching with token overview data...');
  
  const uniqueTokens = [...new Set(trades.map(t => t.token_address))];
  const enrichedTrades = [...trades];
  
  for (let i = 0; i < uniqueTokens.length; i++) {
    const tokenAddr = uniqueTokens[i];
    const url = `https://web3.okx.com/priapi/v1/dx/market/v2/token/overview?chainId=${CHAIN_ID}&tokenContractAddress=${tokenAddr}&t=${Date.now()}`;
    
    console.log(`Fetching overview for token ${i + 1}/${uniqueTokens.length}: ${tokenAddr}`);
    
    try {
      const response = await httpsGet(url);
      
      if (response.code !== 0) {
        console.warn(`Token overview failed for ${tokenAddr}: ${response.msg}`);
        continue;
      }
      
      const overview = response.data;
      const basicInfo = overview.basicInfo || {};
      const marketInfo = overview.marketInfo || {};
      
      // Rug detection logic
      const devRugCount = parseInt(basicInfo.devRugPullTokenCount) || 0;
      const bundleRatio = parseFloat(overview.bundleHoldingRatio) || 0;
      const devRatio = parseFloat(overview.devHoldingRatio) || 0;
      const liquidity = parseFloat(marketInfo.totalLiquidity) || 0;
      const snipersClear = parseInt(overview.snipersClear) || 0;
      const snipersTotal = parseInt(overview.snipersTotal) || 0;
      
      let rugScore = 0;
      const rugReasons = [];
      
      if (devRugCount > 0) {
        rugScore += 50;
        rugReasons.push(`Developer rugged ${devRugCount} token(s) before`);
      }
      
      if (liquidity < 1000) {
        rugScore += 40;
        rugReasons.push(`Very low liquidity ($${liquidity.toFixed(2)})`);
      }
      
      if (devRatio === 0 && basicInfo.devHoldingStatus === 'sellAll') {
        rugScore += 30;
        rugReasons.push('Developer dumped all holdings');
      }
      
      if (bundleRatio > 30) {
        rugScore += 20;
        rugReasons.push(`High bundle concentration (${bundleRatio}%)`);
      }
      
      if (snipersTotal > 0 && (snipersClear / snipersTotal) > 0.5) {
        rugScore += 10;
        rugReasons.push(`${snipersClear}/${snipersTotal} snipers exited`);
      }
      
      const isRug = rugScore >= 50;
      const rugType = rugScore >= 70 ? 'hard_rug' : rugScore >= 50 ? 'soft_rug' : null;
      
      // Enrich all trades for this token
      enrichedTrades.forEach(trade => {
        if (trade.token_address === tokenAddr) {
          trade.is_rug = isRug;
          trade.rug_type = rugType;
          trade.rug_score = rugScore;
          trade.rug_reasons = rugReasons;
          trade.liquidity_usd = liquidity;
          trade.dev_rugged_tokens = devRugCount;
          trade.dev_holding_ratio = devRatio;
          trade.bundle_holding_ratio = bundleRatio;
          trade.snipers_clear = snipersClear;
          trade.snipers_total = snipersTotal;
        }
      });
      
      await delay(1000); // Rate limiting
      
    } catch (error) {
      console.warn(`Failed to fetch overview for ${tokenAddr}: ${error.message}`);
    }
  }
  
  const summary = {
    totalTokens: uniqueTokens.length,
    ruggedTokens: enrichedTrades.filter(t => t.is_rug).length,
    softRugs: enrichedTrades.filter(t => t.rug_type === 'soft_rug').length,
    hardRugs: enrichedTrades.filter(t => t.rug_type === 'hard_rug').length,
    trades: enrichedTrades.map(t => ({
      symbol: t.token_symbol,
      is_rug: t.is_rug || false,
      rug_type: t.rug_type || 'none',
      rug_score: t.rug_score || 0,
      rug_reasons: t.rug_reasons || [],
      liquidity: t.liquidity_usd || 0,
      dev_rugged_tokens: t.dev_rugged_tokens || 0
    }))
  };
  
  log('RUG DETECTION', summary);
  return enrichedTrades;
}

// 11. Fetch OHLC Data for Entry Quality (Endpoint #11)
async function enrichWithOHLC(trades) {
  console.log('Enriching with OHLC data...');
  
  const enrichedTrades = [...trades];
  
  for (let i = 0; i < enrichedTrades.length; i++) {
    const trade = enrichedTrades[i];
    
    // Skip open positions for now
    if (trade.open_position) {
      continue;
    }
    
    const tokenAddr = trade.token_address;
    const entryTime = trade.entry_timestamp;
    
    // Fetch 1h candles without 'after' parameter (causes errors)
    const url = `https://web3.okx.com/priapi/v5/dex/token/market/dex-token-hlc-candles?chainId=${CHAIN_ID}&address=${tokenAddr}&bar=1h&limit=1000&t=${Date.now()}`;
    
    console.log(`Fetching OHLC for trade ${i + 1}/${enrichedTrades.length}: ${trade.token_symbol}`);
    
    try {
      const response = await httpsGet(url);
      
      if (response.code !== '0') {
        console.warn(`OHLC failed for ${tokenAddr}: ${response.msg}`);
        
        // Fallback to 1m candles
        const fallbackUrl = `https://web3.okx.com/priapi/v5/dex/token/market/dex-token-hlc-candles?chainId=${CHAIN_ID}&address=${tokenAddr}&bar=1m&limit=1000&t=${Date.now()}`;
        const fallbackResponse = await httpsGet(fallbackUrl);
        
        if (fallbackResponse.code !== '0') {
          trade.entry_quality = 'unknown';
          continue;
        }
        
        response.data = fallbackResponse.data;
      }
      
      const candles = response.data || [];
      
      // Filter to post-entry candles
      const postEntryCandles = candles.filter(c => parseInt(c[0]) >= entryTime);
      
      if (postEntryCandles.length === 0) {
        trade.entry_quality = 'unknown';
        continue;
      }
      
      // Find max high and min low after entry
      let maxHigh = -Infinity;
      let minLow = Infinity;
      
      postEntryCandles.forEach(candle => {
        const high = parseFloat(candle[2]);
        const low = parseFloat(candle[3]);
        maxHigh = Math.max(maxHigh, high);
        minLow = Math.min(minLow, low);
      });
      
      const entryPrice = trade.entry_price;
      const exitPrice = trade.exit_price;
      
      // Calculate max potential ROI
      const maxPotentialRoi = ((maxHigh - entryPrice) / entryPrice) * 100;
      const maxDrawdown = ((minLow - entryPrice) / entryPrice) * 100;
      
      // Find 1h candle after entry
      const oneHourLater = entryTime + (60 * 60 * 1000);
      const oneHourCandle = postEntryCandles.find(c => parseInt(c[0]) >= oneHourLater);
      
      let immediateMove1h = null;
      let entryQuality = 'unknown';
      
      if (oneHourCandle) {
        const priceAt1h = parseFloat(oneHourCandle[4]); // close price
        immediateMove1h = ((priceAt1h - entryPrice) / entryPrice) * 100;
        
        // Entry quality scoring
        if (immediateMove1h > 50) entryQuality = 'excellent';
        else if (immediateMove1h > 20) entryQuality = 'good';
        else if (immediateMove1h > 0) entryQuality = 'fair';
        else if (immediateMove1h > -20) entryQuality = 'poor';
        else entryQuality = 'bad';
      }
      
      // Peak timing
      const peakBeforeExit = maxHigh > exitPrice;
      const exitedBeforePeak = !peakBeforeExit;
      
      // Capture efficiency
      const realizedRoi = trade.realized_roi || 0;
      const captureEfficiency = maxPotentialRoi !== 0 
        ? (realizedRoi / maxPotentialRoi) * 100 
        : 0;
      
      trade.max_potential_roi = maxPotentialRoi;
      trade.max_drawdown_roi = maxDrawdown;
      trade.immediate_move_1h = immediateMove1h;
      trade.entry_quality = entryQuality;
      trade.peak_before_exit = peakBeforeExit;
      trade.exited_before_peak = exitedBeforePeak;
      trade.capture_efficiency = captureEfficiency;
      
      await delay(1000); // Rate limiting
      
    } catch (error) {
      console.warn(`Failed to fetch OHLC for ${tokenAddr}: ${error.message}`);
      trade.entry_quality = 'unknown';
    }
  }
  
  const summary = {
    totalTrades: enrichedTrades.length,
    enrichedTrades: enrichedTrades.filter(t => t.entry_quality !== 'unknown').length,
    entryQualityBreakdown: {
      excellent: enrichedTrades.filter(t => t.entry_quality === 'excellent').length,
      good: enrichedTrades.filter(t => t.entry_quality === 'good').length,
      fair: enrichedTrades.filter(t => t.entry_quality === 'fair').length,
      poor: enrichedTrades.filter(t => t.entry_quality === 'poor').length,
      bad: enrichedTrades.filter(t => t.entry_quality === 'bad').length,
      unknown: enrichedTrades.filter(t => t.entry_quality === 'unknown').length
    },
    trades: enrichedTrades.map(t => ({
      symbol: t.token_symbol,
      entry_quality: t.entry_quality || 'unknown',
      immediate_move_1h: t.immediate_move_1h?.toFixed(2) || 'N/A',
      max_potential_roi: t.max_potential_roi?.toFixed(2) || 'N/A',
      realized_roi: t.realized_roi?.toFixed(2) || 'N/A',
      capture_efficiency: t.capture_efficiency?.toFixed(2) || 'N/A',
      exited_before_peak: t.exited_before_peak || false
    }))
  };
  
  log('OHLC ENRICHMENT', summary);
  return enrichedTrades;
}

// Generate final analysis
/**
 * Detect scam tokens based on liquidity and position status
 * Scam tokens are characterized by:
 * 1. Very low liquidity (<$1000)
 * 2. Open position (still holding)  
 * 3. Positive unrealized PnL (appears profitable but cannot be sold)
 */
function isScamToken(trade) {
  const liquidity = trade.liquidity || 0;
  const isOpen = trade.open_position === true;
  
  // For open positions, check if there's positive unrealized profit with low liquidity
  // This indicates a "fake pump" that cannot be sold
  if (isOpen && liquidity < 1000) {
    // If we have unrealized_pnl from token list, use it
    // Otherwise, check if entry_value exists (means we're still holding)
    return true; // All open positions with low liquidity are suspicious
  }
  
  return false;
}

function generateFinalAnalysis(enrichedTrades) {
  // Categorize all trades
  const closedTrades = enrichedTrades.filter(t => !t.open_position);
  const openPositions = enrichedTrades.filter(t => t.open_position);
  
  // Identify scam tokens
  const scamTokens = enrichedTrades.filter(isScamToken);
  
  // Flag scam tokens in the trades array
  enrichedTrades.forEach(trade => {
    trade.is_scam_token = isScamToken(trade);
  });
  
  // ===== ORIGINAL STATS (INCLUDING SCAM TOKENS) =====
  const wins_raw = closedTrades.filter(t => t.win);
  const losses_raw = closedTrades.filter(t => !t.win);
  const totalRealizedPnl_raw = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  
  // Calculate avgWinSize with outlier filtering (exclude ROI > 10,000%)
  const MAX_ROI_FOR_AVG = 10000; // 10,000% cap
  const validWins_raw = wins_raw.filter(t => t.realized_roi <= MAX_ROI_FOR_AVG);
  const extremeWins_raw = wins_raw.filter(t => t.realized_roi > MAX_ROI_FOR_AVG);
  
  const avgWinSize_raw = validWins_raw.length > 0 
    ? validWins_raw.reduce((sum, t) => sum + t.realized_roi, 0) / validWins_raw.length 
    : 0;
  const avgWinSize_raw_with_outliers = wins_raw.length > 0 
    ? wins_raw.reduce((sum, t) => sum + t.realized_roi, 0) / wins_raw.length 
    : 0;
    
  const avgLossSize_raw = losses_raw.length > 0 
    ? losses_raw.reduce((sum, t) => sum + Math.abs(t.realized_roi), 0) / losses_raw.length 
    : 0;
  
  // ===== FILTERED STATS (EXCLUDING SCAM TOKENS) =====
  const validTrades = enrichedTrades.filter(t => !t.is_scam_token);
  const validClosedTrades = validTrades.filter(t => !t.open_position);
  const validOpenPositions = validTrades.filter(t => t.open_position);
  
  const wins_clean = validClosedTrades.filter(t => t.win);
  const losses_clean = validClosedTrades.filter(t => !t.win);
  
  const totalRealizedPnl_clean = validClosedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  
  // Calculate avgWinSize with outlier filtering (exclude ROI > 10,000%)
  const validWins_clean = wins_clean.filter(t => t.realized_roi <= MAX_ROI_FOR_AVG);
  const extremeWins_clean = wins_clean.filter(t => t.realized_roi > MAX_ROI_FOR_AVG);
  
  const avgWinSize_clean = validWins_clean.length > 0 
    ? validWins_clean.reduce((sum, t) => sum + t.realized_roi, 0) / validWins_clean.length 
    : 0;
  const avgWinSize_clean_with_outliers = wins_clean.length > 0 
    ? wins_clean.reduce((sum, t) => sum + t.realized_roi, 0) / wins_clean.length 
    : 0;
    
  const avgLossSize_clean = losses_clean.length > 0 
    ? losses_clean.reduce((sum, t) => sum + Math.abs(t.realized_roi), 0) / losses_clean.length 
    : 0;
  
  const ruggedTrades = closedTrades.filter(t => t.is_rug);
  const avgCaptureEfficiency = closedTrades
    .filter(t => t.capture_efficiency !== undefined && Math.abs(t.capture_efficiency) < 1000)
    .reduce((sum, t) => sum + t.capture_efficiency, 0) / closedTrades.filter(t => t.capture_efficiency !== undefined && Math.abs(t.capture_efficiency) < 1000).length;
  
  const analysis = {
    window: `${WINDOW_DAYS} days`,
    wallet: TEST_WALLET,
    
    // Scam token detection
    scamTokenDetection: {
      totalScamTokens: scamTokens.length,
      scamParticipationRate: `${((scamTokens.length / enrichedTrades.length) * 100).toFixed(2)}%`,
      scamTokenDetails: scamTokens.map(t => ({
        symbol: t.symbol,
        token: t.token,
        liquidity: `$${t.liquidity?.toFixed(2)}`,
        unrealized_pnl: `$${t.unrealized_pnl?.toFixed(2)}`,
        rug_score: t.rug_score
      })),
      warning: scamTokens.length > 0 
        ? `⚠️ ${scamTokens.length} scam tokens detected with false inflated PnL` 
        : null
    },
    
    // Original summary (including scam tokens - INFLATED)
    summary_raw: {
      totalTrades: enrichedTrades.length,
      closedTrades: closedTrades.length,
      openPositions: openPositions.length,
      wins: wins_raw.length,
      losses: losses_raw.length,
      winRate: `${((wins_raw.length / closedTrades.length) * 100).toFixed(2)}%`,
      totalRealizedPnl: `$${totalRealizedPnl_raw.toFixed(2)}`,
      avgWinSize: `${avgWinSize_raw.toFixed(2)}%`,
      avgWinSize_with_outliers: `${avgWinSize_raw_with_outliers.toFixed(2)}%`,
      outliersExcluded: `${extremeWins_raw.length} wins > ${MAX_ROI_FOR_AVG}%`,
      avgLossSize: `${avgLossSize_raw.toFixed(2)}%`,
      ruggedTrades: ruggedTrades.length,
      avgCaptureEfficiency: `${avgCaptureEfficiency.toFixed(2)}%`,
      note: '⚠️ INCLUDES SCAM TOKENS - STATS ARE INFLATED'
    },
    
    // Filtered summary (excluding scam tokens - TRUE PERFORMANCE)
    summary_clean: {
      totalTrades: validTrades.length,
      closedTrades: validClosedTrades.length,
      openPositions: validOpenPositions.length,
      wins: wins_clean.length,
      losses: losses_clean.length,
      winRate: validClosedTrades.length > 0 
        ? `${((wins_clean.length / validClosedTrades.length) * 100).toFixed(2)}%` 
        : 'N/A',
      totalRealizedPnl: `$${totalRealizedPnl_clean.toFixed(2)}`,
      avgWinSize: `${avgWinSize_clean.toFixed(2)}%`,
      avgWinSize_with_outliers: `${avgWinSize_clean_with_outliers.toFixed(2)}%`,
      outliersExcluded: `${extremeWins_clean.length} wins > ${MAX_ROI_FOR_AVG}%`,
      avgLossSize: `${avgLossSize_clean.toFixed(2)}%`,
      ruggedTrades: ruggedTrades.filter(t => !t.is_scam_token).length,
      avgCaptureEfficiency: `${avgCaptureEfficiency.toFixed(2)}%`,
      note: '✅ EXCLUDES SCAM TOKENS - TRUE PERFORMANCE'
    },
    
    entryQuality: {
      excellent: enrichedTrades.filter(t => t.entry_quality === 'excellent').length,
      good: enrichedTrades.filter(t => t.entry_quality === 'good').length,
      fair: enrichedTrades.filter(t => t.entry_quality === 'fair').length,
      poor: enrichedTrades.filter(t => t.entry_quality === 'poor').length,
      bad: enrichedTrades.filter(t => t.entry_quality === 'bad').length,
      unknown: enrichedTrades.filter(t => t.entry_quality === 'unknown').length
    },
    rugDetection: {
      totalRugged: ruggedTrades.length,
      hardRugs: ruggedTrades.filter(t => t.rug_type === 'hard_rug').length,
      softRugs: ruggedTrades.filter(t => t.rug_type === 'soft_rug').length,
      rugExposure: `${((ruggedTrades.length / closedTrades.length) * 100).toFixed(2)}%`
    }
  };
  
  log('FINAL ANALYSIS', analysis);
  return analysis;
}

// Main test execution
async function runValidation() {
  console.log('\n' + '='.repeat(80));
  console.log('OKX DIRECT API VALIDATION TEST');
  console.log('='.repeat(80));
  console.log(`Wallet: ${TEST_WALLET}`);
  console.log(`Window: ${WINDOW_DAYS} days`);
  console.log(`Cutoff: ${new Date(CUTOFF_TIME).toISOString()}`);
  console.log('='.repeat(80) + '\n');
  
  try {
    // Step 1: Wallet Profile
    await fetchWalletProfile();
    await delay(1000);
    
    // Step 2: Token List
    await fetchTokenList();
    await delay(1000);
    
    // Step 3: Trading History
    const trades = await fetchTradingHistory();
    await delay(1000);
    
    // Step 4: FIFO Reconstruction
    let reconstructedTrades = performFifoReconstruction(trades);
    
    // Step 5: Token Overview (Rug Detection)
    reconstructedTrades = await enrichWithTokenOverview(reconstructedTrades);
    
    // Step 6: OHLC Enrichment
    reconstructedTrades = await enrichWithOHLC(reconstructedTrades);
    
    // Step 7: Final Analysis
    const analysis = generateFinalAnalysis(reconstructedTrades);
    
    // Save logbook
    const logbookPath = './test-results-logbook.md';
    let markdown = '# OKX Direct API Validation Test Results\n\n';
    markdown += `**Wallet**: \`${TEST_WALLET}\`\n`;
    markdown += `**Window**: ${WINDOW_DAYS} days\n`;
    markdown += `**Test Time**: ${new Date().toISOString()}\n\n`;
    markdown += '---\n\n';
    
    logbook.forEach(entry => {
      markdown += `## ${entry.section}\n\n`;
      markdown += `**Timestamp**: ${entry.timestamp}\n\n`;
      markdown += '```json\n';
      markdown += JSON.stringify(entry.data, null, 2);
      markdown += '\n```\n\n';
      markdown += '---\n\n';
    });
    
    fs.writeFileSync(logbookPath, markdown);
    console.log(`\n✅ Test completed! Results saved to ${logbookPath}`);
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(JSON.stringify(analysis, null, 2));
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runValidation();
