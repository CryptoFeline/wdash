'use client';

import { WalletAnalysisMetrics } from '@/types/wallet';
import { formatUSD, formatPercent } from '@/lib/okx-api-v2';
import { TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react';

interface MetricsCardsProps {
  metrics: WalletAnalysisMetrics;
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Win Rate Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</p>
          <TrendingUp className="w-4 h-4 text-chart-4" />
        </div>
        <p className="text-3xl font-bold text-foreground">{metrics.win_rate.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground mt-2">
          {metrics.win_count} of {metrics.total_trades} trades
        </p>
      </div>

      {/* Realized ROI Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Realized ROI</p>
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <p className={`text-3xl font-bold ${
          metrics.avg_realized_roi >= 0 ? 'text-chart-4' : 'text-destructive'
        }`}>
          {metrics.avg_realized_roi >= 0 ? '+' : ''}{metrics.avg_realized_roi.toFixed(2)}%
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Median: {metrics.median_realized_roi.toFixed(2)}%
        </p>
      </div>

      {/* Total PnL Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total PnL</p>
          <TrendingDown className={`w-4 h-4 ${metrics.total_realized_pnl >= 0 ? 'text-chart-4' : 'text-destructive'}`} />
        </div>
        <p className={`text-3xl font-bold ${
          metrics.total_realized_pnl >= 0 ? 'text-chart-4' : 'text-destructive'
        }`}>
          {formatUSD(metrics.total_realized_pnl)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {metrics.win_count} wins | {metrics.loss_count} losses
        </p>
      </div>

      {/* Avg Holding Time Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Hold Time</p>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold text-foreground">
          {metrics.avg_holding_hours.toFixed(1)}h
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Winners: {metrics.avg_holding_hours_winners.toFixed(1)}h | Losers: {metrics.avg_holding_hours_losers.toFixed(1)}h
        </p>
      </div>
    </div>
  );
}
