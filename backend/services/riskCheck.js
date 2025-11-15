/**
 * Risk Check Service
 * 
 * Integrates with OKX Risk Check API to detect honeypots, rugs, and scams.
 * Filters risky tokens from metrics calculations to ensure accurate analysis.
 */

import axios from 'axios';

/**
 * Check token risk using OKX Risk Check API
 * 
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - 'eth' or 'sol'
 * @returns {Promise<Object>} Risk analysis result
 */
export async function checkTokenRisk(tokenAddress, chain = 'eth') {
  try {
    const chainId = chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1';
    
    const url = 'https://web3.okx.com/priapi/v1/dx/market/v2/risk/new/check';
    const params = {
      chainId,
      tokenContractAddress: tokenAddress,
      t: Date.now()
    };
    
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.code !== 0 || !response.data?.data) {
      console.warn(`[RiskCheck] Failed for ${tokenAddress}: ${response.data?.msg || 'No data'}`);
      return null;
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`[RiskCheck] Error for ${tokenAddress}:`, error.message);
    return null;
  }
}

/**
 * Analyze risk data to determine if token is risky
 * 
 * @param {Object} riskData - Risk data from OKX API
 * @returns {Object} { isRisky, riskLevel, highRisks, warnings }
 */
export function analyzeRiskData(riskData) {
  if (!riskData || !riskData.allAnalysis) {
    return {
      isRisky: false,
      riskLevel: 'unknown',
      highRisks: [],
      warnings: []
    };
  }
  
  const { highRiskList = [], lowRiskList = [] } = riskData.allAnalysis;
  
  // Check for critical high risks
  const criticalRisks = highRiskList.filter(risk => {
    const name = risk.newRiskName?.toLowerCase() || '';
    const label = risk.newRiskLabel?.toLowerCase() || '';
    
    // Critical: Honeypot, blocklist used, high tax
    return (
      name.includes('honeypot') && label === 'yes' ||
      name.includes('blocklist') && label === 'yes' ||
      name.includes('transaction tax') && label === 'yes'
    );
  });
  
  // Moderate risks from low risk list with "Yes" labels
  const moderateRisks = lowRiskList.filter(risk => {
    const label = risk.newRiskLabel?.toLowerCase() || '';
    return label === 'yes';
  });
  
  // Determine overall risk level
  let riskLevel = 'safe';
  if (criticalRisks.length > 0) {
    riskLevel = 'critical';
  } else if (highRiskList.length > 0) {
    riskLevel = 'high';
  } else if (moderateRisks.length > 2) {
    riskLevel = 'moderate';
  }
  
  const isRisky = riskLevel === 'critical' || riskLevel === 'high';
  
  return {
    isRisky,
    riskLevel,
    highRisks: criticalRisks.map(r => ({
      name: r.newRiskName,
      description: r.newRiskDesc,
      severity: 'critical'
    })),
    warnings: [
      ...highRiskList.filter(r => !criticalRisks.includes(r)).map(r => ({
        name: r.newRiskName,
        description: r.newRiskDesc,
        severity: 'high'
      })),
      ...moderateRisks.map(r => ({
        name: r.newRiskName,
        description: r.newRiskDesc,
        severity: 'moderate'
      }))
    ]
  };
}

/**
 * Check if token is a rug (lost -100% PnL)
 * 
 * @param {Object} trade - Trade object
 * @returns {boolean} True if token appears to be rugged
 */
export function isRuggedToken(trade) {
  // Check for -100% ROI or close to it
  if (trade.realized_roi <= -95) {
    return true;
  }
  
  // Check if token lost all value
  if (trade.exit_price > 0 && (trade.exit_price / trade.entry_price) < 0.05) {
    return true;
  }
  
  return false;
}

/**
 * Enrich trade with risk check data
 * 
 * @param {Object} trade - Trade object
 * @param {string} chain - 'eth' or 'sol'
 * @returns {Promise<Object>} Trade with risk data
 */
