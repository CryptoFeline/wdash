// OKX API Client for fetching wallet data

export interface OKXWalletSummary {
  avgCostBuy: string;
  datePnlList: Array<{ profit: string; timestamp: number }>;
  favoriteMcapType: string;
  mcapTxsBuyList: number[];
  nativeTokenBalanceAmount: string;
  nativeTokenBalanceUsd: string;
  newWinRateDistribution: number[];
  topTokens: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    pnl: string;
    roi: string;
  }>;
  topTokensTotalPnl: string;
  topTokensTotalRoi: string;
  totalPnl: string;
  totalPnlRoi: string;
  totalProfitPnl: string;
  totalProfitPnlRoi: string;
  totalTxsBuy: number;
  totalTxsSell: number;
  totalVolumeBuy: string;
  totalVolumeSell: string;
  totalWinRate: string;
  unrealizedPnl: string;
  unrealizedPnlRoi: string;
  winRateList: string[];
}

export interface OKXTokenHolding {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  logoUrl: string;
  balance: string;
  balanceUsd: string;
  buyVolume: string;
  sellVolume: string;
  totalPnl: string;
  totalPnlPercentage: string;
  realizedPnl: string;
  unrealizedPnl: string;
  buyAvgPrice: string;
  sellAvgPrice: string;
  holdAvgPrice: string;
  totalTxBuy: number;
  totalTxSell: number;
  riskLevel: number;
  holdingTime: number;
  latestTime: number;
}

export interface OKXTokenTrade {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  logoUrl: string;
  totalPnl: string;
  totalPnlPercentage: string;
  realizedPnl: string;
  buyVolume: string;
  sellVolume: string;
  buyAvgPrice: string;
  sellAvgPrice: string;
  totalTxBuy: number;
  totalTxSell: number;
  riskLevel: number;
  holdingTime: number;
}

export interface OKXTokenHistory {
  tokenAddress: string;
  tokenSymbol: string;
  history: Array<{
    time: string;
    lastTime: string;
    buyAmount: string;
    buyCount: number;
    buyPrice: string;
    buyValue: string;
    sellAmount: string;
    sellCount: number;
    sellPrice: string;
    sellValue: string;
    fromAddress: string;
    fromAddressTag: string;
  }>;
}

export interface OKXWalletData {
  address: string;
  chainId: string;
  fetchedAt: string;
  summary: OKXWalletSummary;
  holdings: OKXTokenHolding[];
  historicalTrades: OKXTokenTrade[];
  tokenHistories: OKXTokenHistory[];
}

export interface OKXAPIResponse {
  success: boolean;
  data?: OKXWalletData;
  error?: string;
  details?: string;
}

/**
 * Fetches comprehensive wallet data from OKX API
 * @param address Wallet address
 * @param chainId Optional chain ID (default: 501 for Solana)
 * @returns Promise with wallet data
 */
export async function fetchWalletData(
  address: string,
  chainId: string = '501'
): Promise<OKXWalletData> {
  try {
    const response = await fetch(`/api/okx/${address}?chainId=${chainId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorData: OKXAPIResponse = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch wallet data`);
    }

    const result: OKXAPIResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response from API');
    }

    return result.data;
  } catch (error) {
    console.error('[OKX API] Error fetching wallet data:', error);
    throw error;
  }
}

/**
 * Calculates analytics from wallet data
 */
export function calculateWalletMetrics(data: OKXWalletData) {
  const { summary, holdings, historicalTrades } = data;

  // Calculate total portfolio value
  const totalHoldingsValue = holdings.reduce(
    (sum, token) => sum + parseFloat(token.balanceUsd || '0'),
    0
  );

  // Calculate realized vs unrealized PnL
  const totalRealizedPnL = parseFloat(summary.totalProfitPnl || '0');
  const totalUnrealizedPnL = parseFloat(summary.unrealizedPnl || '0');

  // Calculate win rate
  const winRate = parseFloat(summary.totalWinRate || '0');

  // Calculate average holding time
  const allTokens = [...holdings, ...historicalTrades];
  const avgHoldTime = allTokens.length > 0
    ? allTokens.reduce((sum, token) => sum + (token.holdingTime || 0), 0) / allTokens.length
    : 0;

  // Calculate trading frequency
  const totalTrades = summary.totalTxsBuy + summary.totalTxsSell;

  // Calculate profit factor (total profit / total volume)
  const totalVolume = parseFloat(summary.totalVolumeBuy || '0') + parseFloat(summary.totalVolumeSell || '0');
  const profitFactor = totalVolume > 0 ? totalRealizedPnL / totalVolume : 0;

  return {
    totalPortfolioValue: totalHoldingsValue,
    nativeTokenBalance: parseFloat(summary.nativeTokenBalanceUsd || '0'),
    totalValue: totalHoldingsValue + parseFloat(summary.nativeTokenBalanceUsd || '0'),
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalPnL: totalRealizedPnL + totalUnrealizedPnL,
    winRate,
    avgHoldingTime: avgHoldTime / 3600, // Convert to hours
    totalTrades,
    profitFactor,
    roi: parseFloat(summary.totalPnlRoi || '0'),
    tokenCount: holdings.length,
    tradedTokenCount: historicalTrades.length
  };
}

/**
 * Formats large numbers for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

/**
 * Formats USD amounts
 */
export function formatUSD(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return `$${formatNumber(num)}`;
}

/**
 * Formats percentage values
 */
export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}
