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
 * Generate comprehensive scam detection report
 * 
 * @param {Array} trades - Array of trade objects with liquidity data
 * @returns {Object} - Complete analysis with scam detection
 */
function generateScamReport(trades) {
  // Analyze scam tokens
  const scamAnalysis = analyzeScamTokens(trades);
  
  // Don't calculate stats here - that's done in metricsComputation.js
  // Just return the scam detection analysis
  
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
    trades: scamAnalysis.allTrades
  };
}

export {
  isScamToken,
  analyzeScamTokens,
  generateScamReport,
  MIN_LIQUIDITY_THRESHOLD,
  MAX_ROI_FOR_AVERAGE
};
