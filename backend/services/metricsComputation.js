/**
 * Metrics Computation Service
 * 
 * Computes comprehensive trading metrics from reconstructed trades
 * per TARGET_ANALYSIS.md requirements:
 * - Win rate, PnL distributions
 * - Holding time analysis (winners vs losers)
 * - Entry/Exit skill scoring
 * - Market cap strategy analysis
 */

/**
 * Calculate median value from array
 */
function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate entry skill score (0-100)
 * 
 * Measures how early the trader enters relative to peak price.
 * Higher score = better entry timing (entered early before pump)
 * 
 * @param {Array} trades - Reconstructed trades with price history
 * @returns {number} Score from 0-100
 */
export function calculateEntrySkillScore(trades) {
  if (trades.length === 0) return 0;
  
  // Calculate what % of max potential was realized on average
  const ratios = trades
    .filter(t => t.max_potential_roi > 0)
    .map(t => {
      const potentialGain = t.max_potential_roi;
      const actualGain = t.realized_roi;
      
      // If they captured most of the potential, good entry
      return potentialGain > 0 ? (actualGain / potentialGain) : 0;
    });
  
  if (ratios.length === 0) return 50; // Neutral if no data
  
  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  
  // Also consider time to peak - early entries have longer time to peak
  const avgTimeToPeak = trades
    .filter(t => t.time_to_peak_hours > 0)
    .reduce((sum, t) => sum + t.time_to_peak_hours, 0) / Math.max(trades.length, 1);
  
  // Score: 50% based on realized/potential ratio, 50% on early entry timing
  const ratioScore = Math.min(avgRatio * 100, 100);
  const timingScore = Math.min((avgTimeToPeak / 24) * 100, 100); // Longer time = earlier entry
  
  return Math.round((ratioScore * 0.5 + timingScore * 0.5));
}

/**
 * Calculate exit skill score (0-100)
 * 
 * Measures how close to peak price the trader exits.
 * Higher score = better exit timing (sold near peak)
 * 
 * @param {Array} trades - Reconstructed trades with price history
 * @returns {number} Score from 0-100
 */
export function calculateExitSkillScore(trades) {
  if (trades.length === 0) return 0;
  
  // How close to max price did they sell?
  const exitEfficiency = trades
    .filter(t => t.max_price_during_hold > 0)
    .map(t => {
      const maxPrice = t.max_price_during_hold;
      const exitPrice = t.exit_price;
      const entryPrice = t.entry_price;
      
      // Normalize: 0 = sold at entry, 1 = sold at peak
      const priceRange = maxPrice - entryPrice;
      if (priceRange <= 0) return 0;
      
      const realized = exitPrice - entryPrice;
      return realized / priceRange;
    });
  
  if (exitEfficiency.length === 0) return 50;
  
  const avgEfficiency = exitEfficiency.reduce((sum, e) => sum + e, 0) / exitEfficiency.length;
  
  // Penalize early exits
  const earlyExits = trades.filter(t => t.early_exit).length;
  const earlyExitPenalty = (earlyExits / trades.length) * 20; // Max 20 point penalty
  
  const score = Math.max(0, Math.min(100, avgEfficiency * 100 - earlyExitPenalty));
  return Math.round(score);
}

/**
 * Determine copy trading rating based on metrics
 * 
 * @param {Object} metrics - Computed metrics
 * @returns {string} "Excellent" | "Good" | "Fair" | "Poor"
 */
export function getCopyTradeRating(metrics) {
  const { win_rate, avg_realized_roi, median_max_potential_roi, entry_skill_score } = metrics;
  
  // Excellent: High win rate + good ROI + high potential + good entry skill
  if (win_rate >= 70 && avg_realized_roi >= 30 && median_max_potential_roi >= 50 && entry_skill_score >= 70) {
    return 'Excellent';
  }
  
  // Good: Decent metrics across the board
  if (win_rate >= 60 && avg_realized_roi >= 20 && entry_skill_score >= 60) {
    return 'Good';
  }
  
  // Fair: Mixed results
  if (win_rate >= 50 || avg_realized_roi >= 10) {
    return 'Fair';
  }
  
  return 'Poor';
}

/**
 * Analyze market cap strategy preferences
 * 
 * @param {Array} trades - Reconstructed trades
 * @returns {Object} Market cap strategy analysis
 */
