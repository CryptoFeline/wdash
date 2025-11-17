// ============================================================
// FIFO TRADE RECONSTRUCTION
// ============================================================
// Reconstructs trades using FIFO (First-In-First-Out) logic
// Pairs buy/sell transactions chronologically per token
// Identifies open positions and closed trades
// ============================================================

// ============================================================
// FIFO RECONSTRUCTION
// ============================================================

export function reconstructTradesWithFIFO(transactions) {
  // Group by token
  const tokenTxMap = new Map();
  
  for (const tx of transactions) {
    const tokenAddress = tx.tokenContractAddress;
    if (!tokenTxMap.has(tokenAddress)) {
      tokenTxMap.set(tokenAddress, []);
    }
    tokenTxMap.get(tokenAddress).push(tx);
  }
  
  const allPairedTrades = [];
  const openPositions = [];
  
  // Process each token
  for (const [tokenAddress, txs] of tokenTxMap) {
    // Sort chronologically
    txs.sort((a, b) => a.blockTime - b.blockTime);
    
    const tokenSymbol = txs[0].tokenSymbol;
    const buyQueue = [];
    
    for (const tx of txs) {
      if (tx.type === 1) {
        // BUY: Add to queue
        buyQueue.push({
          ...tx,
          remaining: parseFloat(tx.amount)
        });
      } else if (tx.type === 2) {
        // SELL: Match with oldest buys (FIFO)
        let remainingSell = parseFloat(tx.amount);
        
        while (remainingSell > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const matchedAmount = Math.min(buy.remaining, remainingSell);
          
          const entryValue = matchedAmount * parseFloat(buy.price);
          const exitValue = matchedAmount * parseFloat(tx.price);
          const realizedPnl = exitValue - entryValue;
          const realizedRoi = ((parseFloat(tx.price) - parseFloat(buy.price)) / parseFloat(buy.price)) * 100;
          const holdingTimeSeconds = (tx.blockTime - buy.blockTime) / 1000;
          
          allPairedTrades.push({
            token_address: tokenAddress,
            token_symbol: tokenSymbol,
            entry_time: buy.blockTime,
            exit_time: tx.blockTime,
            holding_time_seconds: holdingTimeSeconds,
            entry_price: parseFloat(buy.price),
            exit_price: parseFloat(tx.price),
            amount: matchedAmount,
            entry_value_usd: entryValue,
            exit_value_usd: exitValue,
            realized_pnl: realizedPnl,
            realized_roi: realizedRoi,
            entry_mcap: parseFloat(buy.mcap || 0),
            exit_mcap: parseFloat(tx.mcap || 0),
            entry_tx_hash: buy.txHash,
            exit_tx_hash: tx.txHash,
            is_open: false
          });
          
          buy.remaining -= matchedAmount;
          remainingSell -= matchedAmount;
          
          if (buy.remaining <= 0.000001) {
            buyQueue.shift();
          }
        }
      }
    }
    
    // Open positions (unsold buys)
    if (buyQueue.length > 0) {
      for (const buy of buyQueue) {
        openPositions.push({
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          entry_time: buy.blockTime,
          exit_time: null,
          holding_time_seconds: (Date.now() - buy.blockTime) / 1000,
          entry_price: parseFloat(buy.price),
          exit_price: null,
          amount: buy.remaining,
          entry_value_usd: buy.remaining * parseFloat(buy.price),
          exit_value_usd: null,
          realized_pnl: null,
          realized_roi: null,
          unrealized_pnl: null,
          unrealized_roi: null,
          entry_mcap: parseFloat(buy.mcap || 0),
          exit_mcap: null,
          entry_tx_hash: buy.txHash,
          exit_tx_hash: null,
          is_open: true,
          current_price: null,
          current_value_usd: null
        });
      }
    }
  }
  
  return { pairedTrades: allPairedTrades, openPositions };
}
