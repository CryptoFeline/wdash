'use client';

import { useState } from 'react';
import { BarChart3, Coins, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber, formatUSD, formatPercent } from '@/lib/utils';

interface AdvancedAnalyticsContentProps {
  data: any;
  loading: boolean;
  error: string | null;
}

export default function AdvancedAnalyticsContent({ data, loading, error }: AdvancedAnalyticsContentProps) {
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'trades'>('overview');
  const [tradesSubTab, setTradesSubTab] = useState<'closed' | 'open'>('closed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Error
        </h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!data) {
    console.log('[AdvancedAnalyticsContent] No data provided, loading:', loading);
    return null;
  }

  if (!data.overview) {
    console.error('[AdvancedAnalyticsContent] Data missing overview:', data);
    return (
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6">
        <h3 className="text-lg font-bold text-yellow-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Invalid Data Structure
        </h3>
        <p className="text-yellow-300">The analytics data is missing required fields. Please try again.</p>
      </div>
    );
  }

  // ============================================================
  // HELPER FUNCTIONS & CALCULATIONS
  // ============================================================

  const formatROI = (roiPercent: number) => {
    const multiplier = (roiPercent / 100) + 1;
    return `${multiplier.toFixed(2)}x`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
    return `${(seconds / 86400).toFixed(1)}d`;
  };

  // Basic counts
  const totalTrades = data.overview.total_trades || 0;
  const closedTrades = data.overview.closed_trades || 0;
  const openTrades = data.overview.open_positions || 0;

  // Tokens data
  const tokens = data.tokens || [];
  const totalTokens = tokens.length;
  const ruggedTokens = tokens.filter((t: any) => t.is_rugged).length;
  const tradedRugTokens = tokens.filter((t: any) => t.traded_rug_token).length; // Tokens that rugged AFTER we traded

  // Calculate profitable/losing tokens
  const profitableTokens = tokens.filter((t: any) => (t.net_pnl || 0) > 0);
  const losingTokens = tokens.filter((t: any) => (t.net_pnl || 0) < 0);
  
  // Token-level averages
  const avgPnlPerToken = totalTokens > 0 
    ? tokens.reduce((sum: number, t: any) => sum + (t.net_pnl || 0), 0) / totalTokens 
    : 0;
  const avgRoiPerToken = totalTokens > 0
    ? tokens.reduce((sum: number, t: any) => sum + (t.avg_roi || 0), 0) / totalTokens
    : 0;

  // Calculate total value held (non-rugged only)
  const nonRuggedHeldValue = tokens
    .filter((t: any) => !t.is_rugged && t.is_held)
    .reduce((sum: number, t: any) => sum + (t.current_value_open_positions || 0), 0);

  // Calculate avg hold time per token (from token-level data)
  const avgHoldTimePerToken = totalTokens > 0
    ? tokens.reduce((sum: number, t: any) => sum + (t.avg_hold_time_seconds || 0), 0) / totalTokens
    : 0;

  // Trades data
  const closedTradesData = data.trades?.closed || [];
  const openPositionsData = data.trades?.open || [];
  
  // Win rate calculations
  const totalWinRate = data.overview.win_rate || 0;
  
  // Avg win rate per token
  const avgTokenWinRate = totalTokens > 0
    ? tokens.reduce((sum: number, t: any) => sum + (t.win_rate || 0), 0) / totalTokens
    : 0;
  
  // Avg win rate per trade (same as total win rate for now)
  const avgTradeWinRate = totalWinRate;

  // Time metrics from trades
  const avgHoldTimeSeconds = closedTrades > 0
    ? closedTradesData.reduce((sum: number, t: any) => sum + (t.holding_time_seconds || 0), 0) / closedTrades
    : 0;

  // Calculate avg trade window (entry to exit time)
  const avgTradeWindow = avgHoldTimeSeconds; // Same as hold time for closed trades

  // Best/Worst trades
  const bestTrade = closedTradesData.reduce((max: any, trade: any) => 
    (trade.realized_pnl || 0) > (max?.realized_pnl || 0) ? trade : max, 
    closedTradesData[0] || { realized_pnl: 0 }
  );
  const worstTrade = closedTradesData.reduce((min: any, trade: any) => 
    (trade.realized_pnl || 0) < (min?.realized_pnl || 0) ? trade : min, 
    closedTradesData[0] || { realized_pnl: 0 }
  );

  // Avg PnL and ROI per trade
  const avgPnlPerTrade = closedTrades > 0
    ? closedTradesData.reduce((sum: number, t: any) => sum + (t.realized_pnl || 0), 0) / closedTrades
    : 0;
  const avgRoiPerTrade = closedTrades > 0
    ? closedTradesData.reduce((sum: number, t: any) => sum + (t.realized_roi || 0), 0) / closedTrades
    : 0;

  // Capital metrics
  const capital = data.overview.capital_metrics || {};
  const startingCapital = capital.starting_capital || 0;
  const peakDeployed = capital.peak_deployed || 0;
  const finalCapital = capital.final_capital || 0;
  const netPnl = capital.net_pnl || 0;
  const tradingRoi = capital.trading_performance_roi || 0;
  const walletGrowthRoi = capital.wallet_growth_roi || 0;

  // Calculate avg deployed capital
  const avgDeployed = (startingCapital + peakDeployed) / 2;
  
  // Current capital (realized + unrealized non-rugged)
  const totalRealizedPnl = data.overview.total_realized_pnl || 0;
  const totalUnrealizedPnl = tokens
    .filter((t: any) => !t.is_rugged)
    .reduce((sum: number, t: any) => sum + (t.total_unrealized_pnl || 0), 0);
  const ruggedUnrealizedLoss = tokens
    .filter((t: any) => t.is_rugged)
    .reduce((sum: number, t: any) => sum + Math.abs(t.total_unrealized_pnl || 0), 0);

  const currentCapital = startingCapital + totalRealizedPnl + totalUnrealizedPnl;

  // Unrealized PnL percentages
  const unrealizedRoi = startingCapital > 0 ? (totalUnrealizedPnl / startingCapital) * 100 : 0;
  const ruggedUnrealizedRoi = startingCapital > 0 ? (ruggedUnrealizedLoss / startingCapital) * 100 : 0;

  // Realized PnL percentage
  const realizedRoi = startingCapital > 0 ? (totalRealizedPnl / startingCapital) * 100 : 0;

  // Net PnL percentage
  const netPnlPercent = startingCapital > 0 ? (netPnl / startingCapital) * 100 : 0;

  // Regular ROI (current capital vs starting)
  const regularRoi = startingCapital > 0 ? ((currentCapital - startingCapital) / startingCapital) * 100 : 0;

  // Avg ROI across all trades
  const avgRoi = tradingRoi; // Use trading ROI as avg

  // Risk Analysis - Rugged Balance Ratio
  const ruggedOpenCount = openPositionsData.filter((p: any) => p.is_rug).length;
  const nonRuggedOpenCount = openTrades - ruggedOpenCount;
  const ruggedOpenPercent = openTrades > 0 ? (ruggedOpenCount / openTrades) * 100 : 0;

  // Traded Rugs (includes held rugs + exited rugs that later rugged)
  const heldRugs = ruggedTokens; // Tokens currently held that are rugged
  const totalTradedRugs = tradedRugTokens; // Tokens that rugged after we exited
  const tradedRugsPercent = totalTokens > 0 ? (totalTradedRugs / totalTokens) * 100 : 0;

  // Exited Before Rug (tokens we fully exited that later rugged)
  const exitedBeforeRug = tradedRugTokens;
  const escapedPercent = totalTokens > 0 ? (exitedBeforeRug / totalTokens) * 100 : 0;

  // Rugged Losses (deployed capital lost)
  const ruggedLoss = data.overview.total_confirmed_loss || 0;
  const totalDeployed = capital.starting_capital || 1; // Avoid division by zero
  const ruggedLossPercent = (ruggedLoss / totalDeployed) * 100;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'tokens'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <Coins className="h-4 w-4" />
          Tokens ({totalTokens})
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
            activeTab === 'trades'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Trades ({totalTrades})
        </button>
      </div>

      {/* ============================================================ */}
      {/* OVERVIEW TAB */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Trades */}
            <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Total Trades</p>
              <p className="text-3xl font-bold mb-2">{totalTrades}</p>
              <div className="flex gap-3 text-sm">
                <span className="text-green-400">Closed: {closedTrades}</span>
                <span className="text-blue-400">Open: {openTrades}</span>
              </div>
            </div>

            {/* 2. Rug Metrics */}
            <div className="bg-gray-900/50 border border-red-500/30 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Rug Detection</p>
              <p className="text-3xl font-bold text-red-400">{ruggedTokens}/{totalTokens}</p>
              <p className="text-sm text-red-300 mt-1">{formatPercent(ruggedTokens / totalTokens * 100)} Rugged</p>
            </div>

            {/* 3. Win Rates */}
            <div className="bg-gray-900/50 border border-green-500/30 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Win Rates</p>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-green-400 font-semibold">{formatPercent(totalWinRate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Avg/Token:</span>
                  <span className="text-blue-400 font-semibold">{formatPercent(avgTokenWinRate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Avg/Trade:</span>
                  <span className="text-purple-400 font-semibold">{formatPercent(avgTradeWinRate)}</span>
                </div>
              </div>
            </div>

            {/* 4. Time Metrics */}
            <div className="bg-gray-900/50 border border-blue-500/30 p-5 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Holding Times</p>
              <div className="space-y-2 mt-2">
                <div>
                  <p className="text-xs text-gray-500">Avg Trade Window</p>
                  <p className="text-xl font-bold text-blue-400">{formatTime(avgTradeWindow)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Hold Time</p>
                  <p className="text-xl font-bold text-purple-400">{formatTime(avgHoldTimeSeconds)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Capital Metrics */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Capital Metrics
            </h3>
            
            {/* Row 1: Capital Stages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Starting Capital</p>
                <p className="text-2xl font-bold">{formatUSD(startingCapital)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Trade Capital</p>
                <p className="text-2xl font-bold">{formatUSD(avgDeployed)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Current Capital</p>
                <p className="text-2xl font-bold text-blue-400">{formatUSD(currentCapital)}</p>
              </div>
            </div>

            {/* Row 2: PnL Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Net PnL</p>
                <p className={`text-2xl font-bold ${netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {netPnl >= 0 ? '+' : ''}{formatUSD(netPnl)}
                </p>
                <p className="text-sm text-gray-500">{formatPercent(netPnlPercent)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Realized PnL</p>
                <p className={`text-2xl font-bold ${totalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalRealizedPnl >= 0 ? '+' : ''}{formatUSD(totalRealizedPnl)}
                </p>
                <p className="text-sm text-gray-500">{formatPercent(realizedRoi)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Unrealized PnL</p>
                <div className="flex flex-col gap-1">
                  <div>
                    <span className={`text-xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {totalUnrealizedPnl >= 0 ? '+' : ''}{formatUSD(totalUnrealizedPnl)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">{formatPercent(unrealizedRoi)}</span>
                  </div>
                  {ruggedUnrealizedLoss > 0 && (
                    <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded">
                      <AlertTriangle className="h-3 w-3 text-yellow-400" />
                      <span className="text-sm text-yellow-400">
                        -{formatUSD(ruggedUnrealizedLoss)}
                      </span>
                      <span className="text-xs text-yellow-300">({formatPercent(ruggedUnrealizedRoi)} rugged)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: ROI Multipliers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Trading ROI</p>
                <p className="text-2xl font-bold text-purple-400">{formatROI(tradingRoi)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Regular ROI</p>
                <p className="text-2xl font-bold text-blue-400">{formatROI(regularRoi)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg ROI</p>
                <p className="text-2xl font-bold text-green-400">{formatROI(avgRoi)}</p>
              </div>
            </div>
          </div>

          {/* Risk Analysis */}
          <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Risk Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Rugged Balance Ratio */}
              <div>
                <p className="text-gray-400 text-sm">Rugged Balance Ratio</p>
                <p className="text-2xl font-bold text-red-400">
                  {ruggedOpenCount}:{nonRuggedOpenCount}
                </p>
                <p className="text-sm text-gray-500 mt-1">{formatPercent(ruggedOpenPercent)} of open positions</p>
              </div>

              {/* 2. Traded Rugs */}
              <div>
                <p className="text-gray-400 text-sm">Traded Rugs</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {totalTradedRugs}/{totalTokens}
                </p>
                <p className="text-sm text-gray-500 mt-1">{formatPercent(tradedRugsPercent)}</p>
              </div>

              {/* 3. Exited Before Rug */}
              <div>
                <p className="text-gray-400 text-sm">Exited Before Rug</p>
                <p className="text-2xl font-bold text-green-400">
                  {exitedBeforeRug}:{totalTokens}
                </p>
                <p className="text-sm text-gray-500 mt-1">{formatPercent(escapedPercent)} escaped</p>
              </div>

              {/* 4. Rugged Losses */}
              <div>
                <p className="text-gray-400 text-sm">Deployed Capital Lost</p>
                <p className="text-2xl font-bold text-red-400">
                  -{formatUSD(ruggedLoss)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{formatPercent(ruggedLossPercent)} of deployed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TOKENS TAB */}
      {/* ============================================================ */}
      {activeTab === 'tokens' && (
        <div className="space-y-6">
          {/* Token Summary Section */}
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Coins className="h-5 w-5 text-purple-400" />
              Token Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Profitable/Losing Tokens */}
              <div>
                <p className="text-gray-400 text-sm">Profitable Tokens</p>
                <p className="text-2xl font-bold text-green-400">
                  {profitableTokens.length}/{totalTokens}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatPercent(profitableTokens.length / totalTokens * 100)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Losing Tokens</p>
                <p className="text-2xl font-bold text-red-400">
                  {losingTokens.length}/{totalTokens}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatPercent(losingTokens.length / totalTokens * 100)}
                </p>
              </div>

              {/* Averages */}
              <div>
                <p className="text-gray-400 text-sm">Avg PnL/Token</p>
                <p className={`text-2xl font-bold ${avgPnlPerToken >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {avgPnlPerToken >= 0 ? '+' : ''}{formatUSD(avgPnlPerToken)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Avg ROI: {formatROI(avgRoiPerToken)}</p>
              </div>

              {/* Total Value Held */}
              <div>
                <p className="text-gray-400 text-sm">Total Value Held</p>
                <p className="text-2xl font-bold text-blue-400">{formatUSD(nonRuggedHeldValue)}</p>
                <p className="text-sm text-gray-500 mt-1">Non-rugged only</p>
              </div>
            </div>

            {/* Avg Hold Time */}
            <div className="mt-4 pt-4 border-t border-purple-500/20">
              <p className="text-gray-400 text-sm">Avg Hold Time/Token</p>
              <p className="text-xl font-bold text-purple-400">{formatTime(avgHoldTimePerToken)}</p>
            </div>
          </div>

          {/* Token Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Token-Level Performance</h3>
              <button
                onClick={() => setShowAllTokens(!showAllTokens)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                {showAllTokens ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAllTokens ? 'Show Top 20' : `Show All (${totalTokens})`}
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/80 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">Token</th>
                    <th className="text-right p-3 font-semibold">Trades</th>
                    <th className="text-right p-3 font-semibold">Invested</th>
                    <th className="text-right p-3 font-semibold">Returned</th>
                    <th className="text-right p-3 font-semibold">Realized PnL</th>
                    <th className="text-right p-3 font-semibold">Unrealized PnL</th>
                    <th className="text-right p-3 font-semibold">Total PnL</th>
                    <th className="text-right p-3 font-semibold">ROI</th>
                    <th className="text-right p-3 font-semibold">Win Rate</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(showAllTokens ? tokens : tokens.slice(0, 20)).map((token: any, idx: number) => {
                    const isRugged = token.is_rugged || token.traded_rug_token;
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-gray-800/50 transition-colors ${
                          isRugged ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {/* Token Logo - will be added when backend provides tokenLogoUrl */}
                            <div className="font-mono text-sm">
                              <div className="font-semibold">{token.token_symbol}</div>
                              <div className="text-xs text-gray-500">
                                {token.token_address?.slice(0, 6)}...{token.token_address?.slice(-4)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">{token.total_trades}</td>
                        <td className="p-3 text-right">{formatUSD(token.total_invested)}</td>
                        <td className="p-3 text-right">{formatUSD(token.total_returned)}</td>
                        <td className="p-3 text-right">
                          <span className={token.total_realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {token.total_realized_pnl >= 0 ? '+' : ''}{formatUSD(token.total_realized_pnl)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={token.total_unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {token.total_unrealized_pnl >= 0 ? '+' : ''}{formatUSD(token.total_unrealized_pnl)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-semibold ${token.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {token.net_pnl >= 0 ? '+' : ''}{formatUSD(token.net_pnl)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={token.avg_roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatPercent(token.avg_roi)}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatPercent(token.win_rate || 0)}</td>
                        <td className="p-3 text-center">
                          {isRugged && (
                            <div className="flex items-center justify-center gap-1 text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Rugged</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TRADES TAB */}
      {/* ============================================================ */}
      {activeTab === 'trades' && (
        <div className="space-y-6">
          {/* Trade-Level Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Avg Win Rate</p>
              <p className="text-2xl font-bold text-green-400">{formatPercent(avgTradeWinRate)}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Avg PnL/Trade</p>
              <p className={`text-2xl font-bold ${avgPnlPerTrade >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {avgPnlPerTrade >= 0 ? '+' : ''}{formatUSD(avgPnlPerTrade)}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Avg ROI/Trade</p>
              <p className="text-2xl font-bold text-purple-400">{formatROI(avgRoiPerTrade)}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Avg Hold Time</p>
              <p className="text-2xl font-bold text-blue-400">{formatTime(avgHoldTimeSeconds)}</p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTradesSubTab('closed')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                tradesSubTab === 'closed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Closed Trades ({closedTrades})
            </button>
            <button
              onClick={() => setTradesSubTab('open')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                tradesSubTab === 'open'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Open Positions ({openTrades})
            </button>
          </div>

          {/* Closed Trades Table */}
          {tradesSubTab === 'closed' && (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/80">
                  <tr>
                    <th className="text-left p-3 font-semibold">Token</th>
                    <th className="text-right p-3 font-semibold">Entry Value</th>
                    <th className="text-right p-3 font-semibold">Exit Value</th>
                    <th className="text-right p-3 font-semibold">PnL</th>
                    <th className="text-right p-3 font-semibold">ROI</th>
                    <th className="text-right p-3 font-semibold">Hold Time</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {closedTradesData.slice(0, showAllTrades ? undefined : 50).map((trade: any, idx: number) => {
                    const isRuggedLater = trade.is_rug_now;
                    return (
                      <tr 
                        key={idx}
                        className={`hover:bg-gray-800/50 transition-colors ${
                          isRuggedLater ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {/* Token Logo - placeholder */}
                            <div className="font-mono text-sm">
                              <div className="font-semibold">{trade.token_symbol}</div>
                              <div className="text-xs text-gray-500">
                                {trade.token_address?.slice(0, 6)}...{trade.token_address?.slice(-4)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">{formatUSD(trade.entry_value_usd)}</td>
                        <td className="p-3 text-right">{formatUSD(trade.exit_value_usd)}</td>
                        <td className="p-3 text-right">
                          <span className={`font-semibold ${trade.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.realized_pnl >= 0 ? '+' : ''}{formatUSD(trade.realized_pnl)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={trade.realized_roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatPercent(trade.realized_roi)}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatTime(trade.holding_time_seconds)}</td>
                        <td className="p-3 text-center">
                          {isRuggedLater && (
                            <div className="flex items-center justify-center gap-1 text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Rugged Later</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Open Positions Table */}
          {tradesSubTab === 'open' && (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/80">
                  <tr>
                    <th className="text-left p-3 font-semibold">Token</th>
                    <th className="text-right p-3 font-semibold">Invested</th>
                    <th className="text-right p-3 font-semibold">Current Price</th>
                    <th className="text-right p-3 font-semibold">Current Value</th>
                    <th className="text-right p-3 font-semibold">Unrealized PnL</th>
                    <th className="text-right p-3 font-semibold">Hold Time</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {openPositionsData.map((position: any, idx: number) => {
                    const isRugged = position.is_rug;
                    return (
                      <tr 
                        key={idx}
                        className={`hover:bg-gray-800/50 transition-colors ${
                          isRugged ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {/* Token Logo - placeholder */}
                            <div className="font-mono text-sm">
                              <div className="font-semibold">{position.token_symbol}</div>
                              <div className="text-xs text-gray-500">
                                {position.token_address?.slice(0, 6)}...{position.token_address?.slice(-4)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">{formatUSD(position.entry_value_usd)}</td>
                        <td className="p-3 text-right">${position.current_price_usd?.toFixed(8)}</td>
                        <td className="p-3 text-right">{formatUSD(position.current_value_usd)}</td>
                        <td className="p-3 text-right">
                          <span className={`font-semibold ${position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {position.unrealized_pnl >= 0 ? '+' : ''}{formatUSD(position.unrealized_pnl)}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatTime(position.holding_time_seconds || 0)}</td>
                        <td className="p-3 text-center">
                          {isRugged && (
                            <div className="flex items-center justify-center gap-1 text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Rugged</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Show more button */}
          {tradesSubTab === 'closed' && closedTradesData.length > 50 && !showAllTrades && (
            <button
              onClick={() => setShowAllTrades(true)}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              Show All {closedTradesData.length} Closed Trades
            </button>
          )}
        </div>
      )}
    </div>
  );
}
