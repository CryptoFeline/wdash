// OKX API Client Library - Comprehensive Edition
// Based on TRACKED_WALLET_MODAL.MD specifications and real API responses

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SOLANA_CHAIN_ID = '501';

// ============================================================================
// TYPE DEFINITIONS - Matching actual OKX API responses
// ============================================================================

/**
 * Endpoint 1: Wallet Profile Summary
 * URL: /priapi/v1/dx/market/v2/pnl/wallet-profile/summary
 */
export interface OKXWalletSummary {
  // Balances
  nativeTokenBalanceAmount: string;      // Native token (SOL) amount
  nativeTokenBalanceUsd: string;         // Native token USD value
  
  // PnL Data
  datePnlList: Array<{                   // 7 days of daily PnL
    profit: string;                       // Daily PnL in USD
    timestamp: number;                    // Unix timestamp in milliseconds
  }>;
  totalPnl: string;                      // Total 7d PnL USD
  totalPnlRoi: string;                   // Total ROI percentage
  totalProfitPnl: string;                // Total realized profit
  totalProfitPnlRoi: string;             // Realized ROI percentage
  unrealizedPnl: string;                 // Unrealized PnL
  unrealizedPnlRoi: string;              // Unrealized ROI percentage
  
  // Top Tokens
  topTokens: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    tokenName: string;
    tokenLogo: string;
    pnl: string;                         // Token PnL USD
    roi: string;                         // Token ROI percentage
    innerGotoUrl: string;                // OKX link to token page
  }>;
  topTokensTotalPnl: string;             // Sum of top 3 PnLs
  topTokensTotalRoi: string;             // Avg ROI of top 3
  
  // Win Rate Data
  totalWinRate: string;                  // Overall win rate 0-100
  winRateList: string[];                 // 6 buckets: [100%, 100-75%, 75-50%, 50-25%, 25-0%, 0%]
  newWinRateDistribution: number[];      // 4 PnL brackets: [>500%, 0-500%, -50%-0%, <-50%]
  
  // Trading Stats
  totalTxsBuy: number;                   // Total buy transactions
  totalTxsSell: number;                  // Total sell transactions
  totalVolumeBuy: string;                // Total buy volume USD
  totalVolumeSell: string;               // Total sell volume USD
  avgCostBuy: string;                    // Average buy cost USD
  
  // Market Cap Preference
  favoriteMcapType: string;              // Most traded mcap range (0-4 index)
  mcapTxsBuyList: number[];              // 5 buckets: [<$100k, $100k-$1M, $1M-$10M, $10M-$100M, >$100M]
}

/**
 * Endpoint 4: Token List
 * URL: /priapi/v1/dx/market/v2/pnl/token-list
 */
export interface OKXTokenListResponse {
  code: number;
  data: {
    hasNext: boolean;                    // More pages available
    tokenList: OKXTokenData[];
  };
  msg: string;
}

export interface OKXTokenData {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  logoUrl: string;
  
  // Trading Volumes
  buyVolume: string;                     // Total bought USD
  sellVolume: string;                    // Total sold USD
  buyAvgPrice: string;                   // Avg buy price
  sellAvgPrice: string;                  // Avg sell price
  holdAvgPrice?: string;                 // Avg price of current holdings
  
  // PnL
  totalPnl: string;                      // Total PnL for this token
  totalPnlPercentage: string;            // Total ROI percentage
  realizedPnl: string;                   // Realized from sales
  unrealizedPnl: string;                 // From current holdings
  
  // Holdings
  balance: string;                       // Current holdings amount
  balanceUsd: string;                    // Current holdings USD value
  holdingTime: number;                   // Average hold time (seconds)
  
  // Trade Counts
  totalTxBuy: number;                    // # of buy transactions
  totalTxSell: number;                   // # of sell transactions
  
  // Risk & Metadata
  riskLevel: number;                     // 1-5 (1=safest, 5=riskiest)
  latestTime: number;                    // Last trade timestamp
}

/**
 * Endpoint 6: Token Trading History (kline-bs-point)
 * URL: /priapi/v1/dx/market/v2/trading/kline-bs-point
 */