export async function enrichTradeWithRiskCheck(trade, chain = 'eth') {
  try {
    // Skip if already checked
    if (trade.risk_checked) {
      return trade;
    }
    
    // Check for obvious rug first (avoid API call)
    if (isRuggedToken(trade)) {
      return {
        ...trade,
        risk_checked: true,
        is_risky: true,
        risk_level: 'critical',
        risk_reason: 'Potential rug pull (near -100% loss)',
        high_risks: [
          {
            name: 'Potential Rug Pull',
            description: 'Token lost >95% of value',
            severity: 'critical'
          }
        ],
        warnings: []
      };
    }
    
    // Fetch risk data from OKX
    const riskData = await checkTokenRisk(trade.token_address, chain);
    
    if (!riskData) {
      // API failed, mark as unknown
      return {
        ...trade,
        risk_checked: true,
        is_risky: false,
        risk_level: 'unknown',
        risk_reason: 'Risk check unavailable',
        high_risks: [],
        warnings: []
      };
    }
    
    // Analyze risk data
    const riskAnalysis = analyzeRiskData(riskData);
    
    return {
      ...trade,
      risk_checked: true,
      is_risky: riskAnalysis.isRisky,
      risk_level: riskAnalysis.riskLevel,
      risk_reason: riskAnalysis.highRisks.length > 0 
        ? riskAnalysis.highRisks[0].name 
        : 'Safe',
      high_risks: riskAnalysis.highRisks,
      warnings: riskAnalysis.warnings
    };
  } catch (error) {
    console.error(`[RiskCheck] Error enriching trade for ${trade.token_symbol}:`, error.message);
    return {
      ...trade,
      risk_checked: true,
      is_risky: false,
      risk_level: 'unknown',
      risk_reason: 'Risk check failed',
      high_risks: [],
      warnings: []
    };
  }
}

/**
 * Enrich multiple trades with risk checks in batches
 * 
 * @param {Array} trades - Array of trades
 * @param {string} chain - 'eth' or 'sol'
 * @param {number} batchSize - Concurrent requests (default 3)
 * @returns {Promise<Array>} Trades with risk data
 */
export async function enrichTradesWithRiskCheck(trades, chain = 'eth', batchSize = 3) {
  if (!trades || trades.length === 0) {
    return [];
  }
  
  console.log(`[RiskCheck] Starting risk checks for ${trades.length} trades...`);
  
  // Get unique token addresses to avoid duplicate checks
  const tokenMap = new Map();
  for (const trade of trades) {
    if (!tokenMap.has(trade.token_address)) {
      tokenMap.set(trade.token_address, trade);
    }
  }
  
  const uniqueTrades = Array.from(tokenMap.values());
  console.log(`[RiskCheck] Checking ${uniqueTrades.length} unique tokens...`);
  
  const riskResults = new Map();
  
  // Process in batches
  for (let i = 0; i < uniqueTrades.length; i += batchSize) {
    const batch = uniqueTrades.slice(i, i + batchSize);
    
    const enrichedBatch = await Promise.all(
      batch.map(trade => enrichTradeWithRiskCheck(trade, chain))
    );
    
    // Store results by token address
    for (const enrichedTrade of enrichedBatch) {
      riskResults.set(enrichedTrade.token_address, {
        is_risky: enrichedTrade.is_risky,
        risk_level: enrichedTrade.risk_level,
        risk_reason: enrichedTrade.risk_reason,
        high_risks: enrichedTrade.high_risks,
        warnings: enrichedTrade.warnings,
        risk_checked: enrichedTrade.risk_checked
      });
    }
    
    console.log(`[RiskCheck] Processed ${Math.min(i + batchSize, uniqueTrades.length)}/${uniqueTrades.length} tokens`);
    
    // Small delay between batches
    if (i + batchSize < uniqueTrades.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Apply risk data to all trades
  const enrichedTrades = trades.map(trade => {
    const riskData = riskResults.get(trade.token_address);
    return riskData ? { ...trade, ...riskData } : trade;
  });
  
  const riskyCount = enrichedTrades.filter(t => t.is_risky).length;
  console.log(`[RiskCheck] Completed: ${riskyCount}/${trades.length} trades flagged as risky`);
  
  return enrichedTrades;
}

/**
 * Filter out risky trades from metrics calculation
 * 
 * @param {Array} trades - Array of trades
 * @returns {Array} Filtered trades (safe only)
 */
export function filterRiskyTrades(trades) {
  if (!trades || trades.length === 0) {
    return [];
  }
  
  const safe = trades.filter(t => !t.is_risky);
  const risky = trades.length - safe.length;
  
  if (risky > 0) {
    console.log(`[RiskCheck] Filtered out ${risky} risky trades from metrics`);
  }
  
  return safe;
}

export default {
  checkTokenRisk,
  analyzeRiskData,
  isRuggedToken,
  enrichTradeWithRiskCheck,
  enrichTradesWithRiskCheck,
  filterRiskyTrades
};
