// ============================================================
// AGGREGATIONS
// ============================================================
// Aggregates trade-level data to token-level and overview-level
// Separates volume metrics from capital metrics
// Includes comprehensive verification
// ============================================================

// ============================================================
// TOKEN-LEVEL AGGREGATION
// ============================================================

export function aggregateToTokenLevel(pairedTrades, openPositions) {
  const tokenMap = new Map();
  const allTrades = [...pairedTrades, ...openPositions];
  
  for (const trade of allTrades) {
    if (!tokenMap.has(trade.token_address)) {
      tokenMap.set(trade.token_address, {
        token_address: trade.token_address,
        token_symbol: trade.token_symbol,
        total_trades: 0,
        closed_trades: 0,
        open_positions: 0,
        rugged_positions: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_invested: 0,
        total_returned: 0,
        total_realized_pnl: 0,
        total_unrealized_pnl: 0,
        total_confirmed_loss: 0,
        net_pnl: 0,
        avg_roi: 0,
        is_held: false,
        is_rugged: false,
        traded_rug_token: false,
        rug_flags: [],
        current_value_open_positions: 0
      });
    }
    
    const token = tokenMap.get(trade.token_address);
    token.total_trades++;
    token.total_invested += trade.entry_value_usd;
    
    if (trade.is_open) {
      token.open_positions++;
      token.is_held = true;
      
      // Add unrealized PnL and current value for open positions
      token.total_unrealized_pnl += trade.unrealized_pnl || 0;
      token.current_value_open_positions += trade.current_value_usd || 0;
      
      if (trade.is_rug) {
        token.rugged_positions++;
        token.total_confirmed_loss += trade.confirmed_loss;
        token.losing_trades++;
      }
    } else {
      token.closed_trades++;
      token.total_returned += trade.exit_value_usd;
      token.total_realized_pnl += trade.realized_pnl;
      
      if (trade.realized_pnl > 0) {
        token.winning_trades++;
      } else {
        token.losing_trades++;
      }
      
      if (trade.is_rug_now) {
        token.traded_rug_token = true;
        token.rug_flags.push('Traded token that later rugged');
      }
    }
    
    if (trade.is_rug || trade.is_rug_now) {
      token.is_rugged = true;
      if (trade.current_liquidity !== undefined) {
        token.rug_flags.push(`Low Liquidity ($${trade.current_liquidity.toFixed(2)})`);
      }
    }
  }
  
  // Calculate final metrics
  for (const token of tokenMap.values()) {
    token.net_pnl = token.total_realized_pnl - token.total_confirmed_loss;
    token.avg_roi = token.total_invested > 0 
      ? (token.net_pnl / token.total_invested) * 100 
      : 0;
    
    const totalDecided = token.winning_trades + token.losing_trades;
    token.win_rate = totalDecided > 0 
      ? (token.winning_trades / totalDecided) * 100 
      : 0;
    
    token.rug_flags = [...new Set(token.rug_flags)];
    
    // Calculate time metrics
    const tokenTrades = allTrades.filter(t => t.token_address === token.token_address);
    const timestamps = tokenTrades.map(t => t.entry_time).filter(t => t);
    if (timestamps.length > 0) {
      token.first_trade_time = Math.min(...timestamps);
      token.last_trade_time = Math.max(...timestamps);
      token.trading_window_hours = (token.last_trade_time - token.first_trade_time) / (1000 * 60 * 60);
    } else {
      token.first_trade_time = null;
      token.last_trade_time = null;
      token.trading_window_hours = 0;
    }
    
    // Calculate total hold time (sum of all holding periods)
    const closedTrades = pairedTrades.filter(t => t.token_address === token.token_address);
    const totalHoldingSeconds = closedTrades.reduce((sum, t) => sum + (t.holding_time_seconds || 0), 0);
    
    // Add active hold time for open positions (entry to now)
    const openTrades = openPositions.filter(t => t.token_address === token.token_address);
    const now = Date.now();
    const activeHoldingSeconds = openTrades.reduce((sum, t) => {
      if (t.entry_time) {
        return sum + ((now - t.entry_time) / 1000);
      }
      return sum;
    }, 0);
    
    token.total_holding_hours = (totalHoldingSeconds + activeHoldingSeconds) / 3600;
    token.avg_holding_hours = tokenTrades.length > 0 
      ? token.total_holding_hours / tokenTrades.length 
      : 0;
    
    // Token amounts (for display)
    token.total_token_amount_bought = tokenTrades.reduce((sum, t) => sum + (t.amount || 0), 0);
    token.total_token_amount_sold = closedTrades.reduce((sum, t) => sum + (t.amount || 0), 0);
  }
  
  return Array.from(tokenMap.values());
}

