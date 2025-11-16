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
 * Note: The OKX API has quirks:
 * - 'after' parameter causes "Parameter bar error"
 * - Some tokens only support certain bar intervals
 * - We fetch without 'after', then filter client-side
 * 
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - 'eth' or 'sol'
 * @param {string} bar - Candle interval: '1m', '5m', '15m', '1h', '4h', '1d'
 * @param {number} limit - Number of candles to fetch (max 1000)
 * @returns {Promise<Array>} Array of OHLC candles (newest first from API)
 */
export async function fetchOHLCData(tokenAddress, chain = 'eth', bar = '1h', limit = 1000) {
  try {
    const chainId = chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1';
    
    const url = 'https://web3.okx.com/priapi/v5/dex/token/market/dex-token-hlc-candles';
    const params = {
      chainId,
      address: tokenAddress,
      bar,
      limit,
      t: Date.now()
    };
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.data?.code !== '0' || !response.data?.data) {
      console.warn(`[OHLC] Failed to fetch for ${tokenAddress} (bar=${bar}): ${response.data?.msg || 'No data'}`);
      return [];
    }
    
    // Parse candle data
    // Format: [timestamp, open, high, low, close, volume, volumeUsd, trades]
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
 * Analyze price movement after entry timestamp
 * 
 * This function analyzes:
 * 1. Max upswing (highest high) after entry
 * 2. Max drawdown (lowest low) after entry  
 * 3. Whether peak/trough happened before or after exit
 * 4. Immediate price action (first 1 hour) for entry quality
 * 5. Current price position for open trades
 * 
 * Note: Candles are from OKX API (newest first), we filter to only post-entry candles
 * 
 * @param {Array} candles - OHLC candles from API (newest first)
 * @param {number} entryTimestamp - Entry time in milliseconds
 * @param {number} entryPrice - Entry price
 * @param {number} exitTimestamp - Exit time in milliseconds (null for open positions)
 * @param {number} currentPrice - Current price (for open positions)
 * @returns {Object} Comprehensive price analysis
 */
export function analyzePriceMovement(candles, entryTimestamp, entryPrice, exitTimestamp = null, currentPrice = null) {
  if (!candles || candles.length === 0 || !entryPrice) {
    return { 
      maxPrice: 0, 
      maxPriceRoi: 0, 
      maxDrawdown: 0, 
      maxDrawdownRoi: 0,
      peakTimestamp: 0,
      troughTimestamp: 0,
      peakBeforeExit: false,
      troughBeforeExit: false,
      immediateMove1h: 0,
      entryQuality: 'unknown',
      currentPriceRoi: 0
    };
  }
  
  // Filter to only candles AFTER entry timestamp
  // OKX returns newest first, so we need all candles with timestamp >= entryTimestamp
  const candlesAfterEntry = candles.filter(c => c.timestamp >= entryTimestamp);
  
  if (candlesAfterEntry.length === 0) {
    // No candles after entry - trade might be too old or too recent
    return { 
      maxPrice: entryPrice, 
      maxPriceRoi: 0, 
      maxDrawdown: entryPrice, 
      maxDrawdownRoi: 0,
      peakTimestamp: entryTimestamp,
      troughTimestamp: entryTimestamp,
      peakBeforeExit: false,
      troughBeforeExit: false,
      immediateMove1h: 0,
      entryQuality: 'unknown',
      currentPriceRoi: currentPrice ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0
    };
  }
  
  // Find max high price (peak) and when it occurred
  let maxPrice = entryPrice;
  let peakTimestamp = entryTimestamp;
  
  for (const candle of candlesAfterEntry) {
    if (candle.high > maxPrice) {
      maxPrice = candle.high;
      peakTimestamp = candle.timestamp;
    }
  }
  
  // Find min low price (trough/drawdown) and when it occurred
  let minPrice = entryPrice;
  let troughTimestamp = entryTimestamp;
  
  for (const candle of candlesAfterEntry) {
    if (candle.low < minPrice) {
      minPrice = candle.low;
      troughTimestamp = candle.timestamp;
    }
  }
  
  // Calculate ROI from entry price
  const maxPriceRoi = ((maxPrice - entryPrice) / entryPrice) * 100;
  const maxDrawdownRoi = ((minPrice - entryPrice) / entryPrice) * 100;
  
  // Check if peak/trough happened before exit
  const peakBeforeExit = exitTimestamp ? peakTimestamp < exitTimestamp : false;
  const troughBeforeExit = exitTimestamp ? troughTimestamp < exitTimestamp : false;
  
  // Analyze immediate price movement (first hour after entry)
  const oneHourAfterEntry = entryTimestamp + (60 * 60 * 1000);
  const candlesFirst1h = candlesAfterEntry.filter(c => c.timestamp <= oneHourAfterEntry);
  
  let immediateMove1h = 0;
  let entryQuality = 'unknown';
  
  if (candlesFirst1h.length > 0) {
    // Find max high in first hour
    const maxIn1h = Math.max(...candlesFirst1h.map(c => c.high));
    immediateMove1h = ((maxIn1h - entryPrice) / entryPrice) * 100;
    
    // Classify entry quality based on immediate price action
    if (immediateMove1h >= 50) {
      entryQuality = 'excellent'; // +50% or more in first hour
    } else if (immediateMove1h >= 25) {
      entryQuality = 'good';      // +25-50% in first hour
    } else if (immediateMove1h >= 10) {
      entryQuality = 'fair';      // +10-25% in first hour
    } else if (immediateMove1h >= 0) {
      entryQuality = 'poor';      // 0-10% in first hour
    } else {
      entryQuality = 'bad';       // Negative in first hour
    }
  }
  
  // For open positions, calculate current price ROI
  let currentPriceRoi = 0;
  if (currentPrice) {
    currentPriceRoi = ((currentPrice - entryPrice) / entryPrice) * 100;
  }
  
  return { 
    maxPrice, 
    maxPriceRoi, 
    maxDrawdown: minPrice, 
    maxDrawdownRoi,
    peakTimestamp,
    troughTimestamp,
    peakBeforeExit,
    troughBeforeExit,
    immediateMove1h,
    entryQuality,
    currentPriceRoi
  };
}

/**
 * Determine optimal bar interval for OHLC data
 * 
 * Strategy:
 * - Start with 1d (daily) for broad view
 * - Use 1h for recent trades (< 30 days ago)
 * - Use 1m for very recent trades (< 1 day ago)
 * 
 * @param {number} entryTimestamp - Entry time in milliseconds
 * @returns {string} Bar interval ('1m', '1h', '1d')
 */
export function getOptimalBarInterval(entryTimestamp) {
  const now = Date.now();
  const ageMs = now - entryTimestamp;
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  
  if (ageDays < 1) return '1m';      // < 1 day: 1-minute candles for granularity
  if (ageDays < 30) return '1h';     // < 30 days: 1-hour candles
  return '1d';                       // >= 30 days: daily candles
}

/**
 * Calculate optimal limit for OHLC request
 * 
 * For skill scoring, we need to fetch enough candles to cover the lookforward period
 * 
 * @param {number} holdingHours - Actual holding time in hours
 * @param {string} bar - Bar interval
 * @param {number} lookforwardDays - Days to look forward (default 7)
 * @returns {number} Number of candles needed (max 1000)
 */
export function calculateCandleLimit(holdingHours, bar, lookforwardDays = 7) {
  const barMinutes = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '4h': 240,
    '1d': 1440
  };
  
  const minutes = barMinutes[bar] || 60;
  
  // Calculate time range to cover (max of actual holding time and lookforward period)
  const lookforwardHours = lookforwardDays * 24;
  const analysisHours = Math.max(holdingHours, lookforwardHours);
  const analysisMinutes = analysisHours * 60;
  
  const needed = Math.ceil(analysisMinutes / minutes);
  
  // Add 20% buffer for gaps, max 1000
  return Math.min(Math.ceil(needed * 1.2), 1000);
}

