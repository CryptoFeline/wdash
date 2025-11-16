/**
 * Metrics Computation Service
 * 
 * Computes comprehensive trading metrics from reconstructed trades
 * per TARGET_ANALYSIS.md requirements:
 * - Win rate, PnL distributions
 * - Holding time analysis (winners vs losers)
 * - Entry/Exit skill scoring
 * - Market cap strategy analysis
 * - Scam token detection and filtering
 */

const scamDetection = require('./scamDetection');

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
    .filter(t => (t.max_potential_roi || 0) > 0)
    .map(t => {
      const potentialGain = t.max_potential_roi || 0;
      const actualGain = t.realized_roi || 0;
      
      // If they captured most of the potential, good entry
      return potentialGain > 0 ? (actualGain / potentialGain) : 0;
    });
  
  if (ratios.length === 0) return 50; // Neutral if no data
  
  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  
  // Also consider time to peak - early entries have longer time to peak
  const timeToPeakHours = trades
    .map(t => t.time_to_peak_hours || 0)
    .filter(h => h > 0);
    
  const avgTimeToPeak = timeToPeakHours.length > 0
    ? timeToPeakHours.reduce((sum, h) => sum + h, 0) / timeToPeakHours.length
    : 0;
  
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
    .filter(t => (t.max_price_during_hold || 0) > 0)
    .map(t => {
      const maxPrice = t.max_price_during_hold || 0;
      const exitPrice = t.exit_price || 0;
      const entryPrice = t.entry_price || 0;
      
      // Normalize: 0 = sold at entry, 1 = sold at peak
      const priceRange = maxPrice - entryPrice;
      if (priceRange <= 0) return 0;
      
      const realized = exitPrice - entryPrice;
      return realized / priceRange;
    });
  
  if (exitEfficiency.length === 0) return 50;
  
  const avgEfficiency = exitEfficiency.reduce((sum, e) => sum + e, 0) / exitEfficiency.length;
  
  // Penalize early exits
  const earlyExits = trades.filter(t => t.early_exit === true).length;
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
    // Return empty structure with all required fields initialized to safe defaults
    return {
      total_trades: 0,
      win_count: 0,
      loss_count: 0,
      win_rate: 0,
      total_realized_pnl: 0,
      avg_realized_roi: 0,
      median_realized_roi: 0,
      total_realized_pnl_wins: 0,
      total_realized_pnl_losses: 0,
      avg_holding_hours: 0,
      median_holding_hours: 0,
      avg_holding_hours_winners: 0,
      avg_holding_hours_losers: 0,
      median_max_potential_roi: 0,
      entry_skill_score: 0,
      exit_skill_score: 0,
      overall_skill_score: 0,
      copy_trade_rating: 'N/A',
      market_cap_strategy: {
        favorite_bracket: 0,
        success_by_bracket: []
      },
      scam_detection: {
        total_scam_tokens: 0,
        scam_participation_rate: 0,
        risk_level: 'N/A',
        warning: null
      }
    };
  }
  
  // Generate scam detection report
  const scamReport = scamDetection.generateScamReport(trades);
  
  // Use clean stats (excluding scam tokens) for metrics
  const validTrades = scamReport.trades.filter(t => !t.is_scam_token);
  
  // Basic counts (from clean trades)
  const totalTrades = validTrades.length;
  const winners = validTrades.filter(t => t.win);
  const losers = validTrades.filter(t => !t.win);
  const winCount = winners.length;
  const lossCount = losers.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  
  // PnL aggregates (from clean trades)
  const totalRealizedPnl = validTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalRealizedPnlWins = winners.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalRealizedPnlLosers = losers.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  
  // ROI stats (from clean trades, with outlier filtering)
  const rois = validTrades.map(t => t.realized_roi || 0);
  const avgRealizedRoi = rois.length > 0 
    ? rois.reduce((sum, roi) => sum + roi, 0) / rois.length 
    : 0;
  const medianRealizedRoi = calculateMedian(rois);
  
  // Holding time stats (from clean trades)
  const holdingHours = validTrades.map(t => t.holding_hours || 0);
  const avgHoldingHours = holdingHours.length > 0
    ? holdingHours.reduce((sum, h) => sum + h, 0) / holdingHours.length
    : 0;
  const medianHoldingHours = calculateMedian(holdingHours);
  
  const winnerHoldingHours = winners.map(t => t.holding_hours || 0);
  const loserHoldingHours = losers.map(t => t.holding_hours || 0);
  const avgHoldingHoursWinners = winnerHoldingHours.length > 0
    ? winnerHoldingHours.reduce((sum, h) => sum + h, 0) / winnerHoldingHours.length
    : 0;
  const avgHoldingHoursLosers = loserHoldingHours.length > 0
    ? loserHoldingHours.reduce((sum, h) => sum + h, 0) / loserHoldingHours.length
    : 0;
  
  // Max potential analysis - use safe defaults if fields are missing (from clean trades)
  const maxPotentialRois = validTrades
    .map(t => t.max_potential_roi || 0)
    .filter(roi => roi > 0);
  const medianMaxPotentialRoi = maxPotentialRois.length > 0 
    ? calculateMedian(maxPotentialRois)
    : 0;
  
  // Skill scores (from clean trades)
  const entrySkillScore = calculateEntrySkillScore(validTrades);
  const exitSkillScore = calculateExitSkillScore(validTrades);
  const overallSkillScore = Math.round((entrySkillScore + exitSkillScore) / 2);
  
  // Market cap strategy (from clean trades)
  const marketCapStrategy = analyzeMarketCapStrategy(validTrades);
  
  // Metrics object (clean stats)
  const metrics = {
    total_trades: totalTrades,
    win_count: winCount,
    loss_count: lossCount,
    win_rate: winRate,
    
    total_realized_pnl: totalRealizedPnl,
    avg_realized_roi: avgRealizedRoi,
    median_realized_roi: medianRealizedRoi,
    
    total_realized_pnl_wins: totalRealizedPnlWins,
    total_realized_pnl_losses: totalRealizedPnlLosers,
    
    avg_holding_hours: avgHoldingHours,
    median_holding_hours: medianHoldingHours,
    avg_holding_hours_winners: avgHoldingHoursWinners,
    avg_holding_hours_losers: avgHoldingHoursLosers,
    
    median_max_potential_roi: medianMaxPotentialRoi,
    
    entry_skill_score: entrySkillScore,
    exit_skill_score: exitSkillScore,
    overall_skill_score: overallSkillScore,
    
    market_cap_strategy: marketCapStrategy,
    
    // Scam detection results
    scam_detection: {
      total_scam_tokens: scamReport.scamDetection.totalScamTokens,
      scam_participation_rate: scamReport.scamDetection.scamParticipationRate,
      risk_level: scamReport.scamDetection.riskLevel,
      warning: scamReport.scamDetection.warning,
      scam_token_details: scamReport.scamDetection.scamTokenDetails
    },
    
    // Include raw stats for comparison (optional, can be removed if not needed in API)
    _raw_stats: scamReport.stats.raw,
    _clean_note: '✅ All metrics calculated from legitimate trades only (scam tokens excluded)'
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
