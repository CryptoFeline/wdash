/**
 * Price Enrichment Service
 * 
 * Fetches historical OHLC (Open-High-Low-Close) price data from OKX API
 * to enrich reconstructed trades with max potential ROI calculations.
 * 
 * This enables accurate skill scoring by showing:
 * - Maximum price achieved during holding period
 * - Time from entry to peak price
 * - Whether trader exited early (before peak)
 * - Max potential ROI vs actual realized ROI
 */

import axios from 'axios';

/**
 * Fetch OHLC candlestick data from OKX API
 * 
 * @param {string} tokenAddress - Token contract address
 * @param {number} afterTimestamp - Start timestamp in milliseconds
 * @param {string} chain - 'eth' or 'sol'
 * @param {string} bar - Candle interval: '1m', '5m', '15m', '1h', '4h', '1d'
 * @param {number} limit - Number of candles to fetch (max 1000)
 * @returns {Promise<Array>} Array of OHLC candles
 */
export async function fetchOHLCData(tokenAddress, afterTimestamp, chain = 'eth', bar = '1h', limit = 168) {
  try {
    const chainId = chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1';
    
    const url = 'https://web3.okx.com/priapi/v5/dex/token/market/dex-token-hlc-candles';
    const params = {
      chainId,
      address: tokenAddress,
      after: afterTimestamp,
      bar,
      limit,
      t: Date.now()
    };
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.code !== '0' || !response.data?.data) {
      console.warn(`[OHLC] Failed to fetch for ${tokenAddress}: ${response.data?.msg || 'No data'}`);
      return [];
    }
    
    // Parse candle data
    // Format: [timestamp, open, high, low, close, volume, trades, active]
    const candles = response.data.data.map(candle => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      trades: parseFloat(candle[6]),
      active: candle[7] === '0' // '0' = active (current), '1' = closed
    }));
    
    return candles;
  } catch (error) {
    console.error(`[OHLC] Error fetching for ${tokenAddress}:`, error.message);
    return [];
  }
}

/**
 * Find maximum price during holding period
 * 
 * @param {Array} candles - OHLC candles
 * @param {number} entryTimestamp - Entry time in milliseconds
 * @param {number} exitTimestamp - Exit time in milliseconds
 * @returns {Object} { maxPrice, timeToPeakMs, peakTimestamp }
 */
export function findMaxPriceDuringHold(candles, entryTimestamp, exitTimestamp) {
  if (!candles || candles.length === 0) {
    return { maxPrice: 0, timeToPeakMs: 0, peakTimestamp: 0 };
  }
  
  // Filter candles within holding period
  const holdingCandles = candles.filter(c => 
    c.timestamp >= entryTimestamp && c.timestamp <= exitTimestamp
  );
  
  if (holdingCandles.length === 0) {
    return { maxPrice: 0, timeToPeakMs: 0, peakTimestamp: 0 };
  }
  
  // Find max high price
  let maxPrice = 0;
  let peakTimestamp = entryTimestamp;
  
  for (const candle of holdingCandles) {
    if (candle.high > maxPrice) {
      maxPrice = candle.high;
      peakTimestamp = candle.timestamp;
    }
  }
  
  const timeToPeakMs = peakTimestamp - entryTimestamp;
  
  return { maxPrice, timeToPeakMs, peakTimestamp };
}

/**
 * Determine optimal bar interval based on holding time
 * 
 * @param {number} holdingHours - Holding time in hours
 * @returns {string} Bar interval ('1m', '5m', '15m', '1h', '4h', '1d')
 */
export function getOptimalBarInterval(holdingHours) {
  if (holdingHours < 1) return '1m';      // < 1 hour: 1-minute candles
  if (holdingHours < 6) return '5m';      // 1-6 hours: 5-minute candles
  if (holdingHours < 24) return '15m';    // 6-24 hours: 15-minute candles
  if (holdingHours < 168) return '1h';    // 1-7 days: 1-hour candles
  if (holdingHours < 720) return '4h';    // 7-30 days: 4-hour candles
  return '1d';                             // > 30 days: daily candles
}

/**
 * Calculate optimal limit for OHLC request
 * 
 * @param {number} holdingHours - Holding time in hours
 * @param {string} bar - Bar interval
 * @returns {number} Number of candles needed (max 1000)
 */
