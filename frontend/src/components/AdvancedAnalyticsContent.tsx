'use client';

import { useState } from 'react';

interface AdvancedAnalyticsContentProps {
  data: any;
  loading: boolean;
  error: string | null;
}

export default function AdvancedAnalyticsContent({ data, loading, error }: AdvancedAnalyticsContentProps) {
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'trades'>('overview');

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
        <h3 className="text-lg font-bold text-red-400 mb-2">❌ Error</h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'tokens'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          🪙 Tokens ({data.tokens?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'trades'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          📈 Trades ({data.overview?.total_trades || 0})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-gray-400 text-sm">Total Trades</p>
              <p className="text-2xl font-bold">{data.overview.total_trades}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-gray-400 text-sm">Win Rate</p>
              <p className="text-2xl font-bold">{(data.overview.win_rate ?? 0).toFixed(2)}%</p>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-gray-400 text-sm">Closed Trades</p>
              <p className="text-2xl font-bold">{data.overview.closed_trades}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-gray-400 text-sm">Open Positions</p>
              <p className="text-2xl font-bold">{data.overview.open_positions}</p>
            </div>
          </div>

          {/* Capital Metrics */}
          <div className="bg-blue-900/30 border border-blue-500 p-4 rounded">
            <h3 className="text-lg font-bold mb-3">💰 Capital Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Starting Capital</p>
                <p className="text-xl font-bold">
                  ${(data.overview.capital_metrics?.starting_capital ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Peak Deployed</p>
                <p className="text-xl font-bold">
                  ${(data.overview.capital_metrics?.peak_deployed ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Final Capital</p>
                <p className="text-xl font-bold">
                  ${(data.overview.capital_metrics?.final_capital ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Net PnL</p>
                <p className="text-xl font-bold text-green-400">
                  +${(data.overview.capital_metrics?.net_pnl ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Trading Performance ROI</p>
                <p className="text-2xl font-bold text-green-400">
                  {(data.overview.capital_metrics?.trading_performance_roi ?? 0).toFixed(2)}% 🔥
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Wallet Growth ROI</p>
                <p className="text-xl font-bold text-blue-400">
                  {(data.overview.capital_metrics?.wallet_growth_roi ?? 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="bg-red-900/30 border border-red-500 p-4 rounded">
            <h3 className="text-lg font-bold mb-3">⚠️ Risk Analysis</h3>
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
                  -${(data.overview.total_confirmed_loss ?? 0).toFixed(2)}
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              {showAllTokens ? 'Show Top 20' : `Show All (${data.tokens?.length})`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="text-left p-2">Token</th>
                  <th className="text-right p-2">Trades</th>
                  <th className="text-right p-2">Invested</th>
                  <th className="text-right p-2">Returned</th>
                  <th className="text-right p-2">Realized PnL</th>
                  <th className="text-right p-2">Unrealized PnL</th>
                  <th className="text-right p-2">Net PnL</th>
                  <th className="text-right p-2">Win Rate</th>
                  <th className="text-right p-2">Time Window</th>
                  <th className="text-right p-2">Avg Hold</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(showAllTokens ? data.tokens : data.tokens?.slice(0, 20))?.map((token: any, idx: number) => {
                  // Status logic
                  let status = '';
                  let statusColor = '';
                  
                  if (token.is_rugged && token.is_held) {
                    status = '🚨 RUGGED';
                    statusColor = 'text-red-400';
                  } else if (token.traded_rug_token) {
                    const hasOpenPosition = token.open_positions > 0;
                    status = hasOpenPosition ? '⚠️ ESCAPED (partial)' : '✅ ESCAPED';
                    statusColor = 'text-yellow-400';
                  } else if (token.closed_trades > 0 && token.open_positions === 0) {
                    status = '✅ EXITED';
                    statusColor = 'text-green-400';
                  } else if (token.closed_trades > 0 && token.open_positions > 0) {
                    status = '📊 PARTIAL';
                    statusColor = 'text-blue-400';
                  } else if (token.is_held && !token.is_rugged) {
                    status = '💎 HOLDING';
                    statusColor = 'text-blue-400';
                  }
                  
                  return (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-2">
                        <div className="font-mono font-bold">{token.token_symbol}</div>
                        <div className="font-mono text-xs text-gray-400">
                          {token.token_address.slice(0, 4)}...{token.token_address.slice(-4)}
                        </div>
                      </td>
                      <td className="text-right p-2">
                        {token.total_trades}
                        <span className="text-gray-500 text-xs ml-1">
                          ({token.closed_trades}c/{token.open_positions}o)
                        </span>
                      </td>
                      <td className="text-right p-2">${(token.total_invested ?? 0).toFixed(2)}</td>
                      <td className="text-right p-2">${(token.total_returned ?? 0).toFixed(2)}</td>
                      <td className={`text-right p-2 ${token.total_realized_pnl > 0 ? 'text-green-400' : token.total_realized_pnl < 0 ? 'text-red-400' : ''}`}>
                        {token.total_realized_pnl > 0 ? '+' : ''}${(token.total_realized_pnl ?? 0).toFixed(2)}
                      </td>
                      <td className={`text-right p-2 ${token.total_unrealized_pnl > 0 ? 'text-green-400' : token.total_unrealized_pnl < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {token.open_positions > 0 
                          ? (token.total_unrealized_pnl > 0 ? '+' : '') + '$' + (token.total_unrealized_pnl ?? 0).toFixed(2)
                          : '-'}
                      </td>
                      <td className={`text-right p-2 font-bold ${token.net_pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {token.net_pnl > 0 ? '+' : ''}${(token.net_pnl ?? 0).toFixed(2)}
                      </td>
                      <td className="text-right p-2">{(token.win_rate ?? 0).toFixed(1)}%</td>
                      <td className="text-right p-2 text-xs">
                        {token.trading_window_hours ? `${(token.trading_window_hours ?? 0).toFixed(1)}h` : '-'}
                      </td>
                      <td className="text-right p-2 text-xs">
                        {token.avg_holding_hours ? `${(token.avg_holding_hours ?? 0).toFixed(1)}h` : '-'}
                      </td>
                      <td className={`p-2 text-xs ${statusColor}`}>
                        {status}
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
          {/* Closed Trades */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">✅ Closed Trades ({data.trades?.closed?.length || 0})</h3>
              <button
                onClick={() => setShowAllTrades(!showAllTrades)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                {showAllTrades ? 'Show Top 20' : `Show All (${data.trades?.closed?.length})`}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Token</th>
                    <th className="text-right p-2">Entry Price</th>
                    <th className="text-right p-2">Exit Price</th>
                    <th className="text-right p-2">Buy</th>
                    <th className="text-right p-2">Sell</th>
                    <th className="text-right p-2">PnL</th>
                    <th className="text-right p-2">ROI</th>
                    <th className="text-right p-2">Hold Time</th>
                    <th className="text-left p-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllTrades ? data.trades.closed : data.trades.closed.slice(0, 20)).map((trade: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-2">
                        <div className="font-mono text-xs font-bold">{trade.token_symbol}</div>
                        <div className="font-mono text-xs text-gray-400">
                          {trade.token_address.slice(0, 4)}...{trade.token_address.slice(-4)}
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div>${(trade.entry_price ?? 0).toFixed(8)}</div>
                        <div className="text-xs text-gray-400">{(trade.amount ?? 0).toFixed(2)}</div>
                      </td>
                      <td className="text-right p-2">
                        <div>${(trade.exit_price ?? 0).toFixed(8)}</div>
                        <div className="text-xs text-gray-400">{(trade.amount ?? 0).toFixed(2)}</div>
                      </td>
                      <td className="text-right p-2">${(trade.entry_value_usd ?? 0).toFixed(2)}</td>
                      <td className="text-right p-2">${(trade.exit_value_usd ?? 0).toFixed(2)}</td>
                      <td className={`text-right p-2 font-bold ${trade.realized_pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.realized_pnl > 0 ? '+' : ''}${(trade.realized_pnl ?? 0).toFixed(2)}
                      </td>
                      <td className={`text-right p-2 ${trade.realized_roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.realized_roi > 0 ? '+' : ''}{(trade.realized_roi ?? 0).toFixed(1)}%
                      </td>
                      <td className="text-right p-2 text-xs">
                        {trade.holding_time_seconds 
                          ? `${((trade.holding_time_seconds ?? 0) / 3600).toFixed(1)}h` 
                          : '-'}
                      </td>
                      <td className="p-2 text-xs">
                        {trade.is_rug_now && (
                          <span className="text-yellow-400" title={trade.rug_warning}>⚠️ Later Rugged</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Open Positions */}
          <div>
            <h3 className="text-lg font-bold mb-4">📊 Open Positions ({data.trades?.open?.length || 0})</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Token</th>
                    <th className="text-right p-2">Entry Price</th>
                    <th className="text-right p-2">Current Price</th>
                    <th className="text-right p-2">Invested</th>
                    <th className="text-right p-2">Current Value</th>
                    <th className="text-right p-2">Unrealized PnL</th>
                    <th className="text-right p-2">ROI</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades?.open?.map((position: any, idx: number) => (
                    <tr key={idx} className={`border-b border-gray-700 hover:bg-gray-700/50 ${position.is_rug ? 'bg-red-900/20' : ''}`}>
                      <td className="p-2">
                        <div className="font-mono text-xs font-bold">{position.token_symbol}</div>
                        <div className="font-mono text-xs text-gray-400">
                          {position.token_address.slice(0, 4)}...{position.token_address.slice(-4)}
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div>${(position.entry_price ?? 0).toFixed(8)}</div>
                        <div className="text-xs text-gray-400">{(position.amount ?? 0).toFixed(2)}</div>
                      </td>
                      <td className="text-right p-2">${(position.current_price ?? 0).toFixed(8)}</td>
                      <td className="text-right p-2">${(position.entry_value_usd ?? 0).toFixed(2)}</td>
                      <td className="text-right p-2">
                        {position.is_rug 
                          ? <span className="text-red-400">$0.00</span>
                          : `$${(position.current_value_usd ?? 0).toFixed(2)}`}
                      </td>
                      <td className={`text-right p-2 font-bold ${
                        position.is_rug 
                          ? 'text-red-400' 
                          : position.unrealized_pnl > 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                      }`}>
                        {position.is_rug 
                          ? `-$${(position.confirmed_loss ?? 0).toFixed(2)}`
                          : (position.unrealized_pnl > 0 ? '+' : '') + '$' + (position.unrealized_pnl ?? 0).toFixed(2)}
                      </td>
                      <td className={`text-right p-2 ${
                        position.is_rug 
                          ? 'text-red-400' 
                          : position.unrealized_roi > 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                      }`}>
                        {position.is_rug 
                          ? '-100.0%'
                          : (position.unrealized_roi > 0 ? '+' : '') + (position.unrealized_roi ?? 0).toFixed(1) + '%'}
                      </td>
                      <td className="p-2 text-xs">
                        {position.is_rug && (
                          <div className="text-red-400">
                            <div>🚨 RUGGED</div>
                            {position.rug_warning && (
                              <div className="text-xs text-gray-400">{position.rug_warning}</div>
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
        </div>
      )}
    </div>
  );
}
