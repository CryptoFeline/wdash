'use client';

import { WalletAnalysisMetrics, ReconstructedTrade } from '@/types/wallet';

interface RiskAnalysisProps {
  metrics: WalletAnalysisMetrics | undefined;
  trades: ReconstructedTrade[];
}

export default function RiskAnalysis({ metrics, trades }: RiskAnalysisProps) {
  if (!metrics) return null;

  // Calculate risk distribution
  const riskLevels = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  trades.forEach(t => {
    const level = Math.max(1, Math.min(5, t.riskLevel));
    riskLevels[level as keyof typeof riskLevels]++;
  });

  const totalTrades = trades.length;
  const highRiskTrades = riskLevels[4] + riskLevels[5];
  const highRiskPercentage = (highRiskTrades / totalTrades) * 100;

  // Calculate max drawdown
  let balance = 100000;
  let minBalance = balance;
  let maxDrawdown = 0;
  trades.forEach(t => {
    balance += t.realized_pnl;
    minBalance = Math.min(minBalance, balance);
    const drawdown = ((balance - minBalance) / balance) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  // Win/Loss analysis
  const wins = trades.filter(t => t.win);
  const losses = trades.filter(t => !t.win);
  const avgWinSize = wins.length > 0 ? wins.reduce((sum, t) => sum + t.realized_roi, 0) / wins.length : 0;
  const avgLossSize = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.realized_roi, 0) / losses.length) : 0;

  return (
    <div className="space-y-6">
      {/* Risk Distribution */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Risk Distribution</h3>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(riskLevels).map(([level, count]) => {
            const percentage = (count / totalTrades) * 100;
            const colors = [
              'bg-chart-4', // 1 - Green
              'bg-chart-3', // 2 - Yellow
              'bg-chart-2', // 3 - Orange
              'bg-chart-1', // 4 - Red
              'bg-destructive', // 5 - Dark Red
            ];
            return (
              <div key={level} className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Level {level}</p>
                <div className="h-24 bg-secondary/30 rounded-lg flex flex-col items-center justify-end overflow-hidden">
                  <div
                    className={`${colors[parseInt(level) - 1]} w-full transition-all`}
                    style={{ height: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-foreground mt-2">{count}</p>
                <p className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">High Risk Trades</p>
          <p className={`text-3xl font-bold ${highRiskPercentage > 30 ? 'text-destructive' : 'text-foreground'}`}>
            {highRiskPercentage.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-2">{highRiskTrades} trades (Levels 4-5)</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Win Size</p>
          <p className="text-3xl font-bold text-chart-4">{avgWinSize.toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground mt-2">{wins.length} winning trades</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Loss Size</p>
          <p className="text-3xl font-bold text-destructive">{avgLossSize.toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground mt-2">{losses.length} losing trades</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Win/Loss Ratio</p>
          <p className="text-3xl font-bold text-foreground">
            {avgLossSize > 0 ? (avgWinSize / avgLossSize).toFixed(2) : '∞'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Risk/Reward</p>
        </div>
      </div>

      {/* Risk Summary */}
      <div className="bg-secondary/20 rounded-lg border border-border p-4 space-y-2">
        <h4 className="font-semibold text-foreground">Risk Assessment</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            • High risk trades: <strong className="text-foreground">{highRiskPercentage.toFixed(0)}%</strong>
            {highRiskPercentage > 40 && ' (Consider reducing risk exposure)'}
          </li>
          <li>
            • Win/Loss ratio: <strong className="text-foreground">
              {avgLossSize > 0 ? (avgWinSize / avgLossSize).toFixed(2) : '∞'}
            </strong>
            {avgWinSize / avgLossSize > 2 && ' (Excellent risk management)'}
          </li>
          <li>
            • Average holding period: <strong className="text-foreground">
              {metrics.avg_holding_hours.toFixed(1)} hours
            </strong>
          </li>
        </ul>
      </div>
    </div>
  );
}