export interface OKXTokenHistoryResponse {
  code: number;
  data: Array<{
    time: string;                        // Trade timestamp
    lastTime: string;                    // Previous trade timestamp
    buyAmount: string;                   // Amount bought
    buyCount: number;                    // # of buy txs in this period
    buyPrice: string;                    // Avg buy price
    buyValue: string;                    // Total buy value USD
    sellAmount: string;                  // Amount sold
    sellCount: number;                   // # of sell txs in this period
    sellPrice: string;                   // Avg sell price
    sellValue: string;                   // Total sell value USD
    fromAddress: string;                 // DEX/source address
    fromAddressTag: string;              // DEX name
  }>;
  msg: string;
}

/**
 * Combined wallet data structure
 */
export interface OKXWalletData {
  address: string;
  chainId: string;
  fetchedAt: number;                     // Timestamp when data was fetched
  summary: OKXWalletSummary;
  tokenList: OKXTokenData[];
  tokenHistories: Map<string, OKXTokenHistoryResponse>;  // key = tokenAddress
}

/**
 * API Response wrapper
 */
export interface OKXAPIResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  cached: boolean;
}

// ============================================================================
// HELPER TYPES FOR UI COMPONENTS
// ============================================================================

/**
 * Computed wallet quality metrics
 */
export interface WalletQualityMetrics {
  // Overall risk assessment
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  
  // Diversification score
  avgROI: number;                        // Average ROI per trade
  diversificationScore: number;          // 0-100 (higher is better)
  diversificationStatus: '✅ Excellent' | '⚠️ Good' | '❌ Poor';
  
  // Execution score
  profitableTradesCount: number;
  totalTradesCount: number;
  executionPercentage: number;           // % of profitable trades
  avgPnLPerTrade: number;                // Average PnL USD
  executionStatus: '✅ Good' | '⚠️ Fair' | '❌ Poor';
  
  // Rug rate
  severeRugsCount: number;               // -95% or worse
  majorLossesCount: number;              // -50% to -95%
  rugRate: number;                       // % of portfolio in rugs
  rugStatus: '✅ Low Risk' | '⚠️ Medium Risk' | '❌ High Risk';
}

/**
 * Win rate bucket distribution
 */
export interface WinRateBucket {
  label: string;                         // e.g., "100%", "75-50%"
  count: number;                         // # of tokens in this bucket
  tokens: Array<{                        // List of tokens in this bucket
    symbol: string;
    winRate: number;                     // Calculated win rate
    tradeCount: number;                  // Total trades for this token
  }>;
}

/**
 * Market cap labels
 */
export const MCAP_LABELS = [
  '<$100k',
  '$100k-$1M',
  '$1M-$10M',
  '$10M-$100M',
  '>$100M'
];

/**
 * Win rate bucket labels
 */
export const WIN_RATE_LABELS = [
  '100%',
  '100-75%',
  '75-50%',
  '50-25%',
  '25-0%',
  '0%'
];

/**
 * PnL bracket labels
 */
export const PNL_BRACKET_LABELS = [
  '>500%',
  '0-500%',
  '-50%-0%',
  '<-50%'
];

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch wallet profile summary (Endpoint 1)
 */
export async function fetchWalletSummary(
  walletAddress: string,
  chainId: string = SOLANA_CHAIN_ID
): Promise<OKXAPIResponse<OKXWalletSummary>> {
  try {
    // Check cache first
    const cacheKey = `okx_summary_${walletAddress}_${chainId}`;
    const cached = getFromCache<OKXWalletSummary>(cacheKey);
    if (cached) {
      return { success: true, data: cached, error: null, cached: true };
    }

    const url = `/api/okx/${walletAddress}?chainId=${chainId}&endpoint=summary`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.code !== 0) {
      throw new Error(json.msg || 'Unknown API error');
    }

    const data = json.data;
    saveToCache(cacheKey, data);
    
    return { success: true, data, error: null, cached: false };
  } catch (error) {
    console.error('[OKX API] Error fetching wallet summary:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      cached: false
    };
  }
}

/**
 * Fetch token list (Endpoint 4) - handles pagination
 */
