'use client';

import React from 'react';
import { BarChart3, Shield, AlertTriangle } from 'lucide-react';
import { 
  MCAP_LABELS,
  calculateQualityMetrics,
  type OKXWalletSummary,
  type OKXTokenData,
  type WalletQualityMetrics
} from '@/lib/okx-api-v2';

// ============================================================================
// MARKET CAP CARD COMPONENT
// ============================================================================

interface MarketCapCardProps {
  summary: OKXWalletSummary;
}

export function MarketCapCard({ summary }: MarketCapCardProps) {
  // Market cap buy distribution (5 buckets from API)
  const mcapData = (summary.mcapTxsBuyList || []).map((count, index) => ({
    label: MCAP_LABELS[index],
    count,
    color: ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-red-500'][index]
  }));

  const maxCount = Math.max(...mcapData.map(m => m.count), 1);
  const totalBuys = mcapData.reduce((sum, m) => sum + m.count, 0);

  // Determine favorite market cap range
  const favoriteIndex = parseInt(summary.favoriteMcapType || '0');
  const favoriteLabel = MCAP_LABELS[favoriteIndex] || MCAP_LABELS[0];

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">Market Cap Preference</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Favorite</p>
          <p className="text-sm font-semibold text-pink-400">{favoriteLabel}</p>
        </div>
      </div>

      {/* Market Cap Distribution Bars */}
      <div className="space-y-3">
        {mcapData.map((mcap) => {
          const percentage = totalBuys > 0 ? (mcap.count / totalBuys) * 100 : 0;
          const isFavorite = mcap.label === favoriteLabel;

          return (
            <div key={mcap.label} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    isFavorite ? 'text-pink-400' : 'text-zinc-400'
                  }`}>
                    {mcap.label}
                  </span>
                  {isFavorite && (
                    <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] font-bold rounded">
                      TOP
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {mcap.count} buys ({percentage.toFixed(1)}%)
                </span>
              </div>
              
              {/* Horizontal Bar */}
              <div className="h-6 bg-zinc-900/50 rounded-lg overflow-hidden">
                <div 
                  className={`h-full ${mcap.color} flex items-center px-3 transition-all group-hover:opacity-90`}
                  style={{ width: `${(mcap.count / maxCount) * 100}%` }}
                >
                  {mcap.count > maxCount * 0.1 && (
                    <span className="text-xs font-semibold text-white">
                      {mcap.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-zinc-700/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Total Buy Transactions</span>
          <span className="font-semibold text-zinc-200">{totalBuys.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUALITY METRICS CARD COMPONENT
// ============================================================================

interface QualityMetricsCardProps {
  tokenList: OKXTokenData[];
}

export function QualityMetricsCard({ tokenList }: QualityMetricsCardProps) {
  const metrics: WalletQualityMetrics = calculateQualityMetrics(tokenList);

  // Risk level styling
  const getRiskLevelStyle = (level: WalletQualityMetrics['riskLevel']) => {
    switch (level) {
      case 'LOW':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500/40',
          text: 'text-green-400',
          icon: Shield
        };
      case 'MEDIUM':
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-500/40',
          text: 'text-orange-400',
          icon: AlertTriangle
        };
      case 'HIGH':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/40',
          text: 'text-red-400',
          icon: AlertTriangle
        };
    }
  };

  const riskStyle = getRiskLevelStyle(metrics.riskLevel);
  const RiskIcon = riskStyle.icon;

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${riskStyle.bg} rounded-lg border ${riskStyle.border}`}>
            <RiskIcon className={`w-5 h-5 ${riskStyle.text}`} />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">Quality Metrics</h3>
        </div>
        <div className={`px-3 py-1.5 ${riskStyle.bg} rounded-lg border ${riskStyle.border}`}>
          <p className={`text-sm font-bold ${riskStyle.text}`}>
            {metrics.riskLevel} RISK
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Diversification Score */}
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <p className="text-xs text-zinc-500 mb-2">Diversification</p>
          <div className="flex items-baseline gap-1 mb-1">
            <p className="text-2xl font-bold text-zinc-200">
              {metrics.diversificationScore}
            </p>
            <p className="text-xs text-zinc-500">/100</p>
          </div>
          <p className="text-[10px] text-zinc-500">
            Avg ROI: {metrics.avgROI.toFixed(1)}%
          </p>
          <p className="text-xs font-medium mt-2">
            {metrics.diversificationStatus}
          </p>
        </div>

        {/* Execution Score */}
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <p className="text-xs text-zinc-500 mb-2">Execution</p>
          <div className="flex items-baseline gap-1 mb-1">
            <p className="text-2xl font-bold text-zinc-200">
              {metrics.executionPercentage.toFixed(1)}
            </p>
            <p className="text-xs text-zinc-500">%</p>
          </div>
          <p className="text-[10px] text-zinc-500">
            {metrics.profitableTradesCount}/{metrics.totalTradesCount} profitable
          </p>
          <p className="text-xs font-medium mt-2">
            {metrics.executionStatus}
          </p>
        </div>

        {/* Rug Rate */}
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <p className="text-xs text-zinc-500 mb-2">Rug Rate</p>
          <div className="flex items-baseline gap-1 mb-1">
            <p className="text-2xl font-bold text-zinc-200">
              {metrics.rugRate.toFixed(1)}
            </p>
            <p className="text-xs text-zinc-500">%</p>
          </div>
          <p className="text-[10px] text-zinc-500">
            {metrics.severeRugsCount} severe rugs
          </p>
          <p className="text-xs font-medium mt-2">
            {metrics.rugStatus}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-3">
        {/* Diversification Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Diversification Score</span>
            <span className="text-zinc-400">{metrics.diversificationScore}/100</span>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${metrics.diversificationScore}%` }}
            />
          </div>
        </div>

        {/* Execution Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Profitable Trades</span>
            <span className="text-zinc-400">
              {metrics.profitableTradesCount} / {metrics.totalTradesCount}
            </span>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              style={{ width: `${metrics.executionPercentage}%` }}
            />
          </div>
        </div>

        {/* Rug Rate Progress Bar (inverted - lower is better) */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Rug Exposure</span>
            <span className="text-zinc-400">
              {metrics.severeRugsCount + metrics.majorLossesCount} rugs
            </span>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                metrics.rugRate < 5 
                  ? 'bg-green-500' 
                  : metrics.rugRate < 10 
                    ? 'bg-orange-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(metrics.rugRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Average PnL per Trade */}
      <div className="mt-4 pt-4 border-t border-zinc-700/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Avg PnL per Trade</span>
          <span className={`text-sm font-semibold ${
            metrics.avgPnLPerTrade >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            ${metrics.avgPnLPerTrade.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
