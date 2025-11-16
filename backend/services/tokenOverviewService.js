/**
 * Token Overview Service
 * 
 * Fetches comprehensive token analytics from OKX Endpoint #14 (token/overview)
 * for rug detection, liquidity verification, and developer behavior analysis.
 * 
 * Key Features:
 * - Rug detection using developer history (devRugPullTokenCount)
 * - Liquidity drainage detection (totalLiquidity vs marketCap)
 * - Developer dumping analysis (devHoldingStatus)
 * - Bundle wallet concentration (bundleHoldingRatio)
 * - Smart money behavior (smartMoneySellAll)
 */

import axios from 'axios';

/**
 * Fetch token overview from OKX API
 * 
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - Chain ('sol', 'eth', etc.)
 * @returns {Promise<Object>} Token overview data
 */
export async function fetchTokenOverview(tokenAddress, chain = 'sol') {
  try {
    const chainId = getChainId(chain);
    
    const url = 'https://web3.okx.com/priapi/v1/dx/market/v2/token/overview';
    const response = await axios.get(url, {
      params: {
        chainId,
        tokenContractAddress: tokenAddress,
        t: Date.now()
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data?.code !== 0 || !response.data?.data) {
      console.warn(`[TokenOverview] Failed to fetch for ${tokenAddress}: ${response.data?.msg || 'No data'}`);
      return null;
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`[TokenOverview] Error fetching ${tokenAddress}:`, error.message);
    return null;
  }
}

/**
 * Get OKX chain ID from chain name
 */
function getChainId(chain) {
  const chainMap = {
    'sol': '501',
    'eth': '1',
    'bsc': '56',
    'polygon': '137',
    'arbitrum': '42161',
    'optimism': '10',
    'avalanche': '43114',
    'base': '8453'
  };
  
  return chainMap[chain.toLowerCase()] || '501';
}

/**
 * Analyze token for rug indicators
 * 
 * @param {Object} overview - Token overview data from OKX
 * @param {Object} trade - Trade object with PnL data
 * @returns {Object} Rug analysis results
 */
export function analyzeRugIndicators(overview, trade = null) {
  if (!overview) {
    return {
      is_rug: false,
      rug_type: null,
      rug_confidence: 0,
      rug_reasons: []
    };
  }
  
  const reasons = [];
  let rugScore = 0;
  let rugType = null;
  
  // 1. Developer rug pull history (CRITICAL)
  const devRugCount = parseInt(overview.basicInfo?.devRugPullTokenCount || 0);
  if (devRugCount > 0) {
    rugScore += 50;
    reasons.push(`Developer has rugged ${devRugCount} previous token(s)`);
    rugType = 'hard_rug';
  }
  
  // 2. Liquidity analysis (CRITICAL)
  const marketCap = parseFloat(overview.marketInfo?.marketCap || 0);
  const liquidity = parseFloat(overview.marketInfo?.totalLiquidity || 0);
  
  if (marketCap > 10000 && liquidity < 100) {
    rugScore += 40;
    reasons.push(`Liquidity drained: $${liquidity.toFixed(2)} for $${marketCap.toFixed(0)} mcap`);
    rugType = 'hard_rug';
  } else if (marketCap > 1000 && liquidity / marketCap < 0.05) {
    rugScore += 20;
    reasons.push(`Low liquidity ratio: ${((liquidity / marketCap) * 100).toFixed(1)}%`);
    rugType = rugType || 'soft_rug';
  }
  
  // 3. Developer holding status (HIGH)
  const devHoldingStatus = overview.tokenTagVO?.devHoldingStatus?.tagValue;
  const devHoldingRatio = parseFloat(overview.devHoldingRatio || 0);
  
  if (devHoldingStatus === 'sellAll' && devHoldingRatio === 0) {
    rugScore += 30;
    reasons.push('Developer sold all holdings');
    rugType = rugType || 'soft_rug';
  } else if (devHoldingStatus === 'sell' && devHoldingRatio < 1) {
    rugScore += 15;
    reasons.push('Developer dumping tokens');
  }
  
  // 4. Bundle wallet concentration (MEDIUM)
  const bundleHoldingRatio = parseFloat(overview.bundleHoldingRatio || 0);
  if (bundleHoldingRatio > 30) {
    rugScore += 20;
    reasons.push(`High bundle concentration: ${bundleHoldingRatio.toFixed(1)}%`);
    rugType = rugType || 'soft_rug';
  }
  
  // 5. Smart money behavior (MEDIUM)
  const smartMoneyStatus = overview.tokenTagVO?.smartMoneyHoldingStatus?.tagValue;
  if (smartMoneyStatus === 'smartMoneySellAll') {
    rugScore += 15;
    reasons.push('All smart money exited');
  }
  
  // 6. Sniper behavior (LOW)
  const snipersClear = parseInt(overview.marketInfo?.snipersClear || 0);
  const snipersTotal = parseInt(overview.marketInfo?.snipersTotal || 0);
  if (snipersTotal > 0 && snipersClear / snipersTotal > 0.9) {
    rugScore += 10;
    reasons.push(`${snipersClear}/${snipersTotal} snipers exited`);
  }
  
  // 7. Trade PnL analysis (if trade provided)
  if (trade && (trade.realized_roi !== undefined || trade.realized_pnl !== undefined)) {
    const roi = trade.realized_roi !== undefined ? trade.realized_roi : 0;
    
    // ROI is in decimal format: -0.97 = -97%, so compare as decimals
    if (roi < -0.95) {
      rugScore += 35;
      reasons.push(`Catastrophic loss: ${(roi * 100).toFixed(1)}% PnL`);
      rugType = 'hard_rug';
    } else if (roi < -0.50) {
      rugScore += 15;
      reasons.push(`Severe loss: ${(roi * 100).toFixed(1)}% PnL`);
      rugType = rugType || 'soft_rug';
    }
  }
  
  // Calculate final rug status
  const isRug = rugScore >= 50; // Threshold for rug flag
  const confidence = Math.min(rugScore, 100);
  
  return {
    is_rug: isRug,
    rug_type: isRug ? rugType : null,
    rug_confidence: confidence,
    rug_reasons: reasons
  };
}

/**
 * Analyze liquidity status for open positions
 * 
 * @param {Object} overview - Token overview data
 * @returns {Object} Liquidity analysis
 */
export function analyzeLiquidityStatus(overview) {
  if (!overview || !overview.marketInfo) {
    return {
      liquidity_status: 'unknown',
      liquidity_usd: 0,
      market_cap_usd: 0,
      liquidity_ratio: 0,
      can_exit: null
    };
  }
  
  const marketCap = parseFloat(overview.marketInfo.marketCap || 0);
  const liquidity = parseFloat(overview.marketInfo.totalLiquidity || 0);
  const liquidityRatio = marketCap > 0 ? (liquidity / marketCap) : 0;
  
  let status = 'healthy';
  let canExit = true;
  
  if (liquidity < 100) {
    status = 'drained';
    canExit = false;
  } else if (liquidityRatio < 0.05) {
    status = 'low';
    canExit = false;
  } else if (liquidityRatio < 0.15) {
    status = 'warning';
    canExit = true;
  }
  
  return {
    liquidity_status: status,
    liquidity_usd: liquidity,
    market_cap_usd: marketCap,
    liquidity_ratio: liquidityRatio,
    can_exit: canExit
  };
}

/**
 * Enrich a single trade with token overview data
 * 
 * @param {Object} trade - Trade object
 * @param {string} chain - Chain
 * @returns {Promise<Object>} Enriched trade
 */
export async function enrichTradeWithTokenOverview(trade, chain = 'sol') {
  try {
    // Skip if already enriched
    if (trade.is_rug !== undefined) {
      return trade;
    }
    
    const overview = await fetchTokenOverview(trade.token_address, chain);
    
    if (!overview) {
      // CRITICAL: Even if API fails, ensure liquidity field exists (default to 0)
      // This prevents "unknown" values in scam detection
      return {
        ...trade,
        liquidity_status: 'unknown',
        liquidity_usd: 0,
        market_cap_usd: 0,
        liquidity_ratio: 0,
        can_exit: null,
        is_rug: false,
        rug_score: 0,
        rug_reasons: ['API unavailable - cannot verify']
      };
    }
    
    // Analyze rug indicators
    const rugAnalysis = analyzeRugIndicators(overview, trade);
    
    // Analyze liquidity (important for open positions)
    const liquidityAnalysis = analyzeLiquidityStatus(overview);
    
    // Extract developer info
    const devInfo = {
      dev_total_tokens: parseInt(overview.basicInfo?.devCreateTokenCount || 0),
      dev_rugged_tokens: parseInt(overview.basicInfo?.devRugPullTokenCount || 0),
      dev_holding_ratio: parseFloat(overview.devHoldingRatio || 0),
      dev_holding_status: overview.tokenTagVO?.devHoldingStatus?.tagValue || 'unknown'
    };
    
    // Extract bundle info
    const bundleInfo = {
      bundle_holding_ratio: parseFloat(overview.bundleHoldingRatio || 0)
    };
    
    // Extract sniper info
    const sniperInfo = {
      snipers_total: parseInt(overview.marketInfo?.snipersTotal || 0),
      snipers_clear: parseInt(overview.marketInfo?.snipersClear || 0)
    };
    
    return {
      ...trade,
      
      // Rug detection
      ...rugAnalysis,
      
      // Liquidity analysis
      ...liquidityAnalysis,
      
      // Developer info
      ...devInfo,
      
      // Bundle info
      ...bundleInfo,
      
      // Sniper info
      ...sniperInfo,
      
      // Token metadata
      token_name_full: overview.basicInfo?.tokenName || trade.token_name,
      is_meme: overview.basicInfo?.isMeme === '1',
      
      // Social links (for UI display)
      twitter: overview.socialMedia?.twitter || null,
      telegram: overview.socialMedia?.telegram || null,
      website: overview.socialMedia?.officialWebsite || null
    };
  } catch (error) {
    console.error(`[TokenOverview] Error enriching ${trade.token_symbol}:`, error.message);
    // CRITICAL: Even on error, ensure liquidity field exists (default to 0)
    // This prevents "unknown" values in scam detection
    return {
      ...trade,
      liquidity_status: 'unknown',
      liquidity_usd: 0,
      market_cap_usd: 0,
      liquidity_ratio: 0,
      can_exit: null,
      is_rug: false,
      rug_score: 0,
      rug_reasons: ['Enrichment failed - cannot verify']
    };
  }
}

/**
 * Enrich multiple trades with token overview data
 * 
 * @param {Array} trades - Array of trades
 * @param {string} chain - Chain
 * @param {number} batchSize - Batch size (default 3 to avoid rate limits)
 * @returns {Promise<Array>} Enriched trades
 */
export async function enrichTradesWithTokenOverview(trades, chain = 'sol', batchSize = 3) {
  if (!trades || trades.length === 0) {
    return [];
  }
  
  console.log(`[TokenOverview] Enriching ${trades.length} trades with token overview data...`);
  
  const enrichedTrades = [];
  
  // Process in small batches to avoid rate limiting
  for (let i = 0; i < trades.length; i += batchSize) {
    const batch = trades.slice(i, i + batchSize);
    
    const enrichedBatch = await Promise.all(
      batch.map(trade => enrichTradeWithTokenOverview(trade, chain))
    );
    
    enrichedTrades.push(...enrichedBatch);
    
    console.log(`[TokenOverview] Processed ${Math.min(i + batchSize, trades.length)}/${trades.length} trades`);
    
    // Delay between batches (1 second to be safe)
    if (i + batchSize < trades.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const ruggedCount = enrichedTrades.filter(t => t.is_rug).length;
  console.log(`[TokenOverview] Enrichment complete: ${ruggedCount} rugged tokens detected`);
  
  return enrichedTrades;
}

export default {
  fetchTokenOverview,
  analyzeRugIndicators,
  analyzeLiquidityStatus,
  enrichTradeWithTokenOverview,
  enrichTradesWithTokenOverview
};
