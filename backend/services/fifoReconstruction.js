/**
 * FIFO Trade Reconstruction Service
 * 
 * Implements FIFO (First-In-First-Out) matching algorithm per DEEP_ANALYSIS_PLAN.md
 * 
 * Takes individual buy/sell transactions from OKX Endpoint #7 and reconstructs
 * matched trades by pairing buys with sells chronologically.
 * 
 * Algorithm:
 * 1. Group transactions by token
 * 2. Sort by blockTime ascending (chronological order)
 * 3. Separate into buy queue and sell queue
 * 4. For each sell, consume earliest remaining buys (FIFO)
 * 5. Create matched trade records with exact entry/exit timestamps
 * 6. Handle partial fills and open positions
 * 
 * Per DEEP_ANALYSIS_PLAN.md Section C:
 * - FIFO directly maps to on-chain ownership chronology
 * - Deterministic for multi-part buys
 * - Produces completed-trade records and open positions
 */

/**
 * Reconstruct FIFO trades from individual transactions
 * 
 * @param {Array} transactions - Individual buy/sell events from OKX Endpoint #7
 * @returns {Object} { closedTrades: [], openPositions: [] }
 */
export function reconstructFIFOTrades(transactions) {
  console.log(`[FIFO] Reconstructing trades from ${transactions.length} transactions`);
  
  // Group transactions by token
  const byToken = groupByToken(transactions);
  
  const closedTrades = [];
  const openPositions = [];
  
  // Process each token separately
  for (const [tokenAddress, txs] of Object.entries(byToken)) {
    console.log(`[FIFO] Processing token ${txs[0].tokenSymbol} with ${txs.length} transactions`);
    
    // Sort by blockTime ascending (chronological order)
    const sorted = txs.sort((a, b) => a.blockTime - b.blockTime);
    
    // Separate buys and sells
    const buys = sorted.filter(tx => tx.type === 1); // type 1 = BUY
    const sells = sorted.filter(tx => tx.type === 2); // type 2 = SELL
    
    console.log(`[FIFO]   ${buys.length} buys, ${sells.length} sells`);
    
    // FIFO matching: match earliest buy to earliest sell
    const { matched, open } = matchFIFO(buys, sells, tokenAddress);
    
    closedTrades.push(...matched);
    openPositions.push(...open);
  }
  
  console.log(`[FIFO] Reconstruction complete: ${closedTrades.length} closed trades, ${openPositions.length} open positions`);
  
  return {
    closedTrades,
    openPositions,
    totalTransactions: transactions.length,
    tokensTraded: Object.keys(byToken).length
  };
}

/**
 * Group transactions by token address
 */
function groupByToken(transactions) {
  const groups = {};
  
  for (const tx of transactions) {
    const tokenAddress = tx.tokenContractAddress;
    if (!groups[tokenAddress]) {
      groups[tokenAddress] = [];
    }
    groups[tokenAddress].push(tx);
  }
  
  return groups;
}

/**
 * FIFO matching algorithm
 * 
 * Per DEEP_ANALYSIS_PLAN.md:
 * - While sell.quantity > 0 and buy-queue not empty:
 *   - Take earliest buy with remaining_qty
 *   - matched_qty = min(buy.remaining_qty, sell.quantity)
 *   - Create trade chunk with quantity = matched_qty
 *   - Decrease buy.remaining_qty and sell.quantity
 * - Remaining buys = open positions
 */
