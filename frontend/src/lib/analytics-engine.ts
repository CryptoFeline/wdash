'use client';

import { Wallet } from '@/types/wallet';

/**
 * Analytics Engine for Copy Trading
 * Calculates trader quality metrics and copy-trading signals
 */

export interface TraderMetrics {
  // Entry Quality (0-100)
  entryQualityScore: number;
  entryAccuracy: number; // % of trades entered before 50% of peak
  entryTiming: 'excellent' | 'good' | 'average' | 'poor';

  // Profitability (0-100)
  profitabilityScore: number;
  winRate: number; // % of trades with profit
  averagePnL: number; // Average PnL per trade
  profitFactor: number; // Gross profit / gross loss

  // Exit Quality (0-100)
  exitQualityScore: number;
  exitTiming: 'excellent' | 'good' | 'average' | 'poor';
  exitAccuracy: number; // % of trades exited near peak

  // Risk Management (0-100)
  riskManagementScore: number;
  maxDrawdown: number; // Max loss in 7d period
  rugPullAvoidance: number; // % avoiding honeypots
  positionSizing: number; // Score based on position concentration

  // Performance Trend (0-100)
  trendScore: number;
  weekTrend: 'improving' | 'stable' | 'declining';
  recentWinRate: number; // Last 7 days

  // Overall Score (0-100)
  traderQualityScore: number;
  isCopyWorthy: boolean;
  recommendedCopyType: 'entries-only' | 'entries-and-exits' | 'not-recommended';
}

export interface CopyTradingSignal {
  wallet: string;
  signal: 'strong-buy' | 'buy' | 'hold' | 'weak' | 'avoid';
  confidence: number; // 0-100
  reason: string;
  entryStrategy: string;
  exitTarget: number; // % profit target
  riskLevel: 'low' | 'medium' | 'high';
  strength: number; // 0-100 (duplicate of confidence for clarity)
}

/**
 * Calculate entry quality score based on entry timing
 * Score: Did they enter before 50% of the token's peak?
 */
export function calculateEntryQuality(wallet: Wallet): number {
  // Entry quality based on average win rate and holding period correlation
  const winRate = wallet.winrate_7d || 0;
  const avgHoldHours = (wallet.avg_holding_period_7d || 0) / 3600;

  // If they hold longer and still win, they entered well
  const holdingBonus = Math.min(avgHoldHours / 24, 1) * 10; // Up to +10 for holding 1+ days
  const winRateBonus = winRate * 50; // Win rate is primary indicator

  return Math.min(winRateBonus + holdingBonus, 100);
}

/**
 * Calculate profitability score
 */
export function calculateProfitabilityScore(wallet: Wallet): number {
  const profit = wallet.realized_profit_7d || 0;
  const winRate = wallet.winrate_7d || 0;
  const pnl = wallet.pnl_7d || 0;

  // Win rate is most important
  const winRateScore = winRate * 70;

  // Absolute profit matters too
  const profitScore = Math.min((profit / 10000) * 30, 30); // Normalize to 0-30

  return Math.min(winRateScore + profitScore, 100);
}

/**
 * Calculate exit quality score
 * High score if they exit near peaks or cut losses early
 */
export function calculateExitQualityScore(wallet: Wallet): number {
  const winRate = wallet.winrate_7d || 0;
  const pnl = wallet.pnl_7d || 0;

  // Exit quality: If PnL is high but win rate is moderate, they exit well
  const pnlScore = Math.min(pnl / 100, 50); // Normalize high PnL
  const winRateScore = winRate * 50;

  return Math.min(pnlScore + winRateScore, 100);
}

/**
 * Calculate risk management score
 */
export function calculateRiskManagementScore(wallet: Wallet): number {
  const rugRatio = (wallet.risk?.sell_pass_buy_ratio || 0) * 100;
  const tokenNum = wallet.token_num_7d || 1;

  // Lower rug ratio is better
  const rugScore = Math.max(100 - rugRatio * 2, 0);

  // Position sizing: trading more tokens suggests diversification
  const diversificationScore = Math.min(tokenNum / 20, 1) * 20; // Up to +20 for many tokens

  return Math.min(rugScore + diversificationScore, 100);
}

/**
 * Calculate trend score based on recent performance
 */
export function calculateTrendScore(wallet: Wallet): number {
  const pnl7d = wallet.pnl_7d || 0;
  const pnl1d = wallet.pnl_1d || 0;

  // If 1d PnL is higher than 7d average, trend is improving
  const dailyAvg = pnl7d / 7;
  let trendBonus = 0;

  if (pnl1d > dailyAvg * 1.5) {
    trendBonus = 30; // Improving trend
  } else if (pnl1d < dailyAvg * 0.5) {
    trendBonus = -20; // Declining trend
  }

  return Math.min(Math.max(pnl7d * 10 + trendBonus, 0), 100);
}

