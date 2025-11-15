'use client';

import { OKXWalletSummary } from '@/lib/okx-api-v2';
import { ReconstructedTrade } from '@/types/wallet';

interface TokenDiversityAnalysisProps {
  summary: OKXWalletSummary | undefined;
  trades: ReconstructedTrade[];
}

export default function TokenDiversityAnalysis({ summary, trades }: TokenDiversityAnalysisProps) {
  const uniqueTokens = new Set(trades.map(t => t.token_address)).size;
  const totalBuys = trades.length;
  const avgTokensPerMonth = Math.round(uniqueTokens / Math.max(1, Math.ceil(7 / 30)));
  const topTokens_ = summary?.topTokens || [];
  const avgUSDValue = topTokens_.length > 0 
    ? topTokens_.reduce((sum, t) => sum + parseFloat(t.pnl), 0) / topTokens_.length
    : 0;

  // Calculate token concentration (Herfindahl index)
  const tokenCounts: Record<string, number> = {};
  trades.forEach(t => {
    tokenCounts[t.token_address] = (tokenCounts[t.token_address] || 0) + 1;
  });
  
  const concentrationIndex = Object.values(tokenCounts).reduce((sum, count) => {
    return sum + Math.pow(count / trades.length, 2);
  }, 0);
  
  const diversityScore = Math.round((1 - concentrationIndex) * 100);

  // Get top tokens
  const topTokens = Object.entries(tokenCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([address, count]) => {
      const tokenTrades = trades.filter(t => t.token_address === address);
      const wins = tokenTrades.filter(t => t.win).length;
      return {
        address,
        count,
        percentage: (count / trades.length) * 100,
        winRate: (wins / count) * 100,
      };
    });

  const diversityLevel = diversityScore > 75 ? 'High' : diversityScore > 50 ? 'Medium' : 'Low';
  const diversityColor = diversityScore > 75 ? 'text-chart-4' : diversityScore > 50 ? 'text-chart-3' : 'text-destructive';

  return (
    <div className="space-y-6">
      {/* Diversity Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Unique Tokens</p>
          <p className="text-3xl font-bold text-foreground">{uniqueTokens}</p>
          <p className="text-xs text-muted-foreground mt-2">Total traded</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Diversity Score</p>
          <p className={`text-3xl font-bold ${diversityColor}`}>{diversityScore}</p>
          <p className="text-xs text-muted-foreground mt-2">{diversityLevel}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Tokens/Month</p>
          <p className="text-3xl font-bold text-foreground">{avgTokensPerMonth.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-2">Trading frequency</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg USD Value</p>
          <p className="text-3xl font-bold text-foreground">${avgUSDValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
          <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
        </div>
      </div>

      {/* Top Tokens */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Tokens by Transaction Count</h3>
        <div className="space-y-3">
          {topTokens.map((token, index) => (
            <div key={token.address} className="bg-card rounded-lg border border-border p-4 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                  <div>
                    <p className="text-sm font-mono text-foreground">{token.address.slice(0, 8)}...{token.address.slice(-4)}</p>
                    <p className="text-xs text-muted-foreground">{token.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{token.percentage.toFixed(1)}%</p>
                  <p className={`text-xs font-semibold ${token.winRate >= 50 ? 'text-chart-4' : 'text-destructive'}`}>
                    {token.winRate.toFixed(0)}% win rate
                  </p>
                </div>
              </div>
              
              {/* Progress bar for concentration */}
              <div className="w-full bg-secondary/30 rounded-full h-2">
                <div
                  className="bg-chart-4 h-2 rounded-full"
                  style={{ width: `${token.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-secondary/20 rounded-lg p-4 border border-border space-y-2">
        <p className="text-sm text-foreground font-semibold">Diversity Insights:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• You've traded <strong className="text-foreground">{uniqueTokens}</strong> different tokens</li>
          <li>• Your portfolio {diversityScore > 75 ? 'is well diversified' : diversityScore > 50 ? 'has moderate diversification' : 'is concentrated on few tokens'}</li>
          <li>• Top token represents <strong className="text-foreground">{topTokens[0]?.percentage.toFixed(1)}%</strong> of your trades</li>
          {diversityScore < 50 && (
            <li>• Consider broadening token selection to reduce concentration risk</li>
          )}
        </ul>
      </div>
    </div>
  );
}
