'use client';

import { WalletAnalysisMetrics, ReconstructedTrade } from '@/types/wallet';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Droplet, Shield } from 'lucide-react';

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

  // Rug detection metrics
  const ruggedTrades = trades.filter(t => t.is_rug);
  const hardRugs = ruggedTrades.filter(t => t.rug_type === 'hard_rug').length;
  const softRugs = ruggedTrades.filter(t => t.rug_type === 'soft_rug').length;
  const rugExposurePercentage = (ruggedTrades.length / totalTrades) * 100;

  // Liquidity warnings
  const liquidityIssues = trades.filter(t => 
    t.liquidity_status === 'drained' || t.liquidity_status === 'low' || t.liquidity_status === 'warning'
  );
  const cannotExit = trades.filter(t => t.can_exit === false).length;

    // Developer rug history
  const devsWithRugHistory = trades.filter(t => t.dev_rugged_tokens && t.dev_rugged_tokens > 0);

  // Scam detection from metrics
  const scamDetection = metrics.scam_detection;
  const hasScamDetection = scamDetection && scamDetection.total_scam_tokens > 0;

  return (
    <div className="space-y-6">
      {/* Scam Token Detection Alert */}
      {hasScamDetection && (
        <div className={`border rounded-lg p-4 ${
          scamDetection.risk_level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/50' :
          scamDetection.risk_level === 'HIGH' ? 'bg-orange-500/10 border-orange-500/50' :
          scamDetection.risk_level === 'MODERATE' ? 'bg-yellow-500/10 border-yellow-500/50' :
          'bg-blue-500/10 border-blue-500/50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`h-5 w-5 ${
              scamDetection.risk_level === 'CRITICAL' ? 'text-red-500' :
              scamDetection.risk_level === 'HIGH' ? 'text-orange-500' :
              scamDetection.risk_level === 'MODERATE' ? 'text-yellow-500' :
              'text-blue-500'
            }`} />
            <h3 className={`text-lg font-semibold ${
              scamDetection.risk_level === 'CRITICAL' ? 'text-red-500' :
              scamDetection.risk_level === 'HIGH' ? 'text-orange-500' :
              scamDetection.risk_level === 'MODERATE' ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              Scam Token Detection
            </h3>
            <Badge variant={
              scamDetection.risk_level === 'CRITICAL' ? 'destructive' :
              scamDetection.risk_level === 'HIGH' ? 'destructive' :
              scamDetection.risk_level === 'MODERATE' ? 'secondary' :
              'outline'
            }>
              {scamDetection.risk_level} RISK
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Scam Tokens</p>
              <p className="text-2xl font-bold text-red-500">{scamDetection.total_scam_tokens}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Participation Rate</p>
              <p className="text-2xl font-bold text-orange-500">{scamDetection.scam_participation_rate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clean Trades</p>
              <p className="text-2xl font-bold text-green-500">{metrics.total_trades}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {scamDetection.warning}
          </p>
          {metrics._raw_stats && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">📊 Impact of Scam Filtering:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Raw Trades:</span> 
                  <span className="ml-2 font-semibold">{metrics._raw_stats.totalTrades}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Clean Trades:</span> 
                  <span className="ml-2 font-semibold text-green-500">{metrics.total_trades}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Raw Avg Win:</span> 
                  <span className="ml-2 font-semibold text-red-500">{metrics._raw_stats.avgWinSize.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">True Avg Win:</span> 
                  <span className="ml-2 font-semibold text-green-500">{(metrics.total_realized_pnl_wins / metrics.win_count).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                ✅ All metrics shown are calculated from legitimate trades only
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Rug Detection Alert */}
      {ruggedTrades.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-red-500">Rug Pull Detection Alert</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Rugged</p>
              <p className="text-2xl font-bold text-red-500">{ruggedTrades.length}</p>
```
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hard Rugs</p>
              <p className="text-2xl font-bold text-red-600">{hardRugs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Soft Rugs</p>
              <p className="text-2xl font-bold text-orange-500">{softRugs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Exposure</p>
              <p className="text-2xl font-bold text-red-500">{rugExposurePercentage.toFixed(0)}%</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {rugExposurePercentage > 20 
              ? '⚠️ High rug exposure! Review token selection criteria and due diligence.'
              : 'Monitor these tokens closely and consider exit strategies.'}
          </p>
        </div>
      )}

      {/* Liquidity Risk */}
      {liquidityIssues.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-yellow-600">Liquidity Warnings</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Tokens with Issues</p>
              <p className="text-2xl font-bold text-yellow-600">{liquidityIssues.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cannot Exit</p>
              <p className="text-2xl font-bold text-red-500">{cannotExit}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">% of Portfolio</p>
              <p className="text-2xl font-bold text-yellow-600">
                {((liquidityIssues.length / totalTrades) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Developer Rug History */}
      {devsWithRugHistory.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            Developer Rug History
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            {devsWithRugHistory.length} token(s) have developers with previous rug pull history
          </p>
          <div className="text-xs text-muted-foreground">
            Total rugged tokens by these devs: {' '}
            <span className="font-bold text-foreground">
              {devsWithRugHistory.reduce((sum, t) => sum + (t.dev_rugged_tokens || 0), 0)}
            </span>
          </div>
        </div>
      )}

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
          {ruggedTrades.length > 0 && (
            <li>
              • Rug pull exposure: <strong className="text-red-500">{rugExposurePercentage.toFixed(0)}%</strong>
              {' '}({ruggedTrades.length} tokens)
            </li>
          )}
          {liquidityIssues.length > 0 && (
            <li>
              • Liquidity warnings: <strong className="text-yellow-600">{liquidityIssues.length} tokens</strong>
              {cannotExit > 0 && ` (${cannotExit} cannot exit)`}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