export function calculateCandleLimit(holdingHours, bar) {
  const barMinutes = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '4h': 240,
    '1d': 1440
  };
  
  const minutes = barMinutes[bar] || 60;
  const holdingMinutes = holdingHours * 60;
  const needed = Math.ceil(holdingMinutes / minutes);
  
  // Add 20% buffer for gaps, max 1000
  return Math.min(Math.ceil(needed * 1.2), 1000);
}

/**
 * Enrich a single trade with historical price data
 * 
 * @param {Object} trade - Reconstructed trade object
 * @param {string} chain - 'eth' or 'sol'
 * @returns {Promise<Object>} Enriched trade with max_price_during_hold, etc.
 */
export async function enrichTradeWithPrices(trade, chain = 'eth') {
  try {
    // Skip if already enriched or trade is incomplete
    if (trade.max_price_during_hold > 0 || !trade.entry_timestamp || !trade.exit_timestamp) {
      return trade;
    }
    
    const holdingHours = trade.holding_hours || 0;
    if (holdingHours <= 0) {
      return trade;
    }
    
    // Determine optimal bar interval and limit
    const bar = getOptimalBarInterval(holdingHours);
    const limit = calculateCandleLimit(holdingHours, bar);
    
    // Fetch OHLC data
    const candles = await fetchOHLCData(
      trade.token_address,
      trade.entry_timestamp,
      chain,
      bar,
      limit
    );
    
    if (candles.length === 0) {
      console.warn(`[Enrichment] No OHLC data for ${trade.token_symbol}`);
      return trade;
    }
    
    // Find max price during hold
    const { maxPrice, timeToPeakMs } = findMaxPriceDuringHold(
      candles,
      trade.entry_timestamp,
      trade.exit_timestamp
    );
    
    if (maxPrice === 0) {
      return trade;
    }
    
    // Calculate enriched metrics
    const maxPotentialRoi = ((maxPrice / trade.entry_price) - 1) * 100;
    const timeToPeakHours = timeToPeakMs / (1000 * 60 * 60);
    
    // Determine if trader exited early (before reaching peak)
    const exitedBeforePeak = trade.exit_timestamp < (trade.entry_timestamp + timeToPeakMs);
    
    // Calculate efficiency: how much of potential was realized
    const captureEfficiency = maxPotentialRoi > 0 
      ? (trade.realized_roi / maxPotentialRoi) * 100 
      : 0;
    
    // Update trade object
    return {
      ...trade,
      max_price_during_hold: maxPrice,
      max_potential_roi: maxPotentialRoi,
      time_to_peak_hours: timeToPeakHours,
      early_exit: exitedBeforePeak,
      capture_efficiency: captureEfficiency
    };
  } catch (error) {
    console.error(`[Enrichment] Error for ${trade.token_symbol}:`, error.message);
    return trade;
  }
}

/**
 * Enrich multiple trades with price data in batches
 * 
 * @param {Array} trades - Array of reconstructed trades
 * @param {string} chain - 'eth' or 'sol'
 * @param {number} batchSize - Number of concurrent requests (default 5)
 * @returns {Promise<Array>} Array of enriched trades
 */
export async function enrichTradesWithPrices(trades, chain = 'eth', batchSize = 5) {
  if (!trades || trades.length === 0) {
    return [];
  }
  
  console.log(`[Enrichment] Starting enrichment for ${trades.length} trades...`);
  
  const enrichedTrades = [];
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < trades.length; i += batchSize) {
    const batch = trades.slice(i, i + batchSize);
    
    const enrichedBatch = await Promise.all(
      batch.map(trade => enrichTradeWithPrices(trade, chain))
    );
    
    enrichedTrades.push(...enrichedBatch);
    
    console.log(`[Enrichment] Processed ${Math.min(i + batchSize, trades.length)}/${trades.length} trades`);
    
    // Small delay between batches
    if (i + batchSize < trades.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`[Enrichment] Completed enrichment for ${enrichedTrades.length} trades`);
  
  return enrichedTrades;
}

export default {
  fetchOHLCData,
  findMaxPriceDuringHold,
  getOptimalBarInterval,
  calculateCandleLimit,
  enrichTradeWithPrices,
  enrichTradesWithPrices
};