function matchFIFO(buys, sells, tokenAddress) {
  const matchedTrades = [];
  const openPositions = [];
  
  // Create mutable copies with remaining quantities
  const buyQueue = buys.map(buy => ({
    ...buy,
    remainingQty: parseFloat(buy.amount)
  }));
  
  const sellQueue = sells.map(sell => ({
    ...sell,
    remainingQty: parseFloat(sell.amount)
  }));
  
  // Process each sell
  for (const sell of sellQueue) {
    let sellRemaining = sell.remainingQty;
    
    // Match with earliest available buys
    while (sellRemaining > 0 && buyQueue.length > 0) {
      const buy = buyQueue[0];
      
      if (buy.remainingQty <= 0) {
        buyQueue.shift(); // Remove fully consumed buy
        continue;
      }
      
      // Calculate matched quantity
      const matchedQty = Math.min(buy.remainingQty, sellRemaining);
      
      // Create matched trade record
      const trade = createTradeRecord(buy, sell, matchedQty, tokenAddress);
      matchedTrades.push(trade);
      
      // Update remaining quantities
      buy.remainingQty -= matchedQty;
      sellRemaining -= matchedQty;
      
      // Remove buy if fully consumed
      if (buy.remainingQty <= 0.000001) { // Use epsilon for floating point comparison
        buyQueue.shift();
      }
    }
    
    // If sell has remaining quantity after exhausting buys, it's a short/transfer-out
    // We don't create negative inventory trades
    if (sellRemaining > 0.000001) {
      console.warn(`[FIFO] Sell has ${sellRemaining} tokens remaining after exhausting buys (possible transfer-in before sell)`);
    }
  }
  
  // Remaining buys are open positions
  for (const buy of buyQueue) {
    if (buy.remainingQty > 0.000001) {
      openPositions.push(createOpenPosition(buy, tokenAddress));
    }
  }
  
  return { matched: matchedTrades, open: openPositions };
}

/**
 * Create matched trade record per DEEP_ANALYSIS_PLAN.md Section 5
 */
function createTradeRecord(buy, sell, quantity, tokenAddress) {
  const entryPrice = parseFloat(buy.price);
  const exitPrice = parseFloat(sell.price);
  const entryValue = quantity * entryPrice;
  const exitValue = quantity * exitPrice;
  const realizedPnl = exitValue - entryValue;
  const realizedRoi = entryValue > 0 ? ((exitValue / entryValue - 1) * 100) : 0;
  const holdingMs = sell.blockTime - buy.blockTime;
  const holdingSeconds = Math.floor(holdingMs / 1000);
  const holdingHours = holdingSeconds / 3600;
  const holdingDays = holdingHours / 24;
  
  return {
    // Identity
    trade_id: `${buy.txHash}_${sell.txHash}_${quantity.toFixed(8)}`,
    token_address: tokenAddress,
    token_symbol: buy.tokenSymbol,
    token_name: buy.tokenSymbol,
    logo_url: buy.tokenLogo,
    
    // Entry
    entry_timestamp: buy.blockTime,
    entry_time: buy.blockTime, // Duplicate for compatibility
    entry_price: entryPrice,
    entry_value: entryValue,
    buy_txHash: buy.txHash,
    buy_blockHeight: buy.blockHeight,
    
    // Exit
    exit_timestamp: sell.blockTime,
    exit_time: sell.blockTime,
    exit_price: exitPrice,
    exit_value: exitValue,
    sell_txHash: sell.txHash,
    sell_blockHeight: sell.blockHeight,
    
    // Quantity
    quantity: quantity,
    
    // PnL per DEEP_ANALYSIS_PLAN.md Section D
    realized_pnl: realizedPnl,
    realized_roi: realizedRoi,
    win: realizedPnl > 0,
    
    // Holding duration per DEEP_ANALYSIS_PLAN.md Section D
    holding_seconds: holdingSeconds,
    holding_hours: holdingHours,
    holding_days: holdingDays,
    holding_time: holdingSeconds, // For compatibility
    
    // Market data at trade time (from OKX Endpoint #7)
    mcap_at_buy: parseFloat(buy.mcap || 0),
    mcap_at_sell: parseFloat(sell.mcap || 0),
    
    // Risk (from OKX Endpoint #7)
    risk_level: parseInt(buy.riskControlLevel || 1),
    
    // Status
    status: 'closed',
    
    // Placeholder for enrichment (will be filled by priceEnrichment service)
    max_price_during_hold: 0,
    max_potential_roi: 0,
    time_to_peak_seconds: 0,
    time_to_peak_hours: 0,
    early_exit: false
  };
}

