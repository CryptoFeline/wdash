/**
 * Market Cap Service
 * 
 * Fetches current market cap data from OKX API and categorizes tokens
 * into market cap brackets for strategy analysis.
 */

import axios from 'axios';

/**
 * Market cap bracket definitions (aligned with OKX favoriteMcapType)
 */
export const MCAP_BRACKETS = {
  1: { min: 0, max: 100000, label: '<$100K', description: 'Micro Cap' },
  2: { min: 100000, max: 1000000, label: '$100K-$1M', description: 'Small Cap' },
  3: { min: 1000000, max: 10000000, label: '$1M-$10M', description: 'Mid Cap' },
  4: { min: 10000000, max: 100000000, label: '$10M-$100M', description: 'Large Cap' },
  5: { min: 100000000, max: Infinity, label: '>$100M', description: 'Mega Cap' }
};

/**
 * Categorize market cap value into bracket (1-5)
 * @param {number} marketCap - Market cap in USD
 * @returns {number} Bracket number (1-5)
 */
export function categorizeMcap(marketCap) {
  if (marketCap < 100000) return 1;
  if (marketCap < 1000000) return 2;
  if (marketCap < 10000000) return 3;
  if (marketCap < 100000000) return 4;
  return 5;
}

/**
 * Fetch token market cap from OKX API
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - 'eth' or 'sol'
 * @returns {Promise<number|null>} Market cap in USD or null if unavailable
 */
export async function fetchTokenMarketCap(tokenAddress, chain = 'eth') {
  try {
    const chainId = chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1';
    
    const url = 'https://web3.okx.com/priapi/v1/dx/market/v2/latest/info';
    const params = {
      chainId,
      tokenContractAddress: tokenAddress,
      t: Date.now()
    };
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.code !== 0 || !response.data?.data) {
      console.warn(`[MarketCap] Failed for ${tokenAddress}: ${response.data?.msg || 'No data'}`);
      return null;
    }
    
    const marketCap = parseFloat(response.data.data.marketCap || 0);
    return marketCap > 0 ? marketCap : null;
  } catch (error) {
    console.error(`[MarketCap] Error for ${tokenAddress}:`, error.message);
    return null;
  }
}

/**
 * Enrich trades with market cap data and brackets
 * @param {Array} trades - Array of trade objects
 * @param {string} chain - 'eth' or 'sol'
 * @param {number} batchSize - Number of concurrent requests (default 5)
 * @returns {Promise<Array>} Trades enriched with mcap_usd and mcap_bracket
 */
export async function enrichTradesWithMarketCap(trades, chain = 'eth', batchSize = 5) {
  if (!trades || trades.length === 0) {
    return [];
  }
  
  console.log(`[MarketCap] Fetching market cap data for ${trades.length} trades...`);
  
  // Get unique token addresses
  const uniqueTokens = [...new Set(trades.map(t => t.token_address))];
  const mcapCache = new Map();
  
  // Fetch market caps in batches
  for (let i = 0; i < uniqueTokens.length; i += batchSize) {
    const batch = uniqueTokens.slice(i, i + batchSize);
    
    const results = await Promise.all(
      batch.map(async (tokenAddress) => {
        const mcap = await fetchTokenMarketCap(tokenAddress, chain);
        return { tokenAddress, mcap };
      })
    );
    
    results.forEach(({ tokenAddress, mcap }) => {
      mcapCache.set(tokenAddress, mcap);
    });
    
    console.log(`[MarketCap] Processed ${Math.min(i + batchSize, uniqueTokens.length)}/${uniqueTokens.length} tokens`);
    
    // Small delay between batches
    if (i + batchSize < uniqueTokens.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Enrich trades with market cap data
  const enrichedTrades = trades.map(trade => {
    const mcap = mcapCache.get(trade.token_address);
    const bracket = mcap !== null ? categorizeMcap(mcap) : 1; // Default to bracket 1 if unknown
    
    return {
      ...trade,
      mcap_usd: mcap || 0,
      mcap_bracket: bracket
    };
  });
  
  console.log(`[MarketCap] Enrichment complete for ${enrichedTrades.length} trades`);
  
  return enrichedTrades;
}

/**
 * Calculate market cap distribution from enriched trades
 * @param {Array} trades - Trades with mcap_bracket field
 * @returns {Object} Distribution stats by bracket
 */
export function calculateMcapDistribution(trades) {
  const distribution = {
    1: { count: 0, wins: 0, losses: 0, totalPnl: 0, avgRoi: 0 },
    2: { count: 0, wins: 0, losses: 0, totalPnl: 0, avgRoi: 0 },
    3: { count: 0, wins: 0, losses: 0, totalPnl: 0, avgRoi: 0 },
    4: { count: 0, wins: 0, losses: 0, totalPnl: 0, avgRoi: 0 },
    5: { count: 0, wins: 0, losses: 0, totalPnl: 0, avgRoi: 0 }
  };
  
  trades.forEach(trade => {
    const bracket = trade.mcap_bracket || 1;
    const stats = distribution[bracket];
    
    stats.count++;
    if (trade.win) {
      stats.wins++;
    } else {
      stats.losses++;
    }
    stats.totalPnl += trade.realized_pnl || 0;
  });
  
  // Calculate average ROI per bracket
  Object.keys(distribution).forEach(bracket => {
    const stats = distribution[bracket];
    if (stats.count > 0) {
      const bracketTrades = trades.filter(t => t.mcap_bracket === parseInt(bracket));
      const totalRoi = bracketTrades.reduce((sum, t) => sum + (t.realized_roi || 0), 0);
      stats.avgRoi = totalRoi / stats.count;
      stats.winRate = (stats.wins / stats.count) * 100;
    }
  });
  
  return distribution;
}

export default {
  MCAP_BRACKETS,
  categorizeMcap,
  fetchTokenMarketCap,
  enrichTradesWithMarketCap,
  calculateMcapDistribution
};
