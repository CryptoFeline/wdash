'use client';

import { OKXWalletSummary } from '@/lib/okx-api-v2';
import { ReconstructedTrade } from '@/types/wallet';

interface MarketCapAnalysisProps {
  summary: OKXWalletSummary | undefined;
  trades: ReconstructedTrade[];
}

const BRACKET_NAMES = [
  '<$100k',
  '$100k-$1M',
  '$1M-$10M',
  '$10M-$100M',
  '>$100M'
];

export default function MarketCapAnalysis({ summary, trades }: MarketCapAnalysisProps) {
  const mcapCounts = summary?.mcapTxsBuyList || [0, 0, 0, 0, 0];
  const favoriteIndex = parseInt(summary?.favoriteMcapType || '0');
  const totalBuys = mcapCounts.reduce((a, b) => a + b, 0);

  // Calculate performance by market cap bracket
  const bracketPerformance = mcapCounts.map((count, index) => {
    const bracketTrades = trades.filter(t => t.mcap_bracket === index);
    const bracketWins = bracketTrades.filter(t => t.win);
    const winRate = bracketTrades.length > 0 
      ? (bracketWins.length / bracketTrades.length) * 100 
      : 0;
    const avgRoi = bracketTrades.length > 0
      ? bracketTrades.reduce((sum, t) => sum + t.realized_roi, 0) / bracketTrades.length
      : 0;

    return {
      bracket: BRACKET_NAMES[index],
      count,
      percentage: totalBuys > 0 ? (count / totalBuys) * 100 : 0,
      winRate,
      avgRoi,
      isFavorite: index === favoriteIndex,
    };
  });

  return (
    <div className="space-y-6">
      {/* Market Cap Bracket Grid */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Market Cap Bracket Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {bracketPerformance.map((bracket) => (
            <div
              key={bracket.bracket}
              className={`p-4 rounded-lg border transition-colors ${
                bracket.isFavorite
                  ? 'bg-primary/20 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <p className="text-xs text-muted-foreground mb-1">{bracket.bracket}</p>
              <p className="text-2xl font-bold text-foreground">{bracket.count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {bracket.percentage.toFixed(0)}% of buys
              </p>
              {bracket.isFavorite && (
                <p className="text-xs text-primary mt-2 font-semibold">⭐ Favorite</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Performance by Bracket */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Performance by Market Cap</h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Market Cap Bracket</th>
                <th className="px-6 py-3 text-right">Trades</th>
                <th className="px-6 py-3 text-right">Win Rate</th>
                <th className="px-6 py-3 text-right">Avg ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bracketPerformance.map((bracket) => (
                <tr
                  key={bracket.bracket}
                  className={`hover:bg-secondary/20 ${bracket.isFavorite ? 'bg-primary/10' : ''}`}
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-foreground">
                      {bracket.bracket}
                      {bracket.isFavorite && <span className="ml-2">⭐</span>}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-foreground">{bracket.count}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`text-sm font-semibold ${
                      bracket.winRate >= 50 ? 'text-chart-4' : 'text-destructive'
                    }`}>
                      {bracket.winRate.toFixed(1)}%
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`text-sm font-semibold ${
                      bracket.avgRoi >= 0 ? 'text-chart-4' : 'text-destructive'
                    }`}>
                      {bracket.avgRoi >= 0 ? '+' : ''}{bracket.avgRoi.toFixed(2)}%
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Summary */}
      <div className="bg-secondary/20 rounded-lg p-4 border border-border">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Market Cap Strategy:</strong> This wallet shows a preference for{' '}
          <strong className="text-foreground">{BRACKET_NAMES[favoriteIndex]}</strong> market cap tokens,
          with {bracketPerformance[favoriteIndex].count} transactions in this bracket ({bracketPerformance[favoriteIndex].percentage.toFixed(0)}% of total buys).
        </p>
      </div>
    </div>
  );
}
