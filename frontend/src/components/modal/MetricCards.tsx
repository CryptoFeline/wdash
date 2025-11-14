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
    color: ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-5', 'bg-destructive'][index]
  }));

  const maxCount = Math.max(...mcapData.map(m => m.count), 1);
  const totalBuys = mcapData.reduce((sum, m) => sum + m.count, 0);

  // Determine favorite market cap range
  const favoriteIndex = parseInt(summary.favoriteMcapType || '0');
  const favoriteLabel = MCAP_LABELS[favoriteIndex] || MCAP_LABELS[0];

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-chart-5/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-chart-5" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Market Cap Preference</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Favorite</p>
          <p className="text-sm font-semibold text-chart-5">{favoriteLabel}</p>
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
                    isFavorite ? 'text-chart-5' : 'text-muted-foreground'
                  }`}>
                    {mcap.label}
                  </span>
                  {isFavorite && (
                    <span className="px-1.5 py-0.5 bg-chart-5/20 text-chart-5 text-[10px] font-bold rounded">
                      TOP
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {mcap.count} buys ({percentage.toFixed(1)}%)
                </span>
              </div>
              
              {/* Horizontal Bar */}
              <div className="h-6 bg-secondary rounded-lg overflow-hidden">
                <div 
                  className={`h-full ${mcap.color} flex items-center px-3 transition-all group-hover:opacity-90`}
                  style={{ width: `${(mcap.count / maxCount) * 100}%` }}
                >
                  {mcap.count > maxCount * 0.1 && (
                    <span className="text-xs font-semibold text-foreground">
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
      <div className="mt-4 pt-4 border-t border-input">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Buy Transactions</span>
          <span className="font-semibold text-foreground">{totalBuys.toLocaleString()}</span>
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
          bg: 'bg-chart-4/20',
          border: 'border-chart-4/40',
          text: 'text-chart-4',
          icon: Shield
        };
      case 'MEDIUM':
        return {
          bg: 'bg-chart-5/20',
          border: 'border-chart-5/40',
          text: 'text-chart-5',
          icon: AlertTriangle
        };
      case 'HIGH':
        return {
          bg: 'bg-destructive/20',
          border: 'border-destructive/40',
          text: 'text-destructive',
          icon: AlertTriangle
        };
    }
  };

  const riskStyle = getRiskLevelStyle(metrics.riskLevel);
  const RiskIcon = riskStyle.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${riskStyle.bg} rounded-lg border ${riskStyle.border}`}>
            <RiskIcon className={`w-5 h-5 ${riskStyle.text}`} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Quality Metrics</h3>
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
        <div className="p-4 bg-secondary/50 rounded-lg border border-input">
          <p className="text-xs text-muted-foreground mb-2">Diversification</p>
          <div className="flex items-baseline gap-1 mb-1">
            <p className="text-2xl font-bold text-foreground">
              {metrics.diversificationScore}
            </p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Avg ROI: {metrics.avgROI.toFixed(1)}%
          </p>
          <p className="text-xs font-medium mt-2">
            {metrics.diversificationStatus}
          </p>
        </div>

        {/* Execution Score */}
        <div className="p-4 bg-secondary/50 rounded-lg border border-input">
          <p className="text-xs text-muted-foreground mb-2">Execution</p>
          <div className="flex items-baseline gap-1 mb-1">
            <p className="text-2xl font-bold text-foreground">
              {metrics.executionPercentage.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">%</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {metrics.profitableTradesCount}/{metrics.totalTradesCount} profitable
          </p>
          <p className="text-xs font-medium mt-2">
            {metrics.executionStatus}
          </p>
        </div>

        {/* Rug Rate */}
        <div className="p-4 bg-secondary/50 rounded-lg border border-input">
          <p className="text-xs text-muted-foreground mb-2">Rug Rate</p>
          <div className="flex items-baseline gap-1 mb-1">
            <p className="text-2xl font-bold text-foreground">
              {metrics.rugRate.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">%</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
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
            <span className="text-muted-foreground">Diversification Score</span>
            <span className="text-muted-foreground">{metrics.diversificationScore}/100</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-chart-1 to-chart-2"
              style={{ width: `${metrics.diversificationScore}%` }}
            />
          </div>
        </div>

        {/* Execution Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Profitable Trades</span>
            <span className="text-muted-foreground">
              {metrics.profitableTradesCount} / {metrics.totalTradesCount}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-chart-4 to-chart-3"
              style={{ width: `${metrics.executionPercentage}%` }}
            />
          </div>
        </div>

        {/* Rug Rate Progress Bar (inverted - lower is better) */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Rug Exposure</span>
            <span className="text-muted-foreground">
              {metrics.severeRugsCount + metrics.majorLossesCount} rugs
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                metrics.rugRate < 5 
                  ? 'bg-chart-4' 
                  : metrics.rugRate < 10 
                    ? 'bg-chart-5' 
                    : 'bg-destructive'
              }`}
              style={{ width: `${Math.min(metrics.rugRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Average PnL per Trade */}
      <div className="mt-4 pt-4 border-t border-input">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Avg PnL per Trade</span>
          <span className={`text-sm font-semibold ${
            metrics.avgPnLPerTrade >= 0 ? 'text-chart-4' : 'text-destructive'
          }`}>
            ${metrics.avgPnLPerTrade.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
