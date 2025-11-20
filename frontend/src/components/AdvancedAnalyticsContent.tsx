'use client';

import { useState } from 'react';
import { BarChart3, Coins, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Copy, ExternalLink, Clock, DollarSign, Percent } from 'lucide-react';
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
    if (!seconds || seconds === 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
    return `${(seconds / 86400).toFixed(1)}d`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getExplorerUrl = (chain: string, address: string) => {
    // Simple mapping, can be expanded
    if (chain === '501') return `https://solscan.io/token/${address}`;
    if (chain === '1') return `https://etherscan.io/token/${address}`;
    return `https://solscan.io/token/${address}`; // Default to Solscan for now
  };

  // Basic counts
  const totalTrades = data.overview.total_trades || 0;
  const closedTrades = data.overview.closed_trades || 0;
  const openTrades = data.overview.open_positions || 0;

  // ============================================================
  // DATA PROCESSING & RUG LOGIC
  // ============================================================
  
  // 1. Process Tokens with Rug Logic
  // Logic: If rugged and held, remaining investment is -100% loss.
  const tokens = (data.tokens || []).map((t: any) => {
    const isRugged = t.is_rugged || t.traded_rug_token;
    
    // Calculate cost basis of held tokens
    // Cost Basis = Total Invested - Cost of Sold
    // Cost of Sold = Total Returned - Realized PnL
    const costOfSold = (t.total_returned || 0) - (t.total_realized_pnl || 0);
    const remainingCostBasis = Math.max(0, (t.total_invested || 0) - costOfSold);
    
    if (isRugged && remainingCostBasis > 0.000001) { // Use epsilon for float comparison
      // It's a rug and we still hold some
      const adjustedUnrealizedPnl = -remainingCostBasis;
      const adjustedNetPnl = (t.total_realized_pnl || 0) + adjustedUnrealizedPnl;
      const adjustedRoi = t.total_invested > 0 ? (adjustedNetPnl / t.total_invested) * 100 : -100;
      
      return {
        ...t,
        total_unrealized_pnl: adjustedUnrealizedPnl,
        net_pnl: adjustedNetPnl,
        avg_roi: adjustedRoi,
        current_value_open_positions: 0, // Force 0 value
        is_rugged_held: true // Flag for UI
      };
    }
    return t;
  });

  // 2. Process Open Positions with Rug Logic
  const openPositionsData = (data.trades?.open || []).map((p: any) => {
    if (p.is_rug) {
      return {
        ...p,
        current_value_usd: 0,
        unrealized_pnl: -(p.entry_value_usd || 0),
        unrealized_roi: -100
      };
    }
    return p;
  });

  const closedTradesData = data.trades?.closed || [];

  // ============================================================
  // AGGREGATE CALCULATIONS
  // ============================================================

  const totalTokens = tokens.length;
  const ruggedTokens = tokens.filter((t: any) => t.is_rugged).length;
  const tradedRugTokens = tokens.filter((t: any) => t.traded_rug_token).length;

  // Calculate profitable/losing tokens (using adjusted PnL)
  const profitableTokens = tokens.filter((t: any) => (t.net_pnl || 0) > 0);
  const losingTokens = tokens.filter((t: any) => (t.net_pnl || 0) < 0);
  
  // Token-level averages
  const avgPnlPerToken = totalTokens > 0 
    ? tokens.reduce((sum: number, t: any) => sum + (t.net_pnl || 0), 0) / totalTokens 
    : 0;
  const avgRoiPerToken = totalTokens > 0
    ? tokens.reduce((sum: number, t: any) => sum + (t.avg_roi || 0), 0) / totalTokens
    : 0;

  // Calculate total value held (non-rugged only, rugged forced to 0 above)
  const nonRuggedHeldValue = tokens
    .reduce((sum: number, t: any) => sum + (t.current_value_open_positions || 0), 0);

  // Calculate avg hold time per token
  const avgHoldTimePerToken = totalTokens > 0
    ? tokens.reduce((sum: number, t: any) => sum + (t.avg_hold_time_seconds || 0), 0) / totalTokens
    : 0;
  
  // Win rate calculations
  const totalWinRate = data.overview.win_rate || 0;
  
  // Avg win rate per token
  const avgTokenWinRate = totalTokens > 0
    ? tokens.reduce((sum: number, t: any) => sum + (t.win_rate || 0), 0) / totalTokens
    : 0;
  
  // Avg win rate per trade
  const avgTradeWinRate = totalWinRate;

  // Time metrics from trades
  const now = Date.now();
  const openPositionsHoldTime = openPositionsData.reduce((sum: number, p: any) => {
    const holdTime = p.holding_time_seconds || (p.entry_time ? (now - p.entry_time) / 1000 : 0);
    return sum + holdTime;
  }, 0);
  
  const closedTradesHoldTime = closedTradesData.reduce((sum: number, t: any) => sum + (t.holding_time_seconds || 0), 0);
  
  const totalHoldTime = closedTradesHoldTime + openPositionsHoldTime;
  const totalTradesForHoldTime = closedTrades + openTrades;
  
  const avgHoldTimeSeconds = totalTradesForHoldTime > 0
    ? totalHoldTime / totalTradesForHoldTime
    : 0;

  const avgTradeWindow = avgHoldTimeSeconds;

  // Best/Worst trades
  const allTradesForStats = [
    ...closedTradesData.map((t: any) => ({ ...t, pnl: t.realized_pnl, roi: t.realized_roi, type: 'closed' })),
    ...openPositionsData.map((t: any) => ({ ...t, pnl: t.unrealized_pnl, roi: t.unrealized_roi, type: 'open' }))
  ];

  const bestTrade = allTradesForStats.reduce((max: any, trade: any) => 
    (trade.pnl || 0) > (max?.pnl || 0) ? trade : max, 
    allTradesForStats[0] || { pnl: 0 }
  );
  const worstTrade = allTradesForStats.reduce((min: any, trade: any) => 
    (trade.pnl || 0) < (min?.pnl || 0) ? trade : min, 
    allTradesForStats[0] || { pnl: 0 }
  );

  const avgPnlPerTrade = totalTradesForHoldTime > 0
    ? allTradesForStats.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) / totalTradesForHoldTime
    : 0;
  const avgRoiPerTrade = totalTradesForHoldTime > 0
    ? allTradesForStats.reduce((sum: number, t: any) => sum + (t.roi || 0), 0) / totalTradesForHoldTime
    : 0;

  // Capital metrics
  const capital = data.overview.capital_metrics || {};
  const startingCapital = capital.starting_capital || 0;
  const peakDeployed = capital.peak_deployed || 0;
  
  // Recalculate PnLs based on adjusted token data
  const totalRealizedPnl = data.overview.total_realized_pnl || 0;
  
  // Total Unrealized PnL (includes rugged losses as negative values now)
  const totalUnrealizedPnl = tokens.reduce((sum: number, t: any) => sum + (t.total_unrealized_pnl || 0), 0);
  
  // Rugged Loss (The amount lost in rugs - absolute value of negative unrealized pnl for rugs)
  const ruggedUnrealizedLoss = tokens
    .filter((t: any) => t.is_rugged || t.traded_rug_token)
    .reduce((sum: number, t: any) => {
      // Only count negative unrealized pnl (losses)
      return sum + (t.total_unrealized_pnl < 0 ? Math.abs(t.total_unrealized_pnl) : 0);
    }, 0);

  // Net PnL = Realized + Unrealized (which now includes rug losses)
  const netPnl = totalRealizedPnl + totalUnrealizedPnl;
  
  // Current Capital = Starting + Net PnL
  const currentCapital = startingCapital + netPnl;

  // ROI Calculations
  const unrealizedRoi = startingCapital > 0 ? (totalUnrealizedPnl / startingCapital) * 100 : 0;
  const ruggedUnrealizedRoi = startingCapital > 0 ? (ruggedUnrealizedLoss / startingCapital) * 100 : 0;
  const realizedRoi = startingCapital > 0 ? (totalRealizedPnl / startingCapital) * 100 : 0;
  const netPnlPercent = startingCapital > 0 ? (netPnl / startingCapital) * 100 : 0;
  const regularRoi = startingCapital > 0 ? ((currentCapital - startingCapital) / startingCapital) * 100 : 0;
  
  // Trading ROI (from backend, or recalculate?)
  // Let's use our calculated Regular ROI as the main metric since it's consistent with our rug logic
  const tradingRoi = regularRoi; 
  const avgRoi = tradingRoi;

  // Calculate avg deployed capital
  const avgDeployed = (startingCapital + peakDeployed) / 2;

  // Risk Analysis - Rugged Balance Ratio
  const ruggedOpenCount = openPositionsData.filter((p: any) => p.is_rug).length;
  const nonRuggedOpenCount = openTrades - ruggedOpenCount;
  const ruggedOpenPercent = openTrades > 0 ? (ruggedOpenCount / openTrades) * 100 : 0;

  // Traded Rugs
  const heldRugs = ruggedTokens;
  const totalTradedRugs = tradedRugTokens;
  const tradedRugsPercent = totalTokens > 0 ? (totalTradedRugs / totalTokens) * 100 : 0;

  // Exited Before Rug
  const exitedBeforeRug = tradedRugTokens;
  const escapedPercent = totalTokens > 0 ? (exitedBeforeRug / totalTokens) * 100 : 0;

  // Rugged Losses (Total confirmed loss from backend + our calculated unrealized rug loss)
  // Note: Backend 'total_confirmed_loss' usually means realized losses. 
  // We want to show the TOTAL value lost to rugs (Realized + Unrealized).
  const realizedRugLoss = data.overview.total_confirmed_loss || 0;
  const totalRuggedLoss = realizedRugLoss + ruggedUnrealizedLoss;
  const ruggedLossPercent = startingCapital > 0 ? (totalRuggedLoss / startingCapital) * 100 : 0;

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
                  <span className="text-green-400 font-semibold">{totalWinRate > 0 ? formatPercent(totalWinRate) : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Avg/Token:</span>
                  <span className="text-blue-400 font-semibold">{avgTokenWinRate > 0 ? formatPercent(avgTokenWinRate) : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Avg/Trade:</span>
                  <span className="text-purple-400 font-semibold">{avgTradeWinRate > 0 ? formatPercent(avgTradeWinRate) : '-'}</span>
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

          {/* Capital Metrics - Redesigned */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Capital Metrics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Capital Flow */}
              <div className="bg-gray-900/40 p-4 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2 text-blue-300">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-semibold">Capital Flow</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Starting:</span>
                    <span>{formatUSD(startingCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Peak:</span>
                    <span>{formatUSD(peakDeployed)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                    <span className="text-gray-400">Current:</span>
                    <span className="text-blue-400 font-bold">{formatUSD(currentCapital)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: PnL Breakdown */}
              <div className="bg-gray-900/40 p-4 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-2 text-green-300">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold">PnL Breakdown</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Realized:</span>
                    <span className={totalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {totalRealizedPnl >= 0 ? '+' : ''}{formatUSD(totalRealizedPnl)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Unrealized:</span>
                    <span className={totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {totalUnrealizedPnl >= 0 ? '+' : ''}{formatUSD(totalUnrealizedPnl)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                    <span className="text-gray-400">Net PnL:</span>
                    <span className={`font-bold ${netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {netPnl >= 0 ? '+' : ''}{formatUSD(netPnl)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: ROI Performance */}
              <div className="bg-gray-900/40 p-4 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2 text-purple-300">
                  <Percent className="h-4 w-4" />
                  <span className="font-semibold">ROI Performance</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trading ROI:</span>
                    <span className="text-purple-400 font-bold">{formatROI(tradingRoi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Regular ROI:</span>
                    <span className="text-blue-400 font-bold">{formatROI(regularRoi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg ROI:</span>
                    <span className="text-green-400 font-bold">{formatROI(avgRoi)}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Risk Impact */}
              <div className="bg-gray-900/40 p-4 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-2 text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Risk Impact</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rugged Loss:</span>
                    <span className="text-red-400">-{formatUSD(ruggedLoss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Impact:</span>
                    <span className="text-red-400">{formatPercent(ruggedLossPercent)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                    <span className="text-gray-400">Rugged ROI:</span>
                    <span className="text-yellow-400">{formatPercent(ruggedUnrealizedRoi)}</span>
                  </div>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

              {/* Avg Hold Time */}
              <div>
                <p className="text-gray-400 text-sm">Avg Hold Time/Token</p>
                <p className="text-2xl font-bold text-purple-400">{formatTime(avgHoldTimePerToken)}</p>
                <p className="text-sm text-gray-500 mt-1">Per token average</p>
              </div>
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
                    const isHeld = token.is_held;
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-gray-800/50 transition-colors`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {/* Token Logo */}
                            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                              {token.token_logo_url ? (
                                <img src={token.token_logo_url} alt={token.token_symbol} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold">{token.token_symbol?.slice(0, 2)}</span>
                              )}
                            </div>
                            <div className="font-mono text-sm">
                              <div className="font-semibold flex items-center gap-2">
                                {token.token_symbol}
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => copyToClipboard(token.token_address)}
                                    className="text-gray-500 hover:text-white transition-colors"
                                    title="Copy Address"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <a 
                                    href={getExplorerUrl(data.meta?.chain || '501', token.token_address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-blue-400 transition-colors"
                                    title="View on Explorer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
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
                          {isRugged ? (
                            <div className="flex items-center justify-center gap-1 text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Rugged</span>
                            </div>
                          ) : isHeld ? (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Held</span>
                          ) : (
                            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">Sold</span>
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
                    <th className="text-center p-3 font-semibold border-l border-r border-blue-500/30 bg-blue-500/10">Copytrade</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {closedTradesData.slice(0, showAllTrades ? undefined : 50).map((trade: any, idx: number) => {
                    const isRuggedLater = trade.is_rug_now;
                    return (
                      <tr 
                        key={idx}
                        className={`hover:bg-gray-800/50 transition-colors`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {/* Token Logo */}
                            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                              {trade.token_logo_url ? (
                                <img src={trade.token_logo_url} alt={trade.token_symbol} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold">{trade.token_symbol?.slice(0, 2)}</span>
                              )}
                            </div>
                            <div className="font-mono text-sm">
                              <div className="font-semibold flex items-center gap-2">
                                {trade.token_symbol}
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => copyToClipboard(trade.token_address)}
                                    className="text-gray-500 hover:text-white transition-colors"
                                    title="Copy Address"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <a 
                                    href={getExplorerUrl(data.meta?.chain || '501', trade.token_address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-blue-400 transition-colors"
                                    title="View on Explorer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
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
                        
                        {/* Copytrade Column */}
                        <td className="p-3 border-l border-r border-blue-500/30 bg-blue-500/5">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex justify-between gap-2">
                              <span className="text-gray-400">Entry:</span>
                              <span className="text-blue-300 font-mono">
                                {trade.copy_trade_analysis?.entry_price 
                                  ? `$${trade.copy_trade_analysis.entry_price.toFixed(8)}` 
                                  : '-'}
                              </span>
                            </div>
                            
                            {trade.copy_trade_analysis ? (
                              <>
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-400">Gain:</span>
                                  <div className="text-right">
                                    <span className={trade.copy_trade_analysis.possible_gain_1h > 0 ? 'text-green-400' : 'text-gray-500'}>
                                      {formatPercent(trade.copy_trade_analysis.possible_gain_1h)}
                                    </span>
                                    <span className="text-gray-600 mx-1">/</span>
                                    <span className={trade.copy_trade_analysis.possible_gain_full > 0 ? 'text-green-400' : 'text-gray-500'}>
                                      {formatPercent(trade.copy_trade_analysis.possible_gain_full)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-400">Loss:</span>
                                  <div className="text-right">
                                    <span className={trade.copy_trade_analysis.possible_loss_1h < 0 ? 'text-red-400' : 'text-gray-500'}>
                                      {formatPercent(trade.copy_trade_analysis.possible_loss_1h)}
                                    </span>
                                    <span className="text-gray-600 mx-1">/</span>
                                    <span className={trade.copy_trade_analysis.possible_loss_full < 0 ? 'text-red-400' : 'text-gray-500'}>
                                      {formatPercent(trade.copy_trade_analysis.possible_loss_full)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex justify-between gap-2 mt-1 pt-1 border-t border-blue-500/20">
                                  <span className="text-gray-400">Time to:</span>
                                  <div className="text-right text-[10px]">
                                    <span className="text-gray-300" title="Time to 25%">
                                      {trade.copy_trade_analysis.time_to_25_percent ? formatTime(trade.copy_trade_analysis.time_to_25_percent / 1000) : '-'}
                                    </span>
                                    <span className="text-gray-500 mx-1">|</span>
                                    <span className="text-gray-300" title="Time to 50%">
                                      {trade.copy_trade_analysis.time_to_50_percent ? formatTime(trade.copy_trade_analysis.time_to_50_percent / 1000) : '-'}
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-center text-gray-600 py-2">-</div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          {isRuggedLater ? (
                            <div className="flex items-center justify-center gap-1 text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Rugged Later</span>
                            </div>
                          ) : (
                            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">Sold</span>
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
                    <th className="text-right p-3 font-semibold">Entry / Copy Price</th>
                    <th className="text-right p-3 font-semibold">Potential Gain (1h/Max)</th>
                    <th className="text-right p-3 font-semibold">Time to 25%/50%</th>
                    <th className="text-right p-3 font-semibold">Potential Loss (1h/Max)</th>
                    <th className="text-right p-3 font-semibold">Unrealized PnL</th>
                    <th className="text-right p-3 font-semibold">ROI</th>
                    <th className="text-right p-3 font-semibold">Hold Time</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {openPositionsData.map((position: any, idx: number) => {
                    const isRugged = position.is_rug;
                    const holdTime = position.holding_time_seconds || (position.entry_time ? (Date.now() - position.entry_time) / 1000 : 0);
                    return (
                      <tr 
                        key={idx}
                        className={`hover:bg-gray-800/50 transition-colors`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {/* Token Logo */}
                            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                              {position.token_logo_url ? (
                                <img src={position.token_logo_url} alt={position.token_symbol} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold">{position.token_symbol?.slice(0, 2)}</span>
                              )}
                            </div>
                            <div className="font-mono text-sm">
                              <div className="font-semibold flex items-center gap-2">
                                {position.token_symbol}
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => copyToClipboard(position.token_address)}
                                    className="text-gray-500 hover:text-white transition-colors"
                                    title="Copy Address"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <a 
                                    href={getExplorerUrl(data.meta?.chain || '501', position.token_address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-blue-400 transition-colors"
                                    title="View on Explorer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {position.token_address?.slice(0, 6)}...{position.token_address?.slice(-4)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-400">Entry: ${position.entry_price?.toFixed(8)}</span>
                            {position.copy_trade_analysis?.entry_price ? (
                              <span className="text-xs text-blue-400">Copy: ${position.copy_trade_analysis.entry_price.toFixed(8)}</span>
                            ) : (
                              <span className="text-xs text-gray-600">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            {position.copy_trade_analysis ? (
                              <>
                                <span className={position.copy_trade_analysis.possible_gain_1h > 0 ? 'text-green-400' : 'text-gray-500'}>
                                  1h: {formatPercent(position.copy_trade_analysis.possible_gain_1h)}
                                </span>
                                <span className={position.copy_trade_analysis.possible_gain_full > 0 ? 'text-green-400' : 'text-gray-500'}>
                                  Max: {formatPercent(position.copy_trade_analysis.possible_gain_full)}
                                </span>
                              </>
                            ) : <span className="text-gray-600">-</span>}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            {position.copy_trade_analysis ? (
                              <>
                                <span className="text-xs text-gray-300">25%: {formatTime(position.copy_trade_analysis.time_to_25_percent / 1000)}</span>
                                <span className="text-xs text-gray-300">50%: {formatTime(position.copy_trade_analysis.time_to_50_percent / 1000)}</span>
                              </>
                            ) : <span className="text-gray-600">-</span>}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            {position.copy_trade_analysis ? (
                              <>
                                <span className={position.copy_trade_analysis.possible_loss_1h < 0 ? 'text-red-400' : 'text-gray-500'}>
                                  1h: {formatPercent(position.copy_trade_analysis.possible_loss_1h)}
                                </span>
                                <span className={position.copy_trade_analysis.possible_loss_full < 0 ? 'text-red-400' : 'text-gray-500'}>
                                  Max: {formatPercent(position.copy_trade_analysis.possible_loss_full)}
                                </span>
                              </>
                            ) : <span className="text-gray-600">-</span>}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-semibold ${position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {position.unrealized_pnl >= 0 ? '+' : ''}{formatUSD(position.unrealized_pnl)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={position.unrealized_roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatPercent(position.unrealized_roi)}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatTime(holdTime)}</td>
                        <td className="p-3 text-center">
                          {isRugged ? (
                            <div className="flex items-center justify-center gap-1 text-yellow-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Rugged</span>
                            </div>
                          ) : (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Held</span>
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
