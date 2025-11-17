// ============================================================
// CHRONOLOGICAL CAPITAL TRACKING
// ============================================================
// Tracks capital deployment through FIFO timeline
// Reveals TRUE capital requirements vs misleading volume sums
// Calculates wallet growth ROI and trading performance ROI
// ============================================================

export function trackCapitalChronologically(pairedTrades, openPositions) {
  // Combine all transactions into timeline
  const allTransactions = [];
  
  for (const trade of pairedTrades) {
    allTransactions.push({
      time: trade.entry_time,
      type: 'BUY',
      amount: trade.entry_value_usd,
      token: trade.token_symbol,
      trade_ref: trade
    });
    allTransactions.push({
      time: trade.exit_time,
      type: 'SELL',
      amount: trade.exit_value_usd,
      pnl: trade.realized_pnl,
      token: trade.token_symbol,
      trade_ref: trade
    });
  }
  
  for (const position of openPositions) {
    allTransactions.push({
      time: position.entry_time,
      type: 'BUY',
      amount: position.entry_value_usd,
      token: position.token_symbol,
      trade_ref: position
    });
  }
  
  // Sort chronologically
  allTransactions.sort((a, b) => a.time - b.time);
  
  let starting_capital = 0;
  let current_capital = 0;
  let peak_capital = 0;
  let capital_deployed = 0;
  let total_gains = 0;
  let total_losses = 0;
  
  const timeline = [];
  
  for (const tx of allTransactions) {
    if (tx.type === 'BUY') {
      const needed_capital = tx.amount;
      
      // Deploy fresh capital if current balance insufficient
      if (current_capital < needed_capital) {
        const fresh_capital_needed = needed_capital - current_capital;
        starting_capital += fresh_capital_needed;
        capital_deployed = Math.max(capital_deployed, starting_capital);
        current_capital += fresh_capital_needed;
      }
      
      current_capital -= needed_capital;
      
      timeline.push({
        time: tx.time,
        type: 'BUY',
        token: tx.token,
        amount: needed_capital,
        capital_before: current_capital + needed_capital,
        capital_after: current_capital,
        starting_capital,
        capital_deployed
      });
      
    } else if (tx.type === 'SELL') {
      // Return capital + profit to balance
      current_capital += tx.amount;
      
      if (tx.pnl > 0) {
        total_gains += tx.pnl;
      } else if (tx.pnl < 0) {
        total_losses += Math.abs(tx.pnl);
      }
      
      peak_capital = Math.max(peak_capital, current_capital);
      
      timeline.push({
        time: tx.time,
        type: 'SELL',
        token: tx.token,
        amount: tx.amount,
        pnl: tx.pnl,
        capital_before: current_capital - tx.amount,
        capital_after: current_capital,
        total_gains,
        total_losses,
        peak_capital
      });
    }
  }
  
  // Account for rugged positions (confirmed losses)
  const ruggedPositions = openPositions.filter(p => p.is_rug);
  const rugged_capital = ruggedPositions.reduce((sum, p) => sum + p.confirmed_loss, 0);
  total_losses += rugged_capital;
  
  const final_capital = current_capital - rugged_capital;
  
  return {
    starting_capital,
    peak_capital_deployed: capital_deployed,
    current_liquid_capital: current_capital,
    rugged_capital,
    final_capital,
    total_gains,
    total_losses,
    net_pnl: total_gains - total_losses,
    wallet_growth_roi: (final_capital - starting_capital) / starting_capital * 100,
    trading_performance_roi: (total_gains - total_losses) / starting_capital * 100,
    timeline
  };
}
