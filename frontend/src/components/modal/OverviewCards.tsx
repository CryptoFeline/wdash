'use client';

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { 
  formatUSD, 
  formatPercent,
  type OKXWalletSummary 
} from '@/lib/okx-api-v2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ============================================================================
// BALANCES CARD COMPONENT
// ============================================================================

interface BalancesCardProps {
  summary: OKXWalletSummary;
  tokenList?: any[];  // Full token holdings data
}

export function BalancesCard({ summary, tokenList = [] }: BalancesCardProps) {
  const nativeBalance = parseFloat(summary.nativeTokenBalanceAmount || '0');
  const nativeValue = parseFloat(summary.nativeTokenBalanceUsd || '0');
  
  // Ensure topTokens is an array (defensive programming)
  const topTokens = summary.topTokens || [];
  
  // Calculate total portfolio value from all holdings (not just top 3)
  // If tokenList is provided, use it for accurate total; otherwise fallback to top 3 estimate
  let totalPortfolioValue = nativeValue;
  
  if (tokenList && tokenList.length > 0) {
    // Use actual holdings data for accurate total
    const holdingsValue = tokenList.reduce((sum, token) => {
      const usdValue = parseFloat(token.balanceUsd || '0');
      return sum + (usdValue > 0 ? usdValue : 0);
    }, 0);
    totalPortfolioValue += holdingsValue;
  } else {
    // Fallback: estimate from top 3 tokens' PnL
    const top3Value = topTokens.reduce((sum, token) => {
      return sum + Math.abs(parseFloat(token.pnl || '0'));
    }, 0);
    totalPortfolioValue += top3Value;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-chart-1/20 rounded-lg">
          <Wallet className="w-5 h-5 text-chart-1" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Portfolio Balance</h3>
      </div>

      {/* Total Value */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">Total Value</p>
        <p className="text-3xl font-bold text-foreground">
          {formatUSD(totalPortfolioValue)}
        </p>
      </div>

      {/* Native Token Balance */}
      <div className="p-4 bg-secondary/50 rounded-lg mb-4 border border-input">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">SOL Balance</span>
          <span className="text-sm font-semibold text-foreground">
            {nativeBalance.toFixed(4)} SOL
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">USD Value</span>
          <span className="text-sm font-medium text-chart-4">
            {formatUSD(nativeValue)}
          </span>
        </div>
      </div>

      {/* Top 3 Tokens */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Top Holdings
        </p>
        
        {topTokens.map((token, index) => {
          const pnl = parseFloat(token.pnl || '0');
          const roi = parseFloat(token.roi || '0');
          const isProfitable = pnl >= 0;

          return (
            <div 
              key={token.tokenAddress}
              className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-input hover:border-border transition-colors"
            >
              {/* Token Logo */}
              <div className="relative w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {token.tokenLogo ? (
                  <Image 
                    src={token.tokenLogo} 
                    alt={token.tokenSymbol}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">
                    {token.tokenSymbol[0]}
                  </span>
                )}
              </div>

              {/* Token Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {token.tokenSymbol}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {token.tokenName}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${
                    isProfitable ? 'text-chart-4' : 'text-destructive'
                  }`}>
                    {formatUSD(pnl)}
                  </span>
                  <span className={`text-xs ${
                    isProfitable ? 'text-chart-4/80' : 'text-destructive/80'
                  }`}>
                    ({formatPercent(roi)})
                  </span>
                </div>
              </div>

              {/* Rank Badge */}
              <div className="px-2 py-1 bg-secondary rounded text-xs font-bold text-muted-foreground">
                #{index + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Portfolio Breakdown Bar */}
      <div className="mt-4 pt-4 border-t border-input">
        <p className="text-xs text-muted-foreground mb-2">Portfolio Distribution</p>
        <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
          <div 
            className="bg-chart-1" 
            style={{ width: `${(nativeValue / totalPortfolioValue) * 100}%` }}
            title="SOL"
          />
          {topTokens.map((token, i) => {
            const value = Math.abs(parseFloat(token.pnl || '0'));
            const percentage = (value / totalPortfolioValue) * 100;
            const colors = ['bg-chart-2', 'bg-chart-3', 'bg-chart-5'];
            return (
              <div 
                key={token.tokenAddress}
                className={colors[i % colors.length]}
                style={{ width: `${percentage}%` }}
                title={token.tokenSymbol}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-chart-1 rounded-full" />
            <span>SOL</span>
          </div>
          {topTokens.map((token, i) => {
            const colors = ['bg-chart-2', 'bg-chart-3', 'bg-chart-5'];
            return (
              <div key={token.tokenAddress} className="flex items-center gap-1">
                <div className={`w-2 h-2 ${colors[i]} rounded-full`} />
                <span>{token.tokenSymbol}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PNL CARD COMPONENT
// ============================================================================

interface PnLCardProps {
  summary: OKXWalletSummary;
}

export function PnLCard({ summary }: PnLCardProps) {
  const totalPnL = parseFloat(summary.totalPnl || '0');
  const realizedPnL = parseFloat(summary.totalProfitPnl || '0');
  const unrealizedPnL = parseFloat(summary.unrealizedPnl || '0');
  const totalROI = parseFloat(summary.totalPnlRoi || '0');
  const isProfitable = totalPnL >= 0;
  const realizedRoi = parseFloat(summary.totalProfitPnlRoi || '0');
  const unrealizedRoi = parseFloat(summary.unrealizedPnlRoi || '0');

  // Prepare chart data (7 days) - ensure proper data types
  const chartData = (summary.datePnlList || []).map(item => ({
    timestamp: parseInt(String(item.timestamp)) || 0,
    profit: parseFloat(String(item.profit)) || 0
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {isProfitable ? (
          <TrendingUp className="w-5 h-5 text-chart-4" />
        ) : (
          <TrendingDown className="w-5 h-5 text-destructive" />
        )}
        <h3 className="text-lg font-semibold text-foreground">7-Day PnL</h3>
      </div>

      {/* Total PnL */}
      <div className="mb-4">
        <p className={`text-2xl font-bold ${
          isProfitable ? 'text-chart-4' : 'text-destructive'
        }`}>
          {isProfitable ? '+' : ''}{formatUSD(totalPnL)}
        </p>
      </div>

      {/* PnL Breakdown Row */}
      <div className="space-y-3">
        <div className="p-3 bg-secondary/50 rounded-lg border border-input">
          <p className="text-xs text-muted-foreground mb-1">Realized</p>
          <p className={`text-lg font-semibold ${
            realizedPnL >= 0 ? 'text-chart-4' : 'text-destructive'
          }`}>
            {realizedPnL >= 0 ? '+' : ''}{formatUSD(realizedPnL)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ({formatPercent(realizedRoi)})
          </p>
        </div>

        <div className="p-3 bg-secondary/50 rounded-lg border border-input">
          <p className="text-xs text-muted-foreground mb-1">Unrealized</p>
          <p className={`text-lg font-semibold ${
            unrealizedPnL >= 0 ? 'text-chart-4' : 'text-destructive'
          }`}>
            {unrealizedPnL >= 0 ? '+' : ''}{formatUSD(unrealizedPnL)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ({formatPercent(unrealizedRoi)})
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 mt-4">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <p>No PnL data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(ts: any) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: any) => [formatUSD(parseFloat(value || '0')), 'PnL']}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--chart-1))"
                dot={false}
                isAnimationActive={false}
                name="Daily PnL"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WIN RATE CARD COMPONENT
// ============================================================================

interface WinRateCardProps {
  summary: OKXWalletSummary;
}

export function WinRateCard({ summary }: WinRateCardProps) {
  const winRate = parseFloat(summary.totalWinRate || '0');
  
  // Win rate buckets (6 buckets from API)
  const winRateBuckets = (summary.winRateList || []).map((value, index) => {
    const labels = ['100%', '100-75%', '75-50%', '50-25%', '25-0%', '0%'];
    return {
      label: labels[index],
      value: parseFloat(value)
    };
  });

  // PnL distribution (4 brackets from API)
  const pnlBrackets = (summary.newWinRateDistribution || []).map((count, index) => {
    const labels = ['>500%', '0-500%', '-50%-0%', '<-50%'];
    const colors = ['text-chart-4', 'text-chart-3', 'text-chart-5', 'text-destructive'];
    const bgColors = ['bg-chart-4', 'bg-chart-3', 'bg-chart-5', 'bg-destructive'];
    return {
      label: labels[index],
      count,
      color: colors[index],
      bgColor: bgColors[index]
    };
  });

  const maxBracketCount = Math.max(...pnlBrackets.map(b => b.count), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-chart-2/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-chart-2" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Win Rate</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-chart-2">{winRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Overall</p>
        </div>
      </div>

      {/* Win Rate Distribution (6 buckets) */}
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Win Rate Distribution
        </p>
        <div className="space-y-2">
          {winRateBuckets.map((bucket, index) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <div className="w-16 text-xs text-muted-foreground text-right">
                {bucket.label}
              </div>
              <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-chart-1 to-chart-2 flex items-center justify-end px-2 transition-all rounded-full"
                  style={{ width: `${bucket.value}%` }}
                >
                  {bucket.value > 5 && (
                    <span className="text-xs font-semibold text-foreground">
                      {bucket.value.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PnL Brackets (4 brackets) */}
      <div className="pt-4 border-t border-input">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          PnL Distribution
        </p>
        <div className="grid grid-cols-4 gap-2">
          {pnlBrackets.map((bracket) => (
            <div 
              key={bracket.label}
              className="p-3 bg-secondary/50 rounded-lg border border-input text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">{bracket.label}</p>
              <p className={`text-lg font-bold ${bracket.color}`}>
                {bracket.count}
              </p>
              {/* Mini bar */}
              <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={bracket.bgColor}
                  style={{ width: `${(bracket.count / maxBracketCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRADING STATS CARD COMPONENT
// ============================================================================

interface TradingStatsCardProps {
  summary: OKXWalletSummary;
}

export function TradingStatsCard({ summary }: TradingStatsCardProps) {
  const totalBuys = summary.totalTxsBuy || 0;
  const totalSells = summary.totalTxsSell || 0;
  const buyVolume = parseFloat(summary.totalVolumeBuy || '0');
  const sellVolume = parseFloat(summary.totalVolumeSell || '0');
  const avgCost = parseFloat(summary.avgCostBuy || '0');
  
  const totalTxs = totalBuys + totalSells;
  const totalVolume = buyVolume + sellVolume;
  const buyRatio = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-chart-5/20 rounded-lg">
          <DollarSign className="w-5 h-5 text-chart-5" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Trading Stats</h3>
      </div>

      {/* Total Transactions */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
        <p className="text-3xl font-bold text-foreground">{totalTxs.toLocaleString()}</p>
      </div>

      {/* Buy vs Sell */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-chart-4/10 rounded-lg border border-chart-4/20">
          <p className="text-xs text-chart-4 mb-1">Buys</p>
          <p className="text-xl font-bold text-chart-4">{totalBuys.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatUSD(buyVolume)}</p>
        </div>
        
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-xs text-destructive mb-1">Sells</p>
          <p className="text-xl font-bold text-destructive">{totalSells.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatUSD(sellVolume)}</p>
        </div>
      </div>

      {/* Buy/Sell Ratio Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Buy/Sell Ratio</span>
          <span>{buyRatio.toFixed(1)}% / {(100 - buyRatio).toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden flex">
          <div 
            className="bg-gradient-to-r from-chart-4 to-chart-4"
            style={{ width: `${buyRatio}%` }}
          />
          <div 
            className="bg-gradient-to-r from-destructive to-destructive"
            style={{ width: `${100 - buyRatio}%` }}
          />
        </div>
      </div>

      {/* Average Buy Cost */}
      <div className="p-3 bg-secondary/50 rounded-lg border border-input">
        <p className="text-xs text-muted-foreground mb-1">Avg Buy Cost</p>
        <p className="text-lg font-semibold text-foreground">{formatUSD(avgCost)}</p>
      </div>
    </div>
  );
}