export async function fetchTokenList(
  walletAddress: string,
  chainId: string = SOLANA_CHAIN_ID,
  maxPages: number = 3  // Limit to prevent excessive API calls
): Promise<OKXAPIResponse<OKXTokenData[]>> {
  try {
    // Check cache first
    const cacheKey = `okx_tokens_${walletAddress}_${chainId}`;
    const cached = getFromCache<OKXTokenData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached, error: null, cached: true };
    }

    const allTokens: OKXTokenData[] = [];
    let hasNext = true;
    let offset = 0;
    let page = 0;

    while (hasNext && page < maxPages) {
      const url = `/api/okx/${walletAddress}?chainId=${chainId}&endpoint=tokenList&offset=${offset}&limit=100`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json: OKXTokenListResponse = await response.json();
      
      if (json.code !== 0) {
        throw new Error(json.msg || 'Unknown API error');
      }

      allTokens.push(...json.data.tokenList);
      hasNext = json.data.hasNext;
      offset += 100;
      page++;
    }

    saveToCache(cacheKey, allTokens);
    
    return { success: true, data: allTokens, error: null, cached: false };
  } catch (error) {
    console.error('[OKX API] Error fetching token list:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      cached: false
    };
  }
}

/**
 * Fetch token trading history (Endpoint 6)
 * Only fetch when user requests it (on-demand)
 */