// ============================================================
// OVERVIEW-LEVEL AGGREGATION
// ============================================================

export function aggregateToOverview(pairedTrades, openPositions, tokens, capitalTracking) {
  const allTrades = [...pairedTrades, ...openPositions];
  const ruggedPositions = openPositions.filter(p => p.is_rug);
  
  // Volume metrics (NOT capital!)
  const simple_total_buys = allTrades.reduce((sum, t) => sum + t.entry_value_usd, 0);
  const simple_total_sells = pairedTrades.reduce((sum, t) => sum + t.exit_value_usd, 0);
  const volume_ratio = simple_total_sells / simple_total_buys;
  
  // Transaction counts
  const buy_count = allTrades.length; // All trades start with a buy
  const sell_count = pairedTrades.length; // Closed trades have sells
  const avg_buy_size = buy_count > 0 ? simple_total_buys / buy_count : 0;
  const avg_sell_size = sell_count > 0 ? simple_total_sells / sell_count : 0;
  
  // Capital metrics (ACCURATE)
  const total_realized_pnl = pairedTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
  const total_confirmed_loss = ruggedPositions.reduce((sum, p) => sum + p.confirmed_loss, 0);
  const net_pnl = total_realized_pnl - total_confirmed_loss;
  
  // Win rate (includes rugged as losses)
  const closed_winning = pairedTrades.filter(t => t.realized_pnl > 0).length;
  const closed_losing = pairedTrades.filter(t => t.realized_pnl < 0).length;
  const rugged_count = ruggedPositions.length;
  
  const total_winning = closed_winning;
  const total_losing = closed_losing + rugged_count;
  const win_rate = total_winning / (total_winning + total_losing) * 100;
  
  // Average trade ROI
  const total_roi = pairedTrades.reduce((sum, t) => sum + t.realized_roi, 0);
  const avg_roi = pairedTrades.length > 0 ? total_roi / pairedTrades.length : 0;
  
  // Verification (all methods should match net_pnl)
  const verification = {
    chronological_net_pnl_matches: Math.abs(capitalTracking.net_pnl - net_pnl) < 1,
    chronological_diff: capitalTracking.net_pnl - net_pnl
  };
  
  return {
    // Trade counts
    total_trades: allTrades.length,
    closed_trades: pairedTrades.length,
    open_positions: openPositions.length,
    rugged_positions: rugged_count,
    winning_trades: total_winning,
    losing_trades: total_losing,
    win_rate,
    
    // Volume metrics (activity tracking only - NOT capital!)
    volume_metrics: {
      total_buy_volume: simple_total_buys,
      total_sell_volume: simple_total_sells,
      volume_ratio,
      buy_count,
      sell_count,
      avg_buy_size,
      avg_sell_size,
      note: "Volume metrics track trading activity, not capital efficiency"
    },
    
    // Capital metrics (chronological tracking - ACCURATE)
    capital_metrics: {
      starting_capital: capitalTracking.starting_capital,
      peak_deployed: capitalTracking.peak_capital_deployed,
      final_capital: capitalTracking.final_capital,
      net_pnl: capitalTracking.net_pnl,
      wallet_growth_roi: capitalTracking.wallet_growth_roi,
      trading_performance_roi: capitalTracking.trading_performance_roi,
      total_gains: capitalTracking.total_gains,
      total_losses: capitalTracking.total_losses
    },
    
    // PnL breakdown
    total_realized_pnl,
    total_confirmed_loss,
    net_pnl,
    avg_roi,
    
    // Risk metrics
    rugged_tokens: tokens.filter(t => t.is_rugged).length,
    traded_rug_tokens: tokens.filter(t => t.traded_rug_token).length,
    
    // Verification
    verification
  };
}
