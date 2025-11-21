'use client';

import { useState } from 'react';
import { BarChart3, Coins, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Copy, ExternalLink, Clock, DollarSign, Percent } from 'lucide-react';
import { formatNumber, formatUSD, formatPercent } from '@/lib/utils';

interface AdvancedAnalyticsContentProps {
  data: any;
  wallet: string;
  chain: string;
  onRunCopyTrade?: () => void;
  copyTradeLoading?: boolean;
  copyTradeProgress?: { current: number, total: number } | null;
}

export default function AdvancedAnalyticsContent({ 
  data, 
  wallet, 
  chain,
  onRunCopyTrade,
  copyTradeLoading = false,
  copyTradeProgress = null
}: AdvancedAnalyticsContentProps) {
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'trades'>('overview');
  const [tradesSubTab, setTradesSubTab] = useState<'closed' | 'open'>('closed');

  // Helper for clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!data) return null;

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
  const ruggedLoss = realizedRugLoss + ruggedUnrealizedLoss;
  const ruggedLossPercent = startingCapital > 0 ? (ruggedLoss / startingCapital) * 100 : 0;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-6 pb-0 shrink-0">
        {/* PnL Card */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Total PnL</span>
          </div>
          <div className={`text-2xl font-bold ${data.overview.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.overview.total_pnl >= 0 ? '+' : ''}{formatUSD(data.overview.total_pnl)}
          </div>
          <div className={`text-sm ${data.overview.total_roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(data.overview.total_roi)} ROI
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPercent(data.overview.win_rate)}
          </div>
          <div className="text-sm text-gray-400">
            {data.overview.winning_trades}W / {data.overview.losing_trades}L
          </div>
        </div>

        {/* Rug Detection Card */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Rug Exposure</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {data.overview.rugDetection?.score || 0}%
          </div>
          <div className="text-sm text-gray-400">
            {data.overview.rugDetection?.ruggedTokens || 0} rugged tokens found
          </div>
        </div>

        {/* Copy Trade Potential */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Coins className="h-4 w-4" />
            <span className="text-sm font-medium">Copy Trade Potential</span>
          </div>
          {copyTradeLoading ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-yellow-400">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
              {copyTradeProgress && (
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(copyTradeProgress.current / copyTradeProgress.total) * 100}%` }}
                  />
                </div>
              )}
              {copyTradeProgress && (
                <span className="text-xs text-gray-500">
                  {copyTradeProgress.current} / {copyTradeProgress.total} trades
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-2xl font-bold text-white">
                {data.trades?.closed?.[0]?.copy_trade_analysis ? 'Ready' : 'Not Analyzed'}
              </div>
              {onRunCopyTrade && !data.trades?.closed?.[0]?.copy_trade_analysis && (
                <button 
                  onClick={onRunCopyTrade}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                >
                  Run Analysis
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-6 shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview' 
              ? 'border-green-500 text-green-500' 
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tokens' 
              ? 'border-green-500 text-green-500' 
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Tokens ({tokens.length})
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'trades' 
              ? 'border-green-500 text-green-500' 
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Trades ({totalTrades})
        </button>
      </div>

      {/* Tab Content - Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Activity Chart Placeholder */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Performance History</h3>
              <div className="h-64 flex items-center justify-center text-gray-500 bg-black/20 rounded-lg">
                Chart visualization coming soon
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-gray-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3 text-right">Invested</th>
                    <th className="px-4 py-3 text-right">Realized</th>
                    <th className="px-4 py-3 text-right">Unrealized</th>
                    <th className="px-4 py-3 text-right">Total PnL</th>
                    <th className="px-4 py-3 text-right">ROI</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {tokens.slice(0, showAllTokens ? undefined : 10).map((token: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {token.token_logo && (
                            <img src={token.token_logo} alt="" className="w-6 h-6 rounded-full" />
                          )}
                          <div>
                            <div className="font-medium text-white">{token.token_symbol}</div>
                            <a 
                              href={getExplorerUrl(chain, token.token_address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-blue-400 flex items-center gap-1"
                            >
                              {token.token_address.slice(0, 4)}...{token.token_address.slice(-4)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatUSD(token.total_invested)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={token.total_realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatUSD(token.total_realized_pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={token.adjusted_unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatUSD(token.adjusted_unrealized_pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={token.adjusted_net_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatUSD(token.adjusted_net_pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          token.adjusted_roi >= 0 
                            ? 'bg-green-500/10 text-green-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {formatPercent(token.adjusted_roi)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {token.is_rugged ? (
                          <span className="text-xs text-yellow-500 flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Rug
                          </span>
                        ) : token.is_held ? (
                          <span className="text-xs text-blue-400">Held</span>
                        ) : (
                          <span className="text-xs text-gray-500">Sold</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {!showAllTokens && tokens.length > 10 && (
              <button
                onClick={() => setShowAllTokens(true)}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm text-gray-300"
              >
                <ChevronDown className="h-4 w-4" />
                Show All {tokens.length} Tokens
              </button>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="space-y-4">
            {/* Sub Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTradesSubTab('closed')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tradesSubTab === 'closed'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                Closed Trades ({closedTrades})
              </button>
              <button
                onClick={() => setTradesSubTab('open')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tradesSubTab === 'open'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                Open Positions ({openTrades})
              </button>
            </div>

            {/* Trades Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-gray-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3 text-right">Type</th>
                    <th className="px-4 py-3 text-right">Entry</th>
                    <th className="px-4 py-3 text-right">Exit/Curr</th>
                    <th className="px-4 py-3 text-right">PnL</th>
                    <th className="px-4 py-3 text-right">ROI</th>
                    <th className="px-4 py-3 text-right">Time</th>
                    <th className="px-4 py-3 text-center">Copy Trade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {(tradesSubTab === 'closed' ? data.trades.closed : data.trades.open)
                    .slice(0, showAllTrades ? undefined : 50)
                    .map((trade: any, i: number) => {
                      const isWin = trade.realized_pnl > 0 || trade.unrealized_pnl > 0;
                      const pnl = tradesSubTab === 'closed' ? trade.realized_pnl : trade.unrealized_pnl;
                      const roi = tradesSubTab === 'closed' ? trade.realized_roi : trade.unrealized_roi;
                      
                      return (
                        <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-white">{trade.token_symbol}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs px-2 py-1 rounded ${
                              trade.direction === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {trade.direction?.toUpperCase() || (tradesSubTab === 'closed' ? 'SOLD' : 'HOLD')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            ${trade.entry_price?.toFixed(6) || '0'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            ${(trade.exit_price || trade.current_price)?.toFixed(6) || '0'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {formatUSD(pnl)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {formatPercent(roi)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {formatTime(trade.hold_time_seconds || 0)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {trade.copy_trade_analysis ? (
                              <div className="flex flex-col items-center text-xs">
                                <span className="text-gray-300">
                                  Entry: ${trade.copy_trade_analysis.entry_price?.toFixed(6)}
                                </span>
                                <span className={trade.copy_trade_analysis.possible_roi_full >= 0 ? 'text-green-400' : 'text-red-400'}>
                                  Max: {formatPercent(trade.copy_trade_analysis.possible_roi_full)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            {!showAllTrades && (tradesSubTab === 'closed' ? data.trades.closed : data.trades.open).length > 50 && (
              <button
                onClick={() => setShowAllTrades(true)}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm text-gray-300"
              >
                <ChevronDown className="h-4 w-4" />
                Show All Trades
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