export async function fetchTokenHistory(
  walletAddress: string,
  tokenAddress: string,
  chainId: string = SOLANA_CHAIN_ID
): Promise<OKXAPIResponse<OKXTokenHistoryResponse>> {
  try {
    const url = `/api/okx/${walletAddress}?chainId=${chainId}&endpoint=tokenHistory&tokenAddress=${tokenAddress}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json: OKXTokenHistoryResponse = await response.json();
    
    if (json.code !== 0) {
      throw new Error(json.msg || 'Unknown API error');
    }
    
    return { success: true, data: json, error: null, cached: false };
  } catch (error) {
    console.error('[OKX API] Error fetching token history:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      cached: false
    };
  }
}

/**
 * Fetch complete wallet data (Summary + Token List)
 */
export async function fetchCompleteWalletData(
  walletAddress: string,
  chainId: string = SOLANA_CHAIN_ID
): Promise<OKXAPIResponse<OKXWalletData>> {
  try {
    const [summaryResult, tokenListResult] = await Promise.all([
      fetchWalletSummary(walletAddress, chainId),
      fetchTokenList(walletAddress, chainId)
    ]);

    if (!summaryResult.success) {
      throw new Error(summaryResult.error || 'Failed to fetch summary');
    }

    if (!tokenListResult.success) {
      throw new Error(tokenListResult.error || 'Failed to fetch token list');
    }

    const walletData: OKXWalletData = {
      address: walletAddress,
      chainId,
      fetchedAt: Date.now(),
      summary: summaryResult.data!,
      tokenList: tokenListResult.data!,
      tokenHistories: new Map()
    };

    return {
      success: true,
      data: walletData,
      error: null,
      cached: summaryResult.cached && tokenListResult.cached
    };
  } catch (error) {
    console.error('[OKX API] Error fetching complete wallet data:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      cached: false
    };
  }
}

// ============================================================================
// COMPUTATION FUNCTIONS
// ============================================================================

/**
 * Calculate wallet quality metrics from token list data
 */
export function calculateQualityMetrics(tokenList: OKXTokenData[]): WalletQualityMetrics {
  if (tokenList.length === 0) {
    return {
      riskLevel: 'HIGH',
      avgROI: 0,
      diversificationScore: 0,
      diversificationStatus: '❌ Poor',
      profitableTradesCount: 0,
      totalTradesCount: 0,
      executionPercentage: 0,
      avgPnLPerTrade: 0,
      executionStatus: '❌ Poor',
      severeRugsCount: 0,
      majorLossesCount: 0,
      rugRate: 0,
      rugStatus: '✅ Low Risk'
    };
  }

  // 1. Diversification Score (avg ROI per token)
  const totalROI = tokenList.reduce((sum, token) => 
    sum + parseFloat(token.totalPnlPercentage || '0'), 0
  );
  const avgROI = totalROI / tokenList.length;
  
  let diversificationStatus: '✅ Excellent' | '⚠️ Good' | '❌ Poor';
  let diversificationScore: number;
  
  if (avgROI >= 50) {
    diversificationStatus = '✅ Excellent';
    diversificationScore = 100;
  } else if (avgROI >= 25) {
    diversificationStatus = '⚠️ Good';
    diversificationScore = 75;
  } else {
    diversificationStatus = '❌ Poor';
    diversificationScore = 50;
  }

  // 2. Execution Score (% of profitable trades)
  const profitableTradesCount = tokenList.filter(token => 
    parseFloat(token.totalPnl || '0') > 0
  ).length;
  const totalTradesCount = tokenList.length;
  const executionPercentage = (profitableTradesCount / totalTradesCount) * 100;
  
  const totalPnL = tokenList.reduce((sum, token) => 
    sum + parseFloat(token.totalPnl || '0'), 0
  );
  const avgPnLPerTrade = totalPnL / totalTradesCount;
  
  let executionStatus: '✅ Good' | '⚠️ Fair' | '❌ Poor';
  
  if (executionPercentage >= 70) {
    executionStatus = '✅ Good';
  } else if (executionPercentage >= 60) {
    executionStatus = '⚠️ Fair';
  } else {
    executionStatus = '❌ Poor';
  }

  // 3. Rug Rate (tokens with severe losses still held)
  const severeRugsCount = tokenList.filter(token => {
    const pnlPercent = parseFloat(token.totalPnlPercentage || '0');
    const balance = parseFloat(token.balance || '0');
    return balance > 0 && pnlPercent <= -95;
  }).length;
  
  const majorLossesCount = tokenList.filter(token => {
    const pnlPercent = parseFloat(token.totalPnlPercentage || '0');
    const balance = parseFloat(token.balance || '0');
    return balance > 0 && pnlPercent > -95 && pnlPercent <= -50;
  }).length;
  
  const rugRate = ((severeRugsCount + majorLossesCount) / totalTradesCount) * 100;
  
  let rugStatus: '✅ Low Risk' | '⚠️ Medium Risk' | '❌ High Risk';
  
  if (rugRate < 5) {
    rugStatus = '✅ Low Risk';
  } else if (rugRate < 10) {
    rugStatus = '⚠️ Medium Risk';
  } else {
    rugStatus = '❌ High Risk';
  }

  // 4. Overall Risk Level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  
  if (avgROI >= 25 && executionPercentage >= 70 && rugRate < 5) {
    riskLevel = 'LOW';
  } else if (avgROI >= 15 && executionPercentage >= 60 && rugRate < 10) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  return {
    riskLevel,
    avgROI,
    diversificationScore,
    diversificationStatus,
    profitableTradesCount,
    totalTradesCount,
    executionPercentage,
    avgPnLPerTrade,
    executionStatus,
    severeRugsCount,
    majorLossesCount,
    rugRate,
    rugStatus
  };
}

/**
 * Calculate win rate buckets from token list
 */
export function calculateWinRateBuckets(tokenList: OKXTokenData[]): WinRateBucket[] {
  const buckets: WinRateBucket[] = WIN_RATE_LABELS.map(label => ({
    label,
    count: 0,
    tokens: []
  }));

  tokenList.forEach(token => {
    const totalTrades = token.totalTxBuy + token.totalTxSell;
    if (totalTrades === 0) return;

    // Calculate win rate for this token
    // Win = ended with profit (sold at higher price than bought)
    const winRate = totalTrades > 0 
      ? (token.totalTxSell / totalTrades) * 100 
      : 0;

    // Determine bucket
    let bucketIndex = 5; // Default to 0%
    if (winRate === 100) bucketIndex = 0;
    else if (winRate >= 75) bucketIndex = 1;
    else if (winRate >= 50) bucketIndex = 2;
    else if (winRate >= 25) bucketIndex = 3;
    else if (winRate > 0) bucketIndex = 4;

    buckets[bucketIndex].count++;
    buckets[bucketIndex].tokens.push({
      symbol: token.tokenSymbol,
      winRate: Math.round(winRate * 10) / 10,
      tradeCount: totalTrades
    });
  });

  // Sort tokens within each bucket by win rate descending
  buckets.forEach(bucket => {
    bucket.tokens.sort((a, b) => b.winRate - a.winRate);
  });

  return buckets;
}

/**
 * Format USD value
 */
export function formatUSD(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  } else {
    return `${sign}$${abs.toFixed(2)}`;
  }
}

/**
 * Format percentage value
 */
export function formatPercent(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00%';
  
  const formatted = num.toFixed(2);
  return num > 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Format number with K/M/B suffix
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  const abs = Math.abs(num);
  
  if (abs >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  } else {
    return num.toFixed(2);
  }
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

function getFromCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const { data, expiry } = JSON.parse(item);
    
    if (Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return data as T;
  } catch (error) {
    console.error('[Cache] Error reading from cache:', error);
    return null;
  }
}

function saveToCache<T>(key: string, data: T): void {
  try {
    const item = {
      data,
      expiry: Date.now() + CACHE_TTL
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('[Cache] Error saving to cache:', error);
  }
}
