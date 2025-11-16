/**
 * Per-Token Aggregation Service
 * 
 * Aggregates FIFO-reconstructed trades by token for Advanced Analysis tab UI.
 * 
 * Provides both:
 * 1. Per-trade details (individual FIFO-matched buy→sell pairs)
 * 2. Per-token summaries (aggregated metrics for each token)
 * 
 * This ensures the UI can display:
 * - Detailed trade-by-trade breakdown
 * - Token-level performance summaries
 * - 7-day overview aggregates
 */

/**
 * Aggregate FIFO trades by token
 * 
 * @param {Array} fifoTrades - Array of FIFO-reconstructed trades
 * @returns {Array} Per-token aggregated summaries
 */
export function aggregateTradesByToken(fifoTrades) {
  if (!fifoTrades || fifoTrades.length === 0) {
    return [];
  }
  
  // Group trades by token address
  const tokenGroups = {};
  
  for (const trade of fifoTrades) {
    const tokenAddress = trade.token_address;
    
    if (!tokenGroups[tokenAddress]) {
      tokenGroups[tokenAddress] = {
        token_address: tokenAddress,
        token_symbol: trade.token_symbol,
        token_name: trade.token_name,
        logo_url: trade.logo_url,
        trades: [],
        
        // Aggregated metrics
        total_trades: 0,
        total_buy_volume: 0,
        total_sell_volume: 0,
        total_pnl: 0,
        total_roi_percent: 0,
        avg_entry_price: 0,
        avg_exit_price: 0,
        avg_holding_hours: 0,
        
        wins: 0,
        losses: 0,
        win_rate: 0,
        
        earliest_trade: null,
        latest_trade: null,
        
        // Risk
        max_risk_level: 0,
        is_risky: false
      };
    }
    
    const group = tokenGroups[tokenAddress];
    group.trades.push(trade);
  }
  
  // Calculate aggregated metrics for each token
  const tokenSummaries = [];
  
  for (const [tokenAddress, group] of Object.entries(tokenGroups)) {
    const trades = group.trades;
    const totalTrades = trades.length;
    
    // Calculate aggregates
    const totalBuyVolume = trades.reduce((sum, t) => sum + (t.entry_value || 0), 0);
    const totalSellVolume = trades.reduce((sum, t) => sum + (t.exit_value || 0), 0);
    const totalPnl = trades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    
    const avgEntryPrice = trades.reduce((sum, t) => sum + (t.entry_price || 0), 0) / totalTrades;
    const avgExitPrice = trades.reduce((sum, t) => sum + (t.exit_price || 0), 0) / totalTrades;
    const avgHoldingHours = trades.reduce((sum, t) => sum + (t.holding_hours || 0), 0) / totalTrades;
    
    const wins = trades.filter(t => t.win).length;
    const losses = totalTrades - wins;
    const winRate = (wins / totalTrades) * 100;
    
    const totalRoiPercent = totalBuyVolume > 0 ? ((totalSellVolume - totalBuyVolume) / totalBuyVolume * 100) : 0;
    
    // Find earliest and latest trades
    const sortedByEntry = [...trades].sort((a, b) => a.entry_timestamp - b.entry_timestamp);
    const earliestTrade = sortedByEntry[0];
    const latestTrade = sortedByEntry[sortedByEntry.length - 1];
    
    // Risk assessment
    const maxRiskLevel = Math.max(...trades.map(t => t.risk_level || 0));
    const isRisky = maxRiskLevel >= 4 || trades.some(t => t.is_risky);
    
    tokenSummaries.push({
      token_address: tokenAddress,
      token_symbol: group.token_symbol,
      token_name: group.token_name,
      logo_url: group.logo_url,
      
      // Trade details (for drill-down)
      trades: trades,
      
      // Aggregated metrics
      total_trades: totalTrades,
      total_buy_volume: totalBuyVolume,
      total_sell_volume: totalSellVolume,
      total_pnl: totalPnl,
      total_roi_percent: totalRoiPercent,
      
      avg_entry_price: avgEntryPrice,
      avg_exit_price: avgExitPrice,
      avg_holding_hours: avgHoldingHours,
      
      wins: wins,
      losses: losses,
      win_rate: winRate,
      
      earliest_trade_timestamp: earliestTrade.entry_timestamp,
      latest_trade_timestamp: latestTrade.exit_timestamp,
      
      // Risk
      max_risk_level: maxRiskLevel,
      is_risky: isRisky
    });
  }
  
  // Sort by total PnL descending (best performers first)
  return tokenSummaries.sort((a, b) => b.total_pnl - a.total_pnl);
}