export function analyzeMarketCapStrategy(trades) {
  const bracketNames = ['<$100k', '$100k-$1M', '$1M-$10M', '$10M-$100M', '>$100M'];
  const bracketStats = {
    0: { count: 0, wins: 0, totalRoi: 0 },
    1: { count: 0, wins: 0, totalRoi: 0 },
    2: { count: 0, wins: 0, totalRoi: 0 },
    3: { count: 0, wins: 0, totalRoi: 0 },
    4: { count: 0, wins: 0, totalRoi: 0 }
  };
  
  // Aggregate by bracket
  for (const trade of trades) {
    const bracket = Math.max(0, Math.min(4, trade.mcap_bracket || 0));
    bracketStats[bracket].count++;
    if (trade.win) bracketStats[bracket].wins++;
    bracketStats[bracket].totalRoi += trade.realized_roi;
  }
  
  // Find favorite bracket (most trades)
  let favoriteBracket = 0;
  let maxCount = 0;
  for (let i = 0; i < 5; i++) {
    if (bracketStats[i].count > maxCount) {
      maxCount = bracketStats[i].count;
      favoriteBracket = i;
    }
  }
  
  // Compute success by bracket
  const successByBracket = [];
  for (let i = 0; i < 5; i++) {
    const stats = bracketStats[i];
    successByBracket.push({
      bracket: bracketNames[i],
      win_rate: stats.count > 0 ? (stats.wins / stats.count) * 100 : 0,
      avg_roi: stats.count > 0 ? stats.totalRoi / stats.count : 0,
      trade_count: stats.count
    });
  }
  
  return {
    favorite_bracket: favoriteBracket,
    success_by_bracket: successByBracket
  };
}

/**
 * Compute comprehensive trading metrics from reconstructed trades
 * 
 * @param {Array} trades - Array of reconstructed trade objects
 * @returns {Object} WalletAnalysisMetrics
 */
export function computeMetrics(trades) {
  if (!trades || trades.length === 0) {
    return null;
  }
  
  // Basic counts
  const totalTrades = trades.length;
  const winners = trades.filter(t => t.win);
  const losers = trades.filter(t => !t.win);
  const winCount = winners.length;
  const lossCount = losers.length;
  const winRate = (winCount / totalTrades) * 100;
  
  // PnL aggregates
  const totalRealizedPnl = trades.reduce((sum, t) => sum + t.realized_pnl, 0);
  const totalRealizedPnlWins = winners.reduce((sum, t) => sum + t.realized_pnl, 0);
  const totalRealizedPnlLosses = losers.reduce((sum, t) => sum + t.realized_pnl, 0);
  
  // ROI stats
  const rois = trades.map(t => t.realized_roi);
  const avgRealizedRoi = rois.reduce((sum, roi) => sum + roi, 0) / totalTrades;
  const medianRealizedRoi = calculateMedian(rois);
  
  // Holding time stats
  const holdingHours = trades.map(t => t.holding_hours);
  const avgHoldingHours = holdingHours.reduce((sum, h) => sum + h, 0) / totalTrades;
  const medianHoldingHours = calculateMedian(holdingHours);
  
  const winnerHoldingHours = winners.map(t => t.holding_hours);
  const loserHoldingHours = losers.map(t => t.holding_hours);
  const avgHoldingHoursWinners = winnerHoldingHours.length > 0
    ? winnerHoldingHours.reduce((sum, h) => sum + h, 0) / winnerHoldingHours.length
    : 0;
  const avgHoldingHoursLosers = loserHoldingHours.length > 0
    ? loserHoldingHours.reduce((sum, h) => sum + h, 0) / loserHoldingHours.length
    : 0;
  
  // Max potential analysis
  const maxPotentialRois = trades
    .filter(t => t.max_potential_roi !== undefined)
    .map(t => t.max_potential_roi);
  const medianMaxPotentialRoi = maxPotentialRois.length > 0 
    ? calculateMedian(maxPotentialRois)
    : 0;
  
  // Skill scores
  const entrySkillScore = calculateEntrySkillScore(trades);
  const exitSkillScore = calculateExitSkillScore(trades);
  const overallSkillScore = Math.round((entrySkillScore + exitSkillScore) / 2);
  
  // Market cap strategy
  const marketCapStrategy = analyzeMarketCapStrategy(trades);
  
  // Metrics object
  const metrics = {
    total_trades: totalTrades,
    win_count: winCount,
    loss_count: lossCount,
    win_rate: winRate,
    
    total_realized_pnl: totalRealizedPnl,
    avg_realized_roi: avgRealizedRoi,
    median_realized_roi: medianRealizedRoi,
    
    total_realized_pnl_wins: totalRealizedPnlWins,
    total_realized_pnl_losses: totalRealizedPnlLosses,
    
    avg_holding_hours: avgHoldingHours,
    median_holding_hours: medianHoldingHours,
    avg_holding_hours_winners: avgHoldingHoursWinners,
    avg_holding_hours_losers: avgHoldingHoursLosers,
    
    median_max_potential_roi: medianMaxPotentialRoi,
    
    entry_skill_score: entrySkillScore,
    exit_skill_score: exitSkillScore,
    overall_skill_score: overallSkillScore,
    
    market_cap_strategy: marketCapStrategy
  };
  
  // Copy trade rating
  metrics.copy_trade_rating = getCopyTradeRating(metrics);
  
  return metrics;
}

export default {
  computeMetrics,
  calculateEntrySkillScore,
  calculateExitSkillScore,
  getCopyTradeRating,
  analyzeMarketCapStrategy
};
