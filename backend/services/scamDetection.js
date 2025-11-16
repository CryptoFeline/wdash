/**
 * Scam Token Detection Service
 * 
 * Identifies low-liquidity scam tokens that inflate PnL metrics with unrealizable gains.
 * Based on OKX validation test results showing 56% scam participation in test wallet.
 */

// Threshold for minimum acceptable liquidity (in USD)
const MIN_LIQUIDITY_THRESHOLD = 1000; // $1000

// Maximum ROI to include in average calculations (prevents billion% outliers)
const MAX_ROI_FOR_AVERAGE = 10000; // 10,000%

/**
 * Detect if a trade is a scam token
 * 
 * Scam tokens are characterized by:
 * 1. Very low liquidity (<$1000) - cannot be sold
 * 2. Open position (still holding) - never exited
 * 3. Often shows inflated unrealized PnL that can never be realized
 * 
 * @param {Object} trade - Trade object with liquidity and position data
 * @returns {boolean} - True if scam token detected
 */
function isScamToken(trade) {
  // Support both field names: liquidity (validation test) and liquidity_usd (tokenOverviewService)
  const liquidity = trade.liquidity_usd || trade.liquidity || 0;
  const isOpen = trade.open_position === true;
  
  // Flag as scam if:
  // - Very low liquidity (< $1000) AND
  // - Open position (still holding, never sold)
  // 
  // This indicates a token that appears valuable but cannot be sold
  if (isOpen && liquidity < MIN_LIQUIDITY_THRESHOLD) {
    return true;
  }
  
  return false;
}

/**
 * Analyze trades and separate scam tokens from legitimate trades
 * 
 * @param {Array} trades - Array of trade objects
 * @returns {Object} - Analysis with scam detection results
 */
function analyzeScamTokens(trades) {
  // Flag each trade
  const flaggedTrades = trades.map(trade => ({
    ...trade,
    is_scam_token: isScamToken(trade)
  }));
  
  // Separate scam and legitimate trades
  const scamTokens = flaggedTrades.filter(t => t.is_scam_token);
  const legitimateTrades = flaggedTrades.filter(t => !t.is_scam_token);
  
  // Calculate participation rate
  const scamParticipationRate = trades.length > 0 
    ? (scamTokens.length / trades.length) * 100 
    : 0;
  
  // Risk level based on participation rate
  let riskLevel = 'LOW';
  if (scamParticipationRate > 50) riskLevel = 'CRITICAL';
  else if (scamParticipationRate > 30) riskLevel = 'HIGH';
  else if (scamParticipationRate > 10) riskLevel = 'MODERATE';
  
  return {
    allTrades: flaggedTrades,
    scamTokens,
    legitimateTrades,
    scamCount: scamTokens.length,
    legitimateCount: legitimateTrades.length,
    scamParticipationRate: parseFloat(scamParticipationRate.toFixed(2)),
    riskLevel,
    warning: scamParticipationRate > 30 
      ? `⚠️ ${scamTokens.length} scam tokens detected - ${scamParticipationRate.toFixed(2)}% participation rate` 
      : null
  };
}

/**
 * Calculate statistics excluding scam tokens
 * 
 * @param {Array} trades - Array of trade objects (flagged with is_scam_token)
 * @returns {Object} - Clean stats excluding scam tokens
 */
function calculateCleanStats(trades) {
  const validTrades = trades.filter(t => !t.is_scam_token);
  const closedTrades = validTrades.filter(t => !t.open_position);
  
  const wins = closedTrades.filter(t => t.win);
  const losses = closedTrades.filter(t => !t.win);
  
  // Filter outliers for average calculation
  const validWins = wins.filter(t => t.realized_roi <= MAX_ROI_FOR_AVERAGE);
  const extremeWins = wins.filter(t => t.realized_roi > MAX_ROI_FOR_AVERAGE);
  
  const totalRealizedPnl = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  
  const avgWinSize = validWins.length > 0 
    ? validWins.reduce((sum, t) => sum + t.realized_roi, 0) / validWins.length 
    : 0;
    
  const avgWinSizeWithOutliers = wins.length > 0 
    ? wins.reduce((sum, t) => sum + t.realized_roi, 0) / wins.length 
    : 0;
    
  const avgLossSize = losses.length > 0 
    ? losses.reduce((sum, t) => sum + Math.abs(t.realized_roi), 0) / losses.length 
    : 0;
  
  const winRate = closedTrades.length > 0 
    ? (wins.length / closedTrades.length) * 100 
    : 0;
  
  return {
    totalTrades: validTrades.length,
    closedTrades: closedTrades.length,
    openPositions: validTrades.filter(t => t.open_position).length,
    wins: wins.length,
    losses: losses.length,
    winRate: parseFloat(winRate.toFixed(2)),
    totalRealizedPnl: parseFloat(totalRealizedPnl.toFixed(2)),
    avgWinSize: parseFloat(avgWinSize.toFixed(2)),
    avgWinSizeWithOutliers: parseFloat(avgWinSizeWithOutliers.toFixed(2)),
    outliersExcluded: extremeWins.length,
    avgLossSize: parseFloat(avgLossSize.toFixed(2))
  };
}

