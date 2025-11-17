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
        total_confirmed_loss: 0,
        net_pnl: 0,
        avg_roi: 0,
        is_held: false,
        is_rugged: false,
        traded_rug_token: false,
        rug_flags: []
      });
    }
    
    const token = tokenMap.get(trade.token_address);
    token.total_trades++;
    token.total_invested += trade.entry_value_usd;
    
    if (trade.is_open) {
      token.open_positions++;
      token.is_held = true;
      
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