/**
 * Calculate overall trader quality score (0-100)
 * Weighted average of all metrics
 */
export function calculateTraderQualityScore(wallet: Wallet): number {
  const weights = {
    entry: 0.35, // Entry timing most important
    profitability: 0.25,
    exit: 0.2,
    risk: 0.15,
    trend: 0.05,
  };

  const entryScore = calculateEntryQuality(wallet);
  const profitScore = calculateProfitabilityScore(wallet);
  const exitScore = calculateExitQualityScore(wallet);
  const riskScore = calculateRiskManagementScore(wallet);
  const trendScore = calculateTrendScore(wallet);

  const composite =
    entryScore * weights.entry +
    profitScore * weights.profitability +
    exitScore * weights.exit +
    riskScore * weights.risk +
    trendScore * weights.trend;

  return Math.min(Math.max(composite, 0), 100);
}

/**
 * Calculate all metrics for a trader
 */
export function calculateTraderMetrics(wallet: Wallet): TraderMetrics {
  const entryScore = calculateEntryQuality(wallet);
  const profitScore = calculateProfitabilityScore(wallet);
  const exitScore = calculateExitQualityScore(wallet);
  const riskScore = calculateRiskManagementScore(wallet);
  const trendScore = calculateTrendScore(wallet);
  const qualityScore = calculateTraderQualityScore(wallet);

  const winRate = (wallet.winrate_7d || 0) * 100;
  const avgProfit = (wallet.realized_profit_7d || 0) / Math.max(wallet.token_num_7d || 1, 1);
  const pnl1d = wallet.pnl_1d || 0;
  const pnl7d = wallet.pnl_7d || 0;

  return {
    // Entry Quality
    entryQualityScore: Math.round(entryScore),
    entryAccuracy: Math.min(winRate, 100),
    entryTiming:
      entryScore > 75 ? 'excellent' : entryScore > 60 ? 'good' : entryScore > 40 ? 'average' : 'poor',

    // Profitability
    profitabilityScore: Math.round(profitScore),
    winRate,
    averagePnL: avgProfit,
    profitFactor: Math.max(pnl7d / Math.max(Math.abs(pnl7d - profitScore), 0.1), 0),

    // Exit Quality
    exitQualityScore: Math.round(exitScore),
    exitTiming:
      exitScore > 75 ? 'excellent' : exitScore > 60 ? 'good' : exitScore > 40 ? 'average' : 'poor',
    exitAccuracy: Math.min(exitScore * 1.5, 100),

    // Risk Management
    riskManagementScore: Math.round(riskScore),
    maxDrawdown: Math.max(0, (1 - (pnl7d || 1)) * 100),
    rugPullAvoidance: Math.max(0, 100 - (wallet.risk?.sell_pass_buy_ratio || 0) * 100 * 2),
    positionSizing: Math.min((wallet.token_num_7d || 0) / 20, 1) * 100,

    // Trend
    trendScore: Math.round(trendScore),
    weekTrend: pnl1d > pnl7d / 7 * 1.5 ? 'improving' : pnl1d < pnl7d / 7 * 0.5 ? 'declining' : 'stable',
    recentWinRate: winRate,

    // Overall
    traderQualityScore: Math.round(qualityScore),
    isCopyWorthy: qualityScore >= 65,
    recommendedCopyType:
      qualityScore >= 80
        ? 'entries-and-exits'
        : qualityScore >= 65
        ? 'entries-only'
        : 'not-recommended',
  };
}

/**
 * Generate copy trading signal for a wallet
 */