/**
 * Calculate statistics including scam tokens (for comparison)
 * 
 * @param {Array} trades - Array of all trades
 * @returns {Object} - Raw stats including scam tokens
 */
function calculateRawStats(trades) {
  const closedTrades = trades.filter(t => !t.open_position);
  
  const wins = closedTrades.filter(t => t.win);
  const losses = closedTrades.filter(t => !t.win);
  
  // Filter outliers for average calculation
  const validWins = wins.filter(t => t.realized_roi <= MAX_ROI_FOR_AVERAGE);
  const extremeWins = wins.filter(t => t.realized_roi > MAX_ROI_FOR_AVERAGE);
  
  const totalRealizedPnl = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  
  const avgWinSize = validWins.length > 0 
    ? validWins.reduce((sum, t) => sum + t.realized_roi, 0) / validWins.length 
    : 0;
    
  const avgWinSizeWithOutliers = wins.length > 0 
    ? wins.reduce((sum, t) => sum + t.realized_roi, 0) / wins.length 
    : 0;
    
  const avgLossSize = losses.length > 0 
    ? losses.reduce((sum, t) => sum + Math.abs(t.realized_roi), 0) / losses.length 
    : 0;
  
  const winRate = closedTrades.length > 0 
    ? (wins.length / closedTrades.length) * 100 
    : 0;
  
  return {
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    openPositions: trades.filter(t => t.open_position).length,
    wins: wins.length,
    losses: losses.length,
    winRate: parseFloat(winRate.toFixed(2)),
    totalRealizedPnl: parseFloat(totalRealizedPnl.toFixed(2)),
    avgWinSize: parseFloat(avgWinSize.toFixed(2)),
    avgWinSizeWithOutliers: parseFloat(avgWinSizeWithOutliers.toFixed(2)),
    outliersExcluded: extremeWins.length,
    avgLossSize: parseFloat(avgLossSize.toFixed(2))
  };
}

/**
 * Generate comprehensive scam detection report
 * 
 * @param {Array} trades - Array of trade objects with liquidity data
 * @returns {Object} - Complete analysis with scam detection and dual stats
 */
function generateScamReport(trades) {
  // Analyze scam tokens
  const scamAnalysis = analyzeScamTokens(trades);
  
  // Calculate stats
  const rawStats = calculateRawStats(scamAnalysis.allTrades);
  const cleanStats = calculateCleanStats(scamAnalysis.allTrades);
  
  return {
    scamDetection: {
      totalScamTokens: scamAnalysis.scamCount,
      scamParticipationRate: scamAnalysis.scamParticipationRate,
      riskLevel: scamAnalysis.riskLevel,
      warning: scamAnalysis.warning,
      scamTokenDetails: scamAnalysis.scamTokens.map(t => ({
        symbol: t.symbol || t.token_symbol,
        token: t.token || t.token_address,
        liquidity: t.liquidity_usd || t.liquidity || 0,
        unrealized_pnl: t.unrealized_pnl,
        rug_score: t.rug_score
      }))
    },
    stats: {
      raw: {
        ...rawStats,
        note: '⚠️ INCLUDES SCAM TOKENS - STATS MAY BE INFLATED'
      },
      clean: {
        ...cleanStats,
        note: '✅ EXCLUDES SCAM TOKENS - TRUE PERFORMANCE'
      }
    },
    trades: scamAnalysis.allTrades
  };
}

export {
  isScamToken,
  analyzeScamTokens,
  calculateCleanStats,
  calculateRawStats,
  generateScamReport,
  MIN_LIQUIDITY_THRESHOLD,
  MAX_ROI_FOR_AVERAGE
};
