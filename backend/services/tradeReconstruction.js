/**
 * Trade Reconstruction Service
 * 
 * Implements FIFO (First-In-First-Out) matching algorithm to reconstruct
 * completed trades from individual buy and sell transactions.
 * 
 * Core algorithm per TARGET_ANALYSIS.md requirements:
 * - Match buys to sells chronologically (FIFO)
 * - Compute realized PnL/ROI per matched pair
 * - Track remaining quantities for partial fills
 * - Generate unique trade IDs for each matched segment
 */

/**
 * Reconstructs completed trades from buy and sell events using FIFO matching
 * 
 * @param {Array} buyEvents - Array of buy transactions
 * @param {Array} sellEvents - Array of sell transactions
 * @returns {Array} Array of reconstructed trade objects
 * 
 * @example
 * const buys = [
 *   { buy_id: 'b1', timestamp: 1000, price_usd: 10, quantity: 100 },
 *   { buy_id: 'b2', timestamp: 2000, price_usd: 12, quantity: 50 }
 * ];
 * const sells = [
 *   { sell_id: 's1', timestamp: 3000, price_usd: 15, quantity: 120 }
 * ];
 * const trades = reconstructTrades(buys, sells);
 */
export function reconstructTrades(buyEvents, sellEvents) {
  const trades = [];
  
  // Clone and sort buys by timestamp (FIFO queue)
  const buyQueue = buyEvents
    .map(buy => ({
      ...buy,
      remaining_qty: buy.quantity
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
  
  // Sort sells by timestamp
  const sortedSells = [...sellEvents].sort((a, b) => a.timestamp - b.timestamp);
  
  // Match each sell to buys in FIFO order
  for (const sell of sortedSells) {
    let remainingSellQty = sell.quantity;
    let segmentIndex = 0;
    
    while (remainingSellQty > 0 && buyQueue.length > 0) {
      const buy = buyQueue[0];
      
      // Calculate matched quantity for this segment
      const matchedQty = Math.min(buy.remaining_qty, remainingSellQty);
      
      // Calculate trade metrics
      const entryValue = buy.price_usd * matchedQty;
      const exitValue = sell.price_usd * matchedQty;
      const realizedPnl = exitValue - entryValue;
      const realizedRoi = buy.price_usd > 0 
        ? ((sell.price_usd / buy.price_usd) - 1) * 100 
        : 0;
      const holdingSeconds = sell.timestamp - buy.timestamp;
      
      // Create reconstructed trade record
      trades.push({
        trade_id: `${buy.buy_id}/${sell.sell_id}/${segmentIndex}`,
        token_address: buy.token_address,
        token_symbol: buy.token_symbol || 'UNKNOWN',
        token_name: buy.token_name || 'Unknown Token',
        logoUrl: buy.logoUrl || '',
        
        entry_timestamp: buy.timestamp,
        exit_timestamp: sell.timestamp,
        entry_price: buy.price_usd,
        exit_price: sell.price_usd,
        quantity: matchedQty,
        
        entry_value: entryValue,
        exit_value: exitValue,
        realized_pnl: realizedPnl,
        realized_roi: realizedRoi,
        
        holding_seconds: holdingSeconds,
        holding_hours: holdingSeconds / 3600,
        holding_days: holdingSeconds / 86400,
        
        // These will be enriched with price history data
        max_price_during_hold: sell.price_usd, // Placeholder, will be updated
        max_potential_roi: realizedRoi, // Placeholder, will be updated
        time_to_peak_seconds: 0, // Placeholder, will be updated
        time_to_peak_hours: 0, // Placeholder, will be updated
        
        win: realizedPnl > 0,
        early_exit: false, // Will be computed after price enrichment
        
        mcap_bracket: buy.mcap_bracket || 0,
        riskLevel: buy.riskLevel || 1,
        
        // Metadata for debugging
        buy_id: buy.buy_id,
        sell_id: sell.sell_id,
        segment_index: segmentIndex
      });
      
      // Update remaining quantities
      buy.remaining_qty -= matchedQty;
      remainingSellQty -= matchedQty;
      segmentIndex++;
      
      // Remove buy from queue if fully consumed
      if (buy.remaining_qty <= 0.0000001) { // Use epsilon for floating point comparison
        buyQueue.shift();
      }
    }
    
    // Warning: If remainingSellQty > 0, this sell couldn't be fully matched
    if (remainingSellQty > 0.0001) {
      console.warn(`Sell ${sell.sell_id} has unmatched quantity: ${remainingSellQty}`);
    }
  }
  
  // Report any unmatched buys (open positions)
  const openPositions = buyQueue.filter(buy => buy.remaining_qty > 0.0001);
  if (openPositions.length > 0) {
    console.log(`${openPositions.length} open positions (buys without matching sells)`);
  }
  
  return trades;
}

/**
 * Converts OKX token transaction data to buy/sell event format
 * 
 * @param {Object} tokenData - OKX token data from API
 * @returns {Object} { buyEvents, sellEvents }
 */
export function parseOKXTokenTransactions(tokenData) {
  const buyEvents = [];
  const sellEvents = [];
  
  // Parse buy transactions
  if (tokenData.buyList && Array.isArray(tokenData.buyList)) {
    tokenData.buyList.forEach((buy, index) => {
      buyEvents.push({
        buy_id: `${tokenData.tokenAddress}_buy_${buy.timestamp || index}`,
        token_address: tokenData.tokenAddress,
        token_symbol: tokenData.tokenSymbol,
        token_name: tokenData.tokenName,
        logoUrl: tokenData.logoUrl,
        timestamp: buy.timestamp || 0,
        price_usd: parseFloat(buy.priceUsd || buy.price || 0),
        quantity: parseFloat(buy.amount || buy.quantity || 0),
        usd_value: parseFloat(buy.volumeUsd || buy.value || 0),
        mcap_bracket: buy.mcapBracket || 0,
        riskLevel: tokenData.riskLevel || 1
      });
    });
  }
  
  // Parse sell transactions
  if (tokenData.sellList && Array.isArray(tokenData.sellList)) {
    tokenData.sellList.forEach((sell, index) => {
      sellEvents.push({
        sell_id: `${tokenData.tokenAddress}_sell_${sell.timestamp || index}`,
        token_address: tokenData.tokenAddress,
        token_symbol: tokenData.tokenSymbol,
        token_name: tokenData.tokenName,
        logoUrl: tokenData.logoUrl,
        timestamp: sell.timestamp || 0,
        price_usd: parseFloat(sell.priceUsd || sell.price || 0),
        quantity: parseFloat(sell.amount || sell.quantity || 0),
        usd_value: parseFloat(sell.volumeUsd || sell.value || 0)
      });
    });
  }
  
  return { buyEvents, sellEvents };
}

/**
 * Reconstructs all trades for a wallet across all tokens
 * 
 * @param {Object} walletData - Complete OKX wallet data
 * @returns {Array} All reconstructed trades
 */
export function reconstructWalletTrades(walletData) {
  if (!walletData || !walletData.tokenList) {
    return [];
  }
  
  const allTrades = [];
  
  for (const token of walletData.tokenList) {
    const { buyEvents, sellEvents } = parseOKXTokenTransactions(token);
    
    if (buyEvents.length > 0 && sellEvents.length > 0) {
      const tokenTrades = reconstructTrades(buyEvents, sellEvents);
      allTrades.push(...tokenTrades);
    }
  }
  
  return allTrades;
}

export default {
  reconstructTrades,
  parseOKXTokenTransactions,
  reconstructWalletTrades
};