/**
 * Create 7-day overview summary from FIFO trades
 * 
 * @param {Array} fifoTrades - Array of FIFO-reconstructed trades
 * @param {Array} openPositions - Array of open positions
 * @returns {Object} 7-day overview metrics
 */
export function create7DayOverview(fifoTrades, openPositions = []) {
  const closedTrades = fifoTrades || [];
  const open = openPositions || [];
  
  // Calculate date range
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  // Filter trades from last 7 days
  const recent7d = closedTrades.filter(t => 
    t.exit_timestamp && t.exit_timestamp >= sevenDaysAgo
  );
  
  const totalTrades = recent7d.length;
  const wins = recent7d.filter(t => t.win).length;
  const losses = totalTrades - wins;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
  
  const totalPnl = recent7d.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalBuyVolume = recent7d.reduce((sum, t) => sum + (t.entry_value || 0), 0);
  const totalSellVolume = recent7d.reduce((sum, t) => sum + (t.exit_value || 0), 0);
  const totalRoi = totalBuyVolume > 0 ? ((totalSellVolume - totalBuyVolume) / totalBuyVolume * 100) : 0;
  
  // Unique tokens traded
  const uniqueTokens = new Set(recent7d.map(t => t.token_address)).size;
  
  // Open positions value
  const openPositionsValue = open.reduce((sum, p) => sum + (p.entry_value || 0), 0);
  const openPositionsCount = open.length;
  
  // Daily breakdown
  const dailyBreakdown = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - (i * 24 * 60 * 60 * 1000);
    const dayEnd = dayStart + (24 * 60 * 60 * 1000);
    
    const dayTrades = recent7d.filter(t => 
      t.exit_timestamp >= dayStart && t.exit_timestamp < dayEnd
    );
    
    const dayPnl = dayTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const dayWins = dayTrades.filter(t => t.win).length;
    
    dailyBreakdown.push({
      date: new Date(dayStart).toISOString().split('T')[0],
      trades: dayTrades.length,
      wins: dayWins,
      losses: dayTrades.length - dayWins,
      pnl: dayPnl
    });
  }
  
  return {
    period: '7d',
    total_trades: totalTrades,
    wins: wins,
    losses: losses,
    win_rate: winRate,
    
    total_pnl: totalPnl,
    total_buy_volume: totalBuyVolume,
    total_sell_volume: totalSellVolume,
    total_roi_percent: totalRoi,
    
    unique_tokens: uniqueTokens,
    
    open_positions_count: openPositionsCount,
    open_positions_value: openPositionsValue,
    
    daily_breakdown: dailyBreakdown
  };
}

/**
 * Format FIFO trades for Advanced Analysis tab display
 * 
 * Returns structured data optimized for UI rendering:
 * - Per-trade details (for detailed view)
 * - Per-token summaries (for token-level view)
 * - 7-day overview (for dashboard cards)
 * 
 * @param {Array} fifoTrades - FIFO-reconstructed closed trades
 * @param {Array} openPositions - Open positions
 * @returns {Object} Formatted data for Advanced Analysis tab
 */
export function formatForAdvancedAnalysis(fifoTrades, openPositions = []) {
  const closedTrades = fifoTrades || [];
  const open = openPositions || [];
  
  // Aggregate by token
  const perTokenSummaries = aggregateTradesByToken(closedTrades);
  
  // Create 7-day overview
  const overview7d = create7DayOverview(closedTrades, open);
  
  // Per-trade details (limited to most recent 100 for UI performance)
  const recentTrades = [...closedTrades]
    .sort((a, b) => b.exit_timestamp - a.exit_timestamp)
    .slice(0, 100);
  
  return {
    // Overview metrics (for dashboard cards)
    overview: overview7d,
    
    // Per-token summaries (for token table view)
    tokens: perTokenSummaries,
    
    // Per-trade details (for detailed trade list)
    trades: recentTrades,
    
    // Open positions
    open_positions: open,
    
    // Metadata
    total_closed_trades: closedTrades.length,
    total_tokens_traded: perTokenSummaries.length,
    total_open_positions: open.length,
    
    // Data source info
    data_source: 'OKX Endpoint #7 (individual transactions)',
    reconstruction_method: 'FIFO',
    last_updated: new Date().toISOString()
  };
}

export default {
  aggregateTradesByToken,
  create7DayOverview,
  formatForAdvancedAnalysis
};