/**
 * Create open position record
 */
function createOpenPosition(buy, tokenAddress) {
  const entryPrice = parseFloat(buy.price);
  const quantity = buy.remainingQty;
  const entryValue = quantity * entryPrice;
  
  return {
    // Identity
    trade_id: `${buy.txHash}_open`,
    token_address: tokenAddress,
    token_symbol: buy.tokenSymbol,
    token_name: buy.tokenSymbol,
    logo_url: buy.tokenLogo,
    
    // Entry
    entry_timestamp: buy.blockTime,
    entry_time: buy.blockTime,
    entry_price: entryPrice,
    entry_value: entryValue,
    buy_txHash: buy.txHash,
    buy_blockHeight: buy.blockHeight,
    
    // No exit
    exit_timestamp: null,
    exit_time: null,
    exit_price: null,
    exit_value: null,
    sell_txHash: null,
    sell_blockHeight: null,
    
    // Quantity
    quantity: quantity,
    
    // PnL (unrealized, will be calculated by enrichment)
    realized_pnl: 0,
    realized_roi: 0,
    unrealized_pnl: 0,
    unrealized_roi: 0,
    win: null,
    
    // Holding duration (ongoing)
    holding_seconds: Math.floor((Date.now() - buy.blockTime) / 1000),
    holding_hours: (Date.now() - buy.blockTime) / 1000 / 3600,
    holding_days: (Date.now() - buy.blockTime) / 1000 / 86400,
    holding_time: Math.floor((Date.now() - buy.blockTime) / 1000),
    
    // Market data
    mcap_at_buy: parseFloat(buy.mcap || 0),
    
    // Risk
    risk_level: parseInt(buy.riskControlLevel || 1),
    
    // Status
    status: 'open'
  };
}

/**
 * Validate FIFO reconstruction results
 * 
 * Quality checks per DEEP_ANALYSIS_PLAN.md:
 * - Sum of matched buy quantities ≤ cumulative buy quantities
 * - For each trade: abs(entry_value - entry_price*quantity) < epsilon
 * - Win rate calculation uses only trades with defined ROI
 */
export function validateFIFOReconstruction(transactions, result) {
  const { closedTrades, openPositions } = result;
  
  console.log('[FIFO] Validating reconstruction...');
  
  // Group transactions by token for validation
  const byToken = groupByToken(transactions);
  
  for (const [tokenAddress, txs] of Object.entries(byToken)) {
    const buys = txs.filter(tx => tx.type === 1);
    const totalBuyQty = buys.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    
    // Sum matched quantities for this token
    const tokenTrades = closedTrades.filter(t => t.token_address === tokenAddress);
    const tokenOpen = openPositions.filter(t => t.token_address === tokenAddress);
    
    const matchedBuyQty = tokenTrades.reduce((sum, t) => sum + t.quantity, 0);
    const openQty = tokenOpen.reduce((sum, t) => sum + t.quantity, 0);
    const totalMatched = matchedBuyQty + openQty;
    
    // Validate: matched quantities should equal total buy quantities (within epsilon)
    const epsilon = 0.001; // Allow small floating point errors
    if (Math.abs(totalMatched - totalBuyQty) > epsilon) {
      console.warn(`[FIFO] Quantity mismatch for ${txs[0].tokenSymbol}: bought ${totalBuyQty}, matched ${totalMatched}`);
    }
  }
  
  // Validate trade value calculations
  for (const trade of closedTrades) {
    const calculatedEntryValue = trade.quantity * trade.entry_price;
    const epsilon = 0.000001;
    
    if (Math.abs(trade.entry_value - calculatedEntryValue) > epsilon) {
      console.warn(`[FIFO] Entry value mismatch for trade ${trade.trade_id}: stored ${trade.entry_value}, calculated ${calculatedEntryValue}`);
    }
  }
  
  console.log('[FIFO] Validation complete');
  
  return true;
}
