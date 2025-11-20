import { fetchOHLCData } from '../priceEnrichment.js';
import { fetchAllSwaps, findNextTradePrice } from '../cmc/swaps.js';

/**
 * Enrich trades with "Copytrade" analysis
 * 
 * 1. Fetches OHLC data for each token.
 * 2. Fetches Swap data from CMC for each token (covering trade range).
 * 3. Finds "Copytrade Entry Price" (next trade price).
 * 4. Calculates potential returns based on Copytrade Entry Price.
 * 
 * @param {Array} trades - List of trades (closed or open)
 * @param {string} chain - Chain ID or name
 * @param {string} walletAddress - The wallet address being analyzed
 * @returns {Promise<Array>} Enriched trades
 */
export async function enrichTradesWithCopyTradeAnalysis(trades, chain, walletAddress) {
  if (!trades || trades.length === 0) return [];

  console.log(`[CopyTrade] Starting analysis for ${trades.length} trades...`);

  // Group trades by token to optimize API calls
  const tokenMap = new Map();
  for (const trade of trades) {
    const tokenAddr = trade.tokenContractAddress || trade.token_address; // Handle different naming conventions
    if (!tokenAddr) continue;
    
    if (!tokenMap.has(tokenAddr)) {
      tokenMap.set(tokenAddr, []);
    }
    tokenMap.get(tokenAddr).push(trade);
  }

  const enrichedTrades = [];

  // Process each token
  for (const [tokenAddr, tokenTrades] of tokenMap) {
    try {
      // 1. Determine time range for this token
      // We need swaps covering all trades
      const timestamps = tokenTrades.map(t => t.entry_timestamp || t.entry_time || (t.blockTime * 1000));
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      
      // Buffer: 1 hour before min (just in case) and 2 hours after max (to find next trade)
      const swapStartTime = minTime - 3600000;
      const swapEndTime = maxTime + 7200000; 

      // 2. Fetch Swaps (Global market swaps for the token)
      // We fetch swaps for the TOKEN, not the wallet, to find the next market trade
      const swaps = await fetchAllSwaps(tokenAddr, chain, swapStartTime, swapEndTime);
      
      // 3. Fetch OHLC Data (we need it for the calculations)
      // We fetch 1h candles by default as per user request/existing logic
      // We fetch enough to cover from minTime to now (or max exit + buffer)
      // For simplicity, we fetch 1000 1h candles which covers ~40 days.
      const candles = await fetchOHLCData(tokenAddr, chain, '1H', 1000);

      // 4. Process each trade
      for (const trade of tokenTrades) {
        const entryTime = trade.entry_timestamp || trade.entry_time || (trade.blockTime * 1000);
        
        // Find Copytrade Price
        const { copyPrice, originalTrade, nextTrade } = findNextTradePrice(trade, swaps, walletAddress);
        
        // Calculate Metrics
        const metrics = calculateCopyTradeMetrics(candles, copyPrice, entryTime);

        
        enrichedTrades.push({
          ...trade,
          copy_trade_analysis: {
            entry_price: copyPrice,
            original_trade_debug: originalTrade,
            next_trade_debug: nextTrade,
            ...metrics
          }
        });
      }
      
    } catch (err) {
      console.error(`[CopyTrade] Error processing token ${tokenAddr}: ${err.message}`);
      // Return trades without enrichment on error
      for (const trade of tokenTrades) {
        enrichedTrades.push(trade);
      }
    }
  }

  return enrichedTrades;
}

/**
 * Calculate metrics based on Copytrade Entry Price and OHLC candles
 */
export function calculateCopyTradeMetrics(candles, copyPrice, entryTime) {
  if (!copyPrice || !candles || candles.length === 0) {
    return {
      possible_gain_1h: null,
      possible_gain_full: null,
      possible_loss_1h: null,
      possible_loss_full: null,
      time_to_25_percent: null,
      time_to_50_percent: null
    };
  }

  // Filter candles after entry
  const relevantCandles = candles.filter(c => c.timestamp >= entryTime).sort((a, b) => a.timestamp - b.timestamp);
  
  if (relevantCandles.length === 0) return {
      possible_gain_1h: null,
      possible_gain_full: null,
      possible_loss_1h: null,
      possible_loss_full: null,
      time_to_25_percent: null,
      time_to_50_percent: null
  };

  let maxPrice1h = -Infinity;
  let minPrice1h = Infinity;
  let maxPriceFull = -Infinity;
  let minPriceFull = Infinity;
  
  let timeTo25 = null;
  let timeTo50 = null;

  const oneHourMs = 3600000;

  for (const candle of relevantCandles) {
    const timeDiff = candle.timestamp - entryTime;
    
    // Full Window Stats
    if (candle.high > maxPriceFull) maxPriceFull = candle.high;
    if (candle.low < minPriceFull) minPriceFull = candle.low;
    
    // 1h Stats
    if (timeDiff <= oneHourMs) {
      if (candle.high > maxPrice1h) maxPrice1h = candle.high;
      if (candle.low < minPrice1h) minPrice1h = candle.low;
    }

    // Time to targets
    const gain = (candle.high - copyPrice) / copyPrice;
    if (!timeTo25 && gain >= 0.25) timeTo25 = timeDiff;
    if (!timeTo50 && gain >= 0.50) timeTo50 = timeDiff;
  }

  // Calculate percentages
  const calcRoi = (price, base) => base > 0 ? ((price - base) / base) * 100 : 0;

  return {
    possible_gain_1h: maxPrice1h !== -Infinity ? calcRoi(maxPrice1h, copyPrice) : 0,
    possible_loss_1h: minPrice1h !== Infinity ? calcRoi(minPrice1h, copyPrice) : 0,
    possible_gain_full: maxPriceFull !== -Infinity ? calcRoi(maxPriceFull, copyPrice) : 0,
    possible_loss_full: minPriceFull !== Infinity ? calcRoi(minPriceFull, copyPrice) : 0,
    time_to_25_percent: timeTo25, // ms
    time_to_50_percent: timeTo50  // ms
  };
}
