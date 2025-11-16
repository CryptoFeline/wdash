/**
 * Token Diversity Metrics Service
 * 
 * Calculates portfolio diversification metrics from trading history
 * to assess concentration risk and trading breadth.
 */

/**
 * Calculate token diversity metrics from trades
 * @param {Array} trades - Array of trade objects with token_address and realized_pnl
 * @returns {Object} Diversity metrics
 */
export function calculateDiversityMetrics(trades) {
  if (!trades || trades.length === 0) {
    return {
      total_unique_tokens: 0,
      token_concentration_index: 0,
      top_token_pnl_percent: 0,
      top_3_tokens_pnl_percent: 0,
      top_5_tokens_pnl_percent: 0,
      avg_trades_per_token: 0,
      tokens_with_single_trade: 0,
      tokens_with_multiple_trades: 0,
      most_traded_tokens: [],
      concentration_rating: 'N/A'
    };
  }
  
  // Group trades by token
  const tokenStats = new Map();
  
  trades.forEach(trade => {
    const tokenAddress = trade.token_address;
    if (!tokenStats.has(tokenAddress)) {
      tokenStats.set(tokenAddress, {
        symbol: trade.token_symbol || 'Unknown',
        address: tokenAddress,
        tradeCount: 0,
        totalPnl: 0,
        wins: 0,
        losses: 0,
        totalRoi: 0
      });
    }
    
    const stats = tokenStats.get(tokenAddress);
    stats.tradeCount++;
    stats.totalPnl += trade.realized_pnl || 0;
    stats.totalRoi += trade.realized_roi || 0;
    if (trade.win) {
      stats.wins++;
    } else {
      stats.losses++;
    }
  });
  
  const totalUniqueTokens = tokenStats.size;
  
  // Calculate total absolute PnL (for concentration calculations)
  const totalAbsolutePnl = Array.from(tokenStats.values())
    .reduce((sum, stats) => sum + Math.abs(stats.totalPnl), 0);
  
  // Sort tokens by total PnL (descending)
  const tokensByPnl = Array.from(tokenStats.values())
    .sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl));
  
  // Calculate top token percentages
  const topTokenPnl = tokensByPnl.length > 0 ? Math.abs(tokensByPnl[0].totalPnl) : 0;
  const top3TokensPnl = tokensByPnl.slice(0, 3).reduce((sum, t) => sum + Math.abs(t.totalPnl), 0);
  const top5TokensPnl = tokensByPnl.slice(0, 5).reduce((sum, t) => sum + Math.abs(t.totalPnl), 0);
  
  const topTokenPercent = totalAbsolutePnl > 0 ? (topTokenPnl / totalAbsolutePnl) * 100 : 0;
  const top3TokensPercent = totalAbsolutePnl > 0 ? (top3TokensPnl / totalAbsolutePnl) * 100 : 0;
  const top5TokensPercent = totalAbsolutePnl > 0 ? (top5TokensPnl / totalAbsolutePnl) * 100 : 0;
  
  // Calculate Herfindahl-Hirschman Index (HHI) for concentration
  // HHI = sum of squared market shares (0 = perfect diversity, 10000 = monopoly)
  const hhi = Array.from(tokenStats.values())
    .map(stats => {
      const share = totalAbsolutePnl > 0 ? (Math.abs(stats.totalPnl) / totalAbsolutePnl) * 100 : 0;
      return share * share;
    })
    .reduce((sum, sq) => sum + sq, 0);
  
  // Count tokens by trade frequency
  const singleTradeTokens = Array.from(tokenStats.values()).filter(t => t.tradeCount === 1).length;
  const multiTradeTokens = totalUniqueTokens - singleTradeTokens;
  
  // Average trades per token
  const avgTradesPerToken = totalUniqueTokens > 0 ? trades.length / totalUniqueTokens : 0;
  
  // Sort by trade count for most traded
  const mostTradedTokens = Array.from(tokenStats.values())
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 10)
    .map(stats => ({
      symbol: stats.symbol,
      address: stats.address,
      trade_count: stats.tradeCount,
      total_pnl: stats.totalPnl,
      avg_roi: stats.tradeCount > 0 ? stats.totalRoi / stats.tradeCount : 0,
      win_rate: stats.tradeCount > 0 ? (stats.wins / stats.tradeCount) * 100 : 0
    }));
  
  // Determine concentration rating
  let concentrationRating = 'Diversified';
  if (hhi > 2500) {
    concentrationRating = 'Highly Concentrated';
  } else if (hhi > 1500) {
    concentrationRating = 'Moderately Concentrated';
  } else if (hhi > 1000) {
    concentrationRating = 'Slightly Concentrated';
  }
  
  return {
    total_unique_tokens: totalUniqueTokens,
    token_concentration_index: Math.round(hhi),
    top_token_pnl_percent: topTokenPercent,
    top_3_tokens_pnl_percent: top3TokensPercent,
    top_5_tokens_pnl_percent: top5TokensPercent,
    avg_trades_per_token: avgTradesPerToken,
    tokens_with_single_trade: singleTradeTokens,
    tokens_with_multiple_trades: multiTradeTokens,
    most_traded_tokens: mostTradedTokens,
    concentration_rating: concentrationRating
  };
}

/**
 * Calculate temporal diversity (tokens traded per time period)
 * @param {Array} trades - Trades with entry_timestamp
 * @returns {Object} Temporal diversity metrics
 */
export function calculateTemporalDiversity(trades) {
  if (!trades || trades.length === 0) {
    return {
      avg_tokens_per_day: 0,
      avg_tokens_per_week: 0,
      avg_tokens_per_month: 0,
      trading_days: 0,
      tokens_per_day_distribution: []
    };
  }
  
  // Group by day
  const tokensByDay = new Map();
  
  trades.forEach(trade => {
    if (!trade.entry_timestamp) return;
    
    const date = new Date(trade.entry_timestamp);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!tokensByDay.has(dayKey)) {
      tokensByDay.set(dayKey, new Set());
    }
    
    tokensByDay.get(dayKey).add(trade.token_address);
  });
  
  const tradingDays = tokensByDay.size;
  
  if (tradingDays === 0) {
    return {
      avg_tokens_per_day: 0,
      avg_tokens_per_week: 0,
      avg_tokens_per_month: 0,
      trading_days: 0,
      tokens_per_day_distribution: []
    };
  }
  
  // Calculate averages
  const tokensPerDayArray = Array.from(tokensByDay.values()).map(set => set.size);
  const totalTokensTraded = tokensPerDayArray.reduce((sum, count) => sum + count, 0);
  
  const avgTokensPerDay = totalTokensTraded / tradingDays;
  const avgTokensPerWeek = avgTokensPerDay * 7;
  const avgTokensPerMonth = avgTokensPerDay * 30;
  
  return {
    avg_tokens_per_day: avgTokensPerDay,
    avg_tokens_per_week: avgTokensPerWeek,
    avg_tokens_per_month: avgTokensPerMonth,
    trading_days: tradingDays,
    tokens_per_day_distribution: tokensPerDayArray
  };
}

export default {
  calculateDiversityMetrics,
  calculateTemporalDiversity
};
