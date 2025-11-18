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
    console.log('[AdvancedAnalyticsContent] No data provided');
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

  // Calculate trade-level metrics for overview
  const totalTrades = data.overview.total_trades || 0;
  const closedTrades = data.overview.closed_trades || 0;
  const winningTrades = Math.round((closedTrades * (data.overview.win_rate || 0)) / 100);
  const losingTrades = closedTrades - winningTrades;
  
  // Calculate avg metrics from trades data
  const avgPnlPerTrade = closedTrades > 0 ? (data.overview.capital_metrics?.net_pnl || 0) / closedTrades : 0;
  const avgRoiPerTrade = closedTrades > 0 ? (data.overview.win_rate || 0) : 0;
  
  // Calculate best/worst trades
  const closedTradesData = data.trades?.closed || [];
  const bestTrade = closedTradesData.reduce((max: any, trade: any) => 
    (trade.realized_pnl || 0) > (max?.realized_pnl || 0) ? trade : max, 
    closedTradesData[0] || { realized_pnl: 0 }
  );
  const worstTrade = closedTradesData.reduce((min: any, trade: any) => 
    (trade.realized_pnl || 0) < (min?.realized_pnl || 0) ? trade : min, 
    closedTradesData[0] || { realized_pnl: 0 }
  );

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
          Tokens ({data.tokens?.length || 0})
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Total Trades</p>
              <p className="text-2xl font-bold">{totalTrades}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-green-400">{formatPercent(data.overview.win_rate || 0)}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Closed Trades</p>
              <p className="text-2xl font-bold">{closedTrades}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Open Positions</p>
              <p className="text-2xl font-bold">{data.overview.open_positions}</p>
            </div>
          </div>

          {/* Capital Metrics */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Capital Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Starting Capital</p>
                <p className="text-xl font-bold">
                  {formatUSD(data.overview.capital_metrics?.starting_capital || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Peak Deployed</p>
                <p className="text-xl font-bold">
                  {formatUSD(data.overview.capital_metrics?.peak_deployed || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Final Capital</p>
                <p className="text-xl font-bold">
                  {formatUSD(data.overview.capital_metrics?.final_capital || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Net PnL</p>
                <p className="text-xl font-bold text-green-400">
                  +{formatUSD(data.overview.capital_metrics?.net_pnl || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Trading Performance ROI</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatPercent(data.overview.capital_metrics?.trading_performance_roi || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Wallet Growth ROI</p>
                <p className="text-xl font-bold text-blue-400">
                  {formatPercent(data.overview.capital_metrics?.wallet_growth_roi || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Risk Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Open Rugged Positions</p>
                <p className="text-xl font-bold text-red-400">
                  {data.overview.rugged_positions}/{data.overview.open_positions}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Rugged Tokens</p>
                <p className="text-xl font-bold text-red-400">
                  {data.overview.rugged_tokens}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Traded Rugs & Escaped</p>
                <p className="text-xl font-bold text-yellow-400">
                  {data.overview.traded_rug_tokens}
                </p>
                <p className="text-xs text-gray-500 mt-1">Exited before rug</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Rugged Losses</p>
                <p className="text-xl font-bold text-red-400">
                  -{formatUSD(data.overview.total_confirmed_loss || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">From open rugged positions</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tokens Tab */}
      {activeTab === 'tokens' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Token-Level Performance</h3>
            <button
              onClick={() => setShowAllTokens(!showAllTokens)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {showAllTokens ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAllTokens ? 'Show Top 20' : `Show All (${data.tokens?.length})`}
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
                  <th className="text-right p-3 font-semibold">Net PnL</th>
                  <th className="text-right p-3 font-semibold">Win Rate</th>
                  <th className="text-right p-3 font-semibold">Time Window</th>
                  <th className="text-right p-3 font-semibold">Avg Hold</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(showAllTokens ? data.tokens : data.tokens?.slice(0, 20))?.map((token: any, idx: number) => {
                  // Status logic
                  let status = '';
                  let statusColor = '';
                  let statusIcon = null;
                  
                  if (token.is_rugged && token.is_held) {
                    status = 'RUGGED';
                    statusColor = 'text-red-400';
                    statusIcon = <AlertTriangle className="h-3 w-3 inline mr-1" />;
                  } else if (token.traded_rug_token) {
                    const hasOpenPosition = token.open_positions > 0;
                    status = hasOpenPosition ? 'ESCAPED (partial)' : 'ESCAPED';
                    statusColor = 'text-yellow-400';
                  } else if (token.closed_trades > 0 && token.open_positions === 0) {
                    status = 'EXITED';
                    statusColor = 'text-green-400';
                  } else if (token.closed_trades > 0 && token.open_positions > 0) {
                    status = 'PARTIAL';
                    statusColor = 'text-blue-400';
                  } else if (token.is_held && !token.is_rugged) {
                    status = 'HOLDING';
                    statusColor = 'text-blue-400';
                  }
                  
                  const isRugged = token.is_rugged && token.is_held;
                  
                  return (
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-bold">{token.token_symbol}</div>
                        <div className="font-mono text-xs text-gray-500">
                          {token.token_address.slice(0, 4)}...{token.token_address.slice(-4)}
                        </div>
                      </td>
                      <td className="text-right p-3">
                        <div>{token.total_trades}</div>
                        <div className="text-gray-500 text-xs">
                          {token.closed_trades}C / {token.open_positions}O
                        </div>
                      </td>
                      <td className="text-right p-3">{formatUSD(token.total_invested || 0)}</td>
                      <td className="text-right p-3">{formatUSD(token.total_returned || 0)}</td>
                      <td className={`text-right p-3 font-semibold ${token.total_realized_pnl > 0 ? 'text-green-400' : token.total_realized_pnl < 0 ? 'text-red-400' : ''}`}>
                        {token.total_realized_pnl > 0 ? '+' : ''}{formatUSD(token.total_realized_pnl || 0)}
                      </td>
                      <td className={`text-right p-3 font-semibold ${
                        isRugged 
                          ? 'text-yellow-400' 
                          : token.total_unrealized_pnl > 0 
                            ? 'text-green-400' 
                            : token.total_unrealized_pnl < 0 
                              ? 'text-red-400' 
                              : 'text-gray-400'
                      }`}>
                        {token.open_positions > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            {isRugged && <AlertTriangle className="h-3 w-3" />}
                            {token.total_unrealized_pnl > 0 ? '+' : ''}{formatUSD(token.total_unrealized_pnl || 0)}
                          </div>
                        ) : '-'}
                      </td>
                      <td className={`text-right p-3 font-bold ${token.net_pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {token.net_pnl > 0 ? '+' : ''}{formatUSD(token.net_pnl || 0)}
                      </td>
                      <td className="text-right p-3">{formatPercent(token.win_rate || 0)}</td>
                      <td className="text-right p-3 text-xs text-gray-400">
                        {token.trading_window_hours ? `${formatNumber(token.trading_window_hours || 0)}h` : '-'}
                      </td>
                      <td className="text-right p-3 text-xs text-gray-400">
                        {token.avg_holding_hours ? `${formatNumber(token.avg_holding_hours || 0)}h` : '-'}
                      </td>
                      <td className={`p-3 text-xs font-semibold ${statusColor}`}>
                        {statusIcon}{status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trades Tab */}
      {activeTab === 'trades' && (
        <div className="space-y-6">
          {/* Trade-Level Overview */}
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Trade-Level Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Per-Trade Win Rate</p>
                <p className="text-2xl font-bold text-green-400">{formatPercent(data.overview.win_rate || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{winningTrades}W / {closedTrades}T</p>
              </div>
              <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Avg PnL/Trade</p>
                <p className={`text-2xl font-bold ${avgPnlPerTrade > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {avgPnlPerTrade > 0 ? '+' : ''}{formatUSD(avgPnlPerTrade)}
                </p>
              </div>
              <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Best Trade</p>
                <p className="text-2xl font-bold text-green-400">
                  +{formatUSD(bestTrade?.realized_pnl || 0)}
                </p>
              </div>
              <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Worst Trade</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatUSD(worstTrade?.realized_pnl || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tabs for Closed/Open */}
          <div className="flex gap-2 border-b border-gray-800">
            <button
              onClick={() => setTradesSubTab('closed')}
              className={`px-4 py-2 font-medium transition-colors ${
                tradesSubTab === 'closed'
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Closed Trades ({data.trades?.closed?.length || 0})
            </button>
            <button
              onClick={() => setTradesSubTab('open')}
              className={`px-4 py-2 font-medium transition-colors ${
                tradesSubTab === 'open'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Open Positions ({data.trades?.open?.length || 0})
            </button>
          </div>

          {/* Closed Trades Table */}
          {tradesSubTab === 'closed' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Closed Trades</h3>
                <button
                  onClick={() => setShowAllTrades(!showAllTrades)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {showAllTrades ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showAllTrades ? 'Show Top 20' : `Show All (${data.trades?.closed?.length})`}
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900/80 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold">Token</th>
                      <th className="text-right p-3 font-semibold">Entry</th>
                      <th className="text-right p-3 font-semibold">Buy</th>
                      <th className="text-right p-3 font-semibold">Exit</th>
                      <th className="text-right p-3 font-semibold">Sell</th>
                      <th className="text-right p-3 font-semibold">PnL</th>
                      <th className="text-right p-3 font-semibold">ROI</th>
                      <th className="text-right p-3 font-semibold">Hold Time</th>
                      <th className="text-left p-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllTrades ? data.trades.closed : data.trades.closed.slice(0, 20)).map((trade: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="p-3">
                          <div className="font-mono text-xs font-bold">{trade.token_symbol}</div>
                          <div className="font-mono text-xs text-gray-500">
                            {trade.token_address.slice(0, 4)}...{trade.token_address.slice(-4)}
                          </div>
                        </td>
                        <td className="text-right p-3">
                          <div className="text-xs text-gray-400">${formatNumber(trade.entry_price || 0, 8)}</div>
                        </td>
                        <td className="text-right p-3 font-semibold">{formatUSD(trade.entry_value_usd || 0)}</td>
                        <td className="text-right p-3">
                          <div className="text-xs text-gray-400">${formatNumber(trade.exit_price || 0, 8)}</div>
                        </td>
                        <td className="text-right p-3 font-semibold">{formatUSD(trade.exit_value_usd || 0)}</td>
                        <td className={`text-right p-3 font-bold ${trade.realized_pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.realized_pnl > 0 ? '+' : ''}{formatUSD(trade.realized_pnl || 0)}
                        </td>
                        <td className={`text-right p-3 font-semibold ${trade.realized_roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.realized_roi > 0 ? '+' : ''}{formatPercent(trade.realized_roi || 0)}
                        </td>
                        <td className="text-right p-3 text-xs text-gray-400">
                          {trade.holding_time_seconds 
                            ? `${formatNumber((trade.holding_time_seconds || 0) / 3600)}h` 
                            : '-'}
                        </td>
                        <td className="p-3 text-xs">
                          {trade.is_rug_now && (
                            <span className="text-yellow-400 flex items-center gap-1" title={trade.rug_warning}>
                              <AlertTriangle className="h-3 w-3" />
                              Later Rugged
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Open Positions Table */}
          {tradesSubTab === 'open' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Open Positions</h3>

              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900/80 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold">Token</th>
                      <th className="text-right p-3 font-semibold">Entry Price</th>
                      <th className="text-right p-3 font-semibold">Current Price</th>
                      <th className="text-right p-3 font-semibold">Invested</th>
                      <th className="text-right p-3 font-semibold">Current Value</th>
                      <th className="text-right p-3 font-semibold">Unrealized PnL</th>
                      <th className="text-right p-3 font-semibold">ROI</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trades?.open?.map((position: any, idx: number) => (
                      <tr key={idx} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${position.is_rug ? 'bg-red-900/10' : ''}`}>
                        <td className="p-3">
                          <div className="font-mono text-xs font-bold">{position.token_symbol}</div>
                          <div className="font-mono text-xs text-gray-500">
                            {position.token_address.slice(0, 4)}...{position.token_address.slice(-4)}
                          </div>
                        </td>
                        <td className="text-right p-3 text-xs text-gray-400">
                          ${formatNumber(position.entry_price || 0, 8)}
                        </td>
                        <td className="text-right p-3 text-xs text-gray-400">
                          ${formatNumber(position.current_price || 0, 8)}
                        </td>
                        <td className="text-right p-3 font-semibold">{formatUSD(position.entry_value_usd || 0)}</td>
                        <td className="text-right p-3 font-semibold">
                          {position.is_rug 
                            ? <span className="text-red-400">$0.00</span>
                            : formatUSD(position.current_value_usd || 0)}
                        </td>
                        <td className={`text-right p-3 font-bold ${
                          position.is_rug 
                            ? 'text-yellow-400' 
                            : position.unrealized_pnl > 0 
                              ? 'text-green-400' 
                              : 'text-red-400'
                        }`}>
                          <div className="flex items-center justify-end gap-1">
                            {position.is_rug && <AlertTriangle className="h-3 w-3" />}
                            {position.is_rug 
                              ? `-${formatUSD(position.confirmed_loss || 0)}`
                              : (position.unrealized_pnl > 0 ? '+' : '') + formatUSD(position.unrealized_pnl || 0)}
                          </div>
                        </td>
                        <td className={`text-right p-3 font-semibold ${
                          position.is_rug 
                            ? 'text-red-400' 
                            : position.unrealized_roi > 0 
                              ? 'text-green-400' 
                              : 'text-red-400'
                        }`}>
                          {position.is_rug 
                            ? '-100.0%'
                            : (position.unrealized_roi > 0 ? '+' : '') + formatPercent(position.unrealized_roi || 0)}
                        </td>
                        <td className="p-3 text-xs">
                          {position.is_rug && (
                            <div className="text-red-400">
                              <div className="flex items-center gap-1 font-semibold">
                                <AlertTriangle className="h-3 w-3" />
                                RUGGED
                              </div>
                              {position.rug_warning && (
                                <div className="text-xs text-gray-500 mt-1">{position.rug_warning}</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
