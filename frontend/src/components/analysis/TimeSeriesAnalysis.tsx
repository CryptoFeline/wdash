'use client';

import { OKXWalletSummary } from '@/lib/okx-api-v2';
import { WalletAnalysisMetrics } from '@/types/wallet';

interface TimeSeriesAnalysisProps {
  summary: OKXWalletSummary | undefined;
  metrics: WalletAnalysisMetrics | undefined;
}

export default function TimeSeriesAnalysis({ summary, metrics }: TimeSeriesAnalysisProps) {
  if (!summary || !metrics) return null;

  const datePnlList = summary.datePnlList || [];
  const topTokens = summary.topTokens || [];

  // Parse values to numbers
  const totalPnlValue = parseFloat(summary.totalPnl || '0');
  const totalProfitValue = parseFloat(summary.totalProfitPnl || '0');
  const unrealizedPnlValue = parseFloat(summary.unrealizedPnl || '0');

  // Find max value for scaling
  const maxPnl = Math.max(
    ...datePnlList.map(d => parseFloat(d.profit)),
    0
  );

  return (
    <div className="space-y-6">
      {/* PnL Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">7-Day PnL</p>
          <p className={`text-3xl font-bold ${totalPnlValue >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
            ${totalPnlValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-sm font-semibold mt-1 ${parseFloat(summary.totalPnlRoi || '0') >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
            {parseFloat(summary.totalPnlRoi || '0') >= 0 ? '+' : ''}{parseFloat(summary.totalPnlRoi || '0').toFixed(2)}%
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Realized Profit</p>
          <p className={`text-3xl font-bold ${totalProfitValue >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
            ${totalProfitValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-sm font-semibold mt-1 ${parseFloat(summary.totalProfitPnlRoi || '0') >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
            {parseFloat(summary.totalProfitPnlRoi || '0') >= 0 ? '+' : ''}{parseFloat(summary.totalProfitPnlRoi || '0').toFixed(2)}%
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Unrealized PnL</p>
          <p className={`text-3xl font-bold ${unrealizedPnlValue >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
            ${unrealizedPnlValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-sm font-semibold mt-1 ${parseFloat(summary.unrealizedPnlRoi || '0') >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
            {parseFloat(summary.unrealizedPnlRoi || '0') >= 0 ? '+' : ''}{parseFloat(summary.unrealizedPnlRoi || '0').toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Daily PnL Chart */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">7-Day PnL Trend</h3>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-end gap-2 h-40">
            {datePnlList.map((day, index) => {
              const pnlValue = parseFloat(day.profit);
              const percentage = maxPnl > 0 ? (pnlValue / maxPnl) * 100 : 0;
              const isPositive = pnlValue >= 0;
              const date = new Date(day.timestamp);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={day.timestamp} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center gap-1">
                    <div
                      className={`flex-1 rounded-t transition-all ${
                        isPositive ? 'bg-chart-4' : 'bg-destructive'
                      }`}
                      style={{ height: `${Math.max(Math.abs(percentage), 5)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{dayName}</p>
                  <p className={`text-xs font-semibold ${isPositive ? 'text-chart-4' : 'text-destructive'}`}>
                    ${pnlValue.toFixed(0)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Tokens Performance */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Performing Tokens</h3>
        <div className="space-y-3">
          {topTokens.slice(0, 5).map((token, index) => {
            const pnlValue = parseFloat(token.pnl);
            const roiValue = parseFloat(token.roi);
            return (
              <div key={token.tokenAddress} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{token.tokenSymbol}</p>
                      <p className="text-xs text-muted-foreground">{token.tokenName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${pnlValue >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
                      ${pnlValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className={`text-xs font-semibold ${roiValue >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
                      {roiValue >= 0 ? '+' : ''}{roiValue.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="w-full bg-secondary/30 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${pnlValue >= 0 ? 'bg-chart-4' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(Math.abs(roiValue) / 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trading Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Buys</p>
          <p className="text-3xl font-bold text-foreground">{summary.totalTxsBuy}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Sells</p>
          <p className="text-3xl font-bold text-foreground">{summary.totalTxsSell}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
          <p className="text-3xl font-bold text-foreground">{parseFloat(summary.totalWinRate || '0').toFixed(1)}%</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Native Balance</p>
          <p className="text-3xl font-bold text-foreground">
            {parseFloat(summary.nativeTokenBalanceAmount || '0').toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ${parseFloat(summary.nativeTokenBalanceUsd || '0').toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
}