export function generateCopyTradingSignal(wallet: Wallet, metrics: TraderMetrics): CopyTradingSignal {
  const score = metrics.traderQualityScore;

  // Determine signal strength
  let signal: 'strong-buy' | 'buy' | 'hold' | 'weak' | 'avoid';
  let confidence: number;
  let reason: string;

  if (score >= 85 && metrics.winRate >= 70) {
    signal = 'strong-buy';
    confidence = Math.min(score + 15, 100);
    reason = 'Exceptional trader: high quality entries, strong profitability';
  } else if (score >= 70 && metrics.winRate >= 55) {
    signal = 'buy';
    confidence = Math.min(score + 5, 100);
    reason = 'Good trader: reliable entries, consistent profitability';
  } else if (score >= 55 && metrics.winRate >= 40) {
    signal = 'hold';
    confidence = score;
    reason = 'Moderate trader: some good signals mixed with losses';
  } else if (score >= 40) {
    signal = 'weak';
    confidence = Math.max(100 - score, 10);
    reason = 'Weak trader: inconsistent results, low profitability';
  } else {
    signal = 'avoid';
    confidence = 100 - score;
    reason = 'Poor trader: avoid copying - low win rate and profitability';
  }

  // Determine exit target based on their historical performance
  let exitTarget = 25; // Default 25% target
  if (metrics.averagePnL > 0.5) exitTarget = 50;
  if (metrics.averagePnL > 1) exitTarget = 100;
  if (metrics.averagePnL < 0.1) exitTarget = 10;

  // Risk level based on rug avoidance and max drawdown
  let riskLevel: 'low' | 'medium' | 'high';
  if (metrics.rugPullAvoidance >= 90) {
    riskLevel = 'low';
  } else if (metrics.rugPullAvoidance >= 70) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    wallet: wallet.wallet_address,
    signal,
    confidence,
    reason,
    entryStrategy: `Copy ${metrics.recommendedCopyType === 'entries-and-exits' ? 'entries and exits' : 'entries only'}`,
    exitTarget,
    riskLevel,
    strength: confidence,
  };
}

/**
 * Get readable label for trader quality score
 */
export function getTraderLabel(score: number): string {
  if (score >= 90) return '⭐⭐⭐⭐⭐ Exceptional';
  if (score >= 80) return '⭐⭐⭐⭐ Excellent';
  if (score >= 70) return '⭐⭐⭐ Good';
  if (score >= 55) return '⭐⭐ Fair';
  if (score >= 40) return '⭐ Weak';
  return '❌ Poor';
}

/**
 * Batch calculate metrics for multiple wallets
 */
export function calculateMetricsForWallets(wallets: Wallet[]): Record<string, TraderMetrics> {
  const results: Record<string, TraderMetrics> = {};

  for (const wallet of wallets) {
    results[wallet.wallet_address] = calculateTraderMetrics(wallet);
  }

  return results;
}

/**
 * Calculate entry analysis: did they enter before the pump?
 * Uses win rate as proxy - high win rate suggests good entries
 */
export function analyzeEntryQuality(wallet: Wallet): {
  quality: 'excellent' | 'good' | 'average' | 'poor';
  explanation: string;
} {
  const winRate = wallet.winrate_7d || 0;

  if (winRate >= 0.75) {
    return {
      quality: 'excellent',
      explanation: '≥75% win rate: entering tokens before pump',
    };
  } else if (winRate >= 0.6) {
    return {
      quality: 'good',
      explanation: '60-75% win rate: mostly good entries with some false signals',
    };
  } else if (winRate >= 0.4) {
    return {
      quality: 'average',
      explanation: '40-60% win rate: mixed entry timing, needs refinement',
    };
  } else {
    return {
      quality: 'poor',
      explanation: '<40% win rate: poor entry timing, entering after pumps',
    };
  }
}

/**
 * Calculate exit analysis: are they holding too long or exiting too early?
 */
export function analyzeExitTiming(wallet: Wallet): {
  timing: 'too-early' | 'optimal' | 'too-late' | 'no-data';
  explanation: string;
  recommendation: string;
} {
  const pnl = wallet.pnl_7d || 0;
  const winRate = wallet.winrate_7d || 0;

  if (winRate === 0) {
    return {
      timing: 'no-data',
      explanation: 'No win data available',
      recommendation: 'Need more trading data to analyze',
    };
  }

  // If PnL is modest but win rate is high, they might be exiting too early
  if (winRate >= 0.6 && pnl < 0.3) {
    return {
      timing: 'too-early',
      explanation: 'High win rate (≥60%) but low PnL: exiting before full move',
      recommendation: 'Copy entries, extend exit targets to 30-50%',
    };
  }

  // If PnL is high with decent win rate, timing is good
  if (pnl >= 0.3 && winRate >= 0.5) {
    return {
      timing: 'optimal',
      explanation: 'Good PnL with ≥50% win rate: balanced entry and exit timing',
      recommendation: 'Copy both entries and exits - proven strategy',
    };
  }

  // If win rate is low with high PnL from few trades, exiting too late on winners
  if (winRate < 0.4 && pnl > 0.2) {
    return {
      timing: 'too-late',
      explanation: 'Low win rate (<40%) with decent PnL: holding winners too long',
      recommendation: 'Copy entries, take profits earlier than they do',
    };
  }

  return {
    timing: 'optimal',
    explanation: 'Balanced approach',
    recommendation: 'Monitor for pattern changes',
  };
}