/**
 * Enrich a single trade with historical price data
 * 
 * Strategy:
 * 1. Fetch candles WITHOUT 'after' param (API limitation - 'after' causes errors)
 * 2. Try 1h bars first (covers ~41 days with 1000 candles), fallback to 1m if that fails
 * 3. Filter candles client-side to only those after entry timestamp
 * 4. Analyze max upswing, max drawdown, and timing relative to exit
 * 5. Check immediate price action (0-1h) for entry quality scoring
 * 6. For open positions, compare current vs max achieved
 * 
 * @param {Object} trade - Reconstructed trade object
 * @param {string} chain - 'eth' or 'sol'
 * @returns {Promise<Object>} Enriched trade with comprehensive price analysis
 */
export async function enrichTradeWithPrices(trade, chain = 'eth') {
  try {
    // Skip if already enriched or trade is incomplete
    if (trade.max_potential_roi !== undefined && trade.max_potential_roi > 0) {
      return trade;
    }
    
    if (!trade.entry_timestamp || !trade.entry_price) {
      return trade;
    }
    
    // Determine optimal bar interval based on trade age
    const primaryBar = getOptimalBarInterval(trade.entry_timestamp);
    
    // Fetch OHLC data - try primary bar interval first
    let candles = await fetchOHLCData(trade.token_address, chain, primaryBar, 1000);
    let barUsed = primaryBar;
    
    // If primary bar failed, try fallback bars
    if (candles.length === 0) {
      const fallbackBars = primaryBar === '1h' ? ['1m'] : primaryBar === '1d' ? ['1h', '1m'] : [];
      
      for (const fallbackBar of fallbackBars) {
        candles = await fetchOHLCData(trade.token_address, chain, fallbackBar, 1000);
        if (candles.length > 0) {
          barUsed = fallbackBar;
          break;
        }
      }
    }
    
    if (candles.length === 0) {
      console.warn(`[Enrichment] No OHLC data for ${trade.token_symbol} (tried ${primaryBar})`);
      return trade;
    }
    
    // Analyze price movement after entry
    const analysis = analyzePriceMovement(
      candles,
      trade.entry_timestamp,
      trade.entry_price,
      trade.exit_timestamp,
      trade.exit_price || null // Use exit price as current for closed trades
    );
    
    if (analysis.maxPrice === 0) {
      console.warn(`[Enrichment] No price movement found for ${trade.token_symbol}`);
      return trade;
    }
    
    // Calculate metrics
    const timeToPeakMs = analysis.peakTimestamp - trade.entry_timestamp;
    const timeToTroughMs = analysis.troughTimestamp - trade.entry_timestamp;
    const timeToPeakHours = timeToPeakMs / (1000 * 60 * 60);
    const timeToTroughHours = timeToTroughMs / (1000 * 60 * 60);
    
    // Did trader exit before reaching peak?
    const exitedBeforePeak = trade.exit_timestamp && analysis.peakBeforeExit === false;
    
    // Capture efficiency: how much of potential upside was realized
    const captureEfficiency = analysis.maxPriceRoi > 0 
      ? (trade.realized_roi / analysis.maxPriceRoi) * 100 
      : 0;
    
    // Log enrichment results
    const statusEmoji = analysis.peakBeforeExit ? '✅' : '❌';
    console.log(`[Enrichment] ${trade.token_symbol}: Peak ${statusEmoji}${analysis.peakBeforeExit ? 'before' : 'after'} exit, Max +${analysis.maxPriceRoi.toFixed(1)}% @ ${timeToPeakHours.toFixed(1)}h, Entry ${analysis.entryQuality} (+${analysis.immediateMove1h.toFixed(1)}% in 1h), Realized ${trade.realized_roi.toFixed(1)}%, Eff ${captureEfficiency.toFixed(0)}%`);
    
    // Update trade object with enriched data
    return {
      ...trade,
      max_price_during_hold: analysis.maxPrice,
      max_potential_roi: analysis.maxPriceRoi,
      max_drawdown: analysis.maxDrawdown,
      max_drawdown_roi: analysis.maxDrawdownRoi,
      time_to_peak_hours: timeToPeakHours,
      time_to_trough_hours: timeToTroughHours,
      peak_timestamp: analysis.peakTimestamp,
      trough_timestamp: analysis.troughTimestamp,
      peak_before_exit: analysis.peakBeforeExit,
      trough_before_exit: analysis.troughBeforeExit,
      exited_before_peak: exitedBeforePeak,
      immediate_move_1h: analysis.immediateMove1h,
      entry_quality: analysis.entryQuality,
      capture_efficiency: captureEfficiency,
      ohlc_bar_interval: barUsed,
      ohlc_candles_analyzed: candles.length
    };
    
  } catch (error) {
    console.error(`[Enrichment] Error enriching ${trade.token_symbol}:`, error.message);
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
  analyzePriceMovement,
  getOptimalBarInterval,
  enrichTradeWithPrices,
  enrichTradesWithPrices
};
