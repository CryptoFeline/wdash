'use client';

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { 
  formatUSD, 
  formatPercent,
  type OKXWalletSummary 
} from '@/lib/okx-api-v2';

// ============================================================================
// BALANCES CARD COMPONENT
// ============================================================================

interface BalancesCardProps {
  summary: OKXWalletSummary;
}

export function BalancesCard({ summary }: BalancesCardProps) {
  const nativeBalance = parseFloat(summary.nativeTokenBalanceAmount || '0');
  const nativeValue = parseFloat(summary.nativeTokenBalanceUsd || '0');
  
  // Calculate portfolio breakdown (top 3 + native + others)
  const top3Value = summary.topTokens.reduce((sum, token) => {
    // Approximate value from PnL (rough estimate)
    return sum + Math.abs(parseFloat(token.pnl || '0'));
  }, 0);
  
  const totalPortfolioValue = nativeValue + top3Value;

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Wallet className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-100">Portfolio Balance</h3>
      </div>

      {/* Total Value */}
      <div className="mb-6">
        <p className="text-sm text-zinc-500 mb-1">Total Value</p>
        <p className="text-3xl font-bold text-zinc-100">
          {formatUSD(totalPortfolioValue)}
        </p>
      </div>

      {/* Native Token Balance */}
      <div className="p-4 bg-zinc-900/50 rounded-lg mb-4 border border-zinc-700/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">SOL Balance</span>
          <span className="text-sm font-semibold text-zinc-200">
            {nativeBalance.toFixed(4)} SOL
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">USD Value</span>
          <span className="text-sm font-medium text-green-400">
            {formatUSD(nativeValue)}
          </span>
        </div>
      </div>

      {/* Top 3 Tokens */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Top Holdings
        </p>
        
        {summary.topTokens.map((token, index) => {
          const pnl = parseFloat(token.pnl || '0');
          const roi = parseFloat(token.roi || '0');
          const isProfitable = pnl >= 0;

          return (
            <div 
              key={token.tokenAddress}
              className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-lg border border-zinc-700/20 hover:border-zinc-600/40 transition-colors"
            >
              {/* Token Logo */}
              <div className="relative w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                {token.tokenLogo ? (
                  <Image 
                    src={token.tokenLogo} 
                    alt={token.tokenSymbol}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-zinc-400">
                    {token.tokenSymbol[0]}
                  </span>
                )}
              </div>

              {/* Token Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-200 truncate">
                    {token.tokenSymbol}
                  </span>
                  <span className="text-xs text-zinc-500 truncate">
                    {token.tokenName}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${
                    isProfitable ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatUSD(pnl)}
                  </span>
                  <span className={`text-xs ${
                    isProfitable ? 'text-green-400/80' : 'text-red-400/80'
                  }`}>
                    ({formatPercent(roi)})
                  </span>
                </div>
              </div>

              {/* Rank Badge */}
              <div className="px-2 py-1 bg-zinc-800 rounded text-xs font-bold text-zinc-400">
                #{index + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Portfolio Breakdown Bar */}
      <div className="mt-4 pt-4 border-t border-zinc-700/30">
        <p className="text-xs text-zinc-500 mb-2">Portfolio Distribution</p>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
          <div 
            className="bg-blue-500" 
            style={{ width: `${(nativeValue / totalPortfolioValue) * 100}%` }}
            title="SOL"
          />
          {summary.topTokens.map((token, i) => {
            const value = Math.abs(parseFloat(token.pnl || '0'));
            const percentage = (value / totalPortfolioValue) * 100;
            const colors = ['bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
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
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>SOL</span>
          </div>
          {summary.topTokens.slice(0, 3).map((token, i) => {
            const colors = ['bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
            return (
              <div key={token.tokenAddress} className="flex items-center gap-1.5">
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

  // Prepare chart data (7 days)
  const chartData = summary.datePnlList || [];
  const maxAbsPnL = Math.max(...chartData.map(d => Math.abs(parseFloat(d.profit))));

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            isProfitable ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {isProfitable ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">7-Day PnL</h3>
        </div>
        <div className={`text-right ${
          isProfitable ? 'text-green-400' : 'text-red-400'
        }`}>
          <p className="text-sm font-medium">{formatPercent(totalROI)}</p>
        </div>
      </div>

      {/* Total PnL */}
      <div className="mb-6">
        <p className="text-sm text-zinc-500 mb-1">Total PnL</p>
        <p className={`text-3xl font-bold ${
          isProfitable ? 'text-green-400' : 'text-red-400'
        }`}>
          {formatUSD(totalPnL)}
        </p>
      </div>

      {/* 7-Day Chart */}
      <div className="mb-6">
        <div className="flex items-end justify-between gap-1 h-32">
          {chartData.map((day, index) => {
            const profit = parseFloat(day.profit);
            const isPositive = profit >= 0;
            const heightPercent = maxAbsPnL > 0 
              ? (Math.abs(profit) / maxAbsPnL) * 100 
              : 0;
            
            return (
              <div 
                key={day.timestamp}
                className="flex-1 flex flex-col justify-end items-center group relative"
              >
                {/* Bar */}
                <div 
                  className={`w-full rounded-t transition-all ${
                    isPositive 
                      ? 'bg-green-500 group-hover:bg-green-400' 
                      : 'bg-red-500 group-hover:bg-red-400'
                  }`}
                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                />
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                    <p className={`font-semibold ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatUSD(profit)}
                    </p>
                    <p className="text-zinc-400">
                      {new Date(day.timestamp).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Day Label */}
                <p className="text-[10px] text-zinc-500 mt-1">
                  {new Date(day.timestamp).toLocaleDateString('en-US', { 
                    weekday: 'short' 
                  })[0]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Realized vs Unrealized Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <p className="text-xs text-zinc-500 mb-1">Realized</p>
          <p className={`text-lg font-semibold ${
            realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatUSD(realizedPnL)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {formatPercent(summary.totalProfitPnlRoi)}
          </p>
        </div>
        
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <p className="text-xs text-zinc-500 mb-1">Unrealized</p>
          <p className={`text-lg font-semibold ${
            unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatUSD(unrealizedPnL)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {formatPercent(summary.unrealizedPnlRoi)}
          </p>
        </div>
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
    const colors = ['text-green-500', 'text-green-400', 'text-orange-400', 'text-red-400'];
    const bgColors = ['bg-green-500', 'bg-green-400', 'bg-orange-400', 'bg-red-400'];
    return {
      label: labels[index],
      count,
      color: colors[index],
      bgColor: bgColors[index]
    };
  });

  const maxBracketCount = Math.max(...pnlBrackets.map(b => b.count), 1);

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">Win Rate</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-400">{winRate.toFixed(1)}%</p>
          <p className="text-xs text-zinc-500">Overall</p>
        </div>
      </div>

      {/* Win Rate Distribution (6 buckets) */}
      <div className="mb-6">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Win Rate Distribution
        </p>
        <div className="space-y-2">
          {winRateBuckets.map((bucket, index) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <div className="w-16 text-xs text-zinc-400 text-right">
                {bucket.label}
              </div>
              <div className="flex-1 bg-zinc-900/50 rounded-full h-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-end px-2 transition-all"
                  style={{ width: `${bucket.value}%` }}
                >
                  {bucket.value > 5 && (
                    <span className="text-xs font-semibold text-white">
                      {bucket.value.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PnL Brackets (4 brackets) */}
      <div className="pt-4 border-t border-zinc-700/30">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          PnL Distribution
        </p>
        <div className="grid grid-cols-4 gap-2">
          {pnlBrackets.map((bracket) => (
            <div 
              key={bracket.label}
              className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30 text-center"
            >
              <p className="text-xs text-zinc-500 mb-1">{bracket.label}</p>
              <p className={`text-lg font-bold ${bracket.color}`}>
                {bracket.count}
              </p>
              {/* Mini bar */}
              <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
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
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <DollarSign className="w-5 h-5 text-orange-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-100">Trading Stats</h3>
      </div>

      {/* Total Transactions */}
      <div className="mb-6">
        <p className="text-sm text-zinc-500 mb-1">Total Transactions</p>
        <p className="text-3xl font-bold text-zinc-100">{totalTxs.toLocaleString()}</p>
      </div>

      {/* Buy vs Sell */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <p className="text-xs text-green-400 mb-1">Buys</p>
          <p className="text-xl font-bold text-green-400">{totalBuys.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-1">{formatUSD(buyVolume)}</p>
        </div>
        
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-xs text-red-400 mb-1">Sells</p>
          <p className="text-xl font-bold text-red-400">{totalSells.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-1">{formatUSD(sellVolume)}</p>
        </div>
      </div>

      {/* Buy/Sell Ratio Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span>Buy/Sell Ratio</span>
          <span>{buyRatio.toFixed(1)}% / {(100 - buyRatio).toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-zinc-900 rounded-full overflow-hidden flex">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-400"
            style={{ width: `${buyRatio}%` }}
          />
          <div 
            className="bg-gradient-to-r from-red-400 to-red-500"
            style={{ width: `${100 - buyRatio}%` }}
          />
        </div>
      </div>

      {/* Average Buy Cost */}
      <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
        <p className="text-xs text-zinc-500 mb-1">Avg Buy Cost</p>
        <p className="text-lg font-semibold text-zinc-200">{formatUSD(avgCost)}</p>
      </div>
    </div>
  );
}
