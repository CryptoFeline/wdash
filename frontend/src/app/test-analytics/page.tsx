'use client';

import { useState } from 'react';

const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const TEST_CHAIN = '501';

export default function TestAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);

  const testEndpoint = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/advanced-analysis/${TEST_WALLET}/${TEST_CHAIN}`);
      const json = await response.json();

      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Advanced Analytics Test</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <p className="text-gray-400">Test Wallet:</p>
            <p className="font-mono text-sm">{TEST_WALLET}</p>
          </div>
          <div className="mb-4">
            <p className="text-gray-400">Chain:</p>
            <p>{TEST_CHAIN} (Solana)</p>
          </div>

          <button
            onClick={testEndpoint}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold"
          >
            {loading ? 'Testing...' : 'Test Advanced Analytics Endpoint'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">❌ Error</h2>
            <pre className="text-sm overflow-auto">{error}</pre>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Overview Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">📊 Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded">
                  <p className="text-gray-400 text-sm">Total Trades</p>
                  <p className="text-2xl font-bold">{data.overview.total_trades}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded">
                  <p className="text-gray-400 text-sm">Win Rate</p>
                  <p className="text-2xl font-bold">{(data.overview.win_rate ?? 0).toFixed(2)}%</p>
                </div>
                <div className="bg-gray-700 p-4 rounded">
                  <p className="text-gray-400 text-sm">Closed Trades</p>
                  <p className="text-2xl font-bold">{data.overview.closed_trades}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded">
                  <p className="text-gray-400 text-sm">Open Positions</p>
                  <p className="text-2xl font-bold">{data.overview.open_positions}</p>
                </div>
              </div>

              {/* Capital Metrics */}
              <div className="bg-blue-900/30 border border-blue-500 p-4 rounded mb-4">
                <h3 className="text-lg font-bold mb-3">💰 Capital Metrics (Use for ROI)</h3>
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

              {/* Volume Metrics */}
              <div className="bg-gray-700/50 p-4 rounded mb-4">
                <h3 className="text-lg font-bold mb-3">📈 Volume Metrics (Activity Only)</h3>
                <p className="text-sm text-yellow-400 mb-3">
                  ⚠️ {data.overview.volume_metrics.note}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Total Buy Volume</p>
                    <p className="text-lg">
                      ${(data.overview.volume_metrics?.total_buy_volume ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Sell Volume</p>
                    <p className="text-lg">
                      ${(data.overview.volume_metrics?.total_sell_volume ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Volume Ratio</p>
                    <p className="text-lg">
                      {(data.overview.volume_metrics?.volume_ratio ?? 0).toFixed(2)}x
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Trade Size</p>
                    <p className="text-lg">
                      ${(data.overview.volume_metrics?.avg_buy_size ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Buy Transactions</p>
                    <p className="text-lg">
                      {data.overview.volume_metrics.buy_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Sell Transactions</p>
                    <p className="text-lg">
                      {data.overview.volume_metrics.sell_count}
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Metrics */}
              <div className="bg-red-900/30 border border-red-500 p-4 rounded">
                <h3 className="text-lg font-bold mb-3">🚨 Risk Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Open Rugged Positions</p>
                    <p className="text-2xl font-bold text-red-400">
                      {data.overview.rugged_positions}/{data.overview.open_positions}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Unrealized losses from rugs</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Rugged Tokens (Total)</p>
                    <p className="text-xl font-bold text-red-400">
                      {data.overview.rugged_tokens}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Includes traded & held rugs</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Traded Rug Tokens</p>
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
                  <div>
                    <p className="text-gray-400 text-sm">Winning Trades</p>
                    <p className="text-xl font-bold text-green-400">
                      {data.overview.winning_trades}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Profitable closed trades</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Losing Trades</p>
                    <p className="text-xl font-bold text-red-400">
                      {data.overview.losing_trades}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.overview.losing_trades - data.overview.rugged_positions} closed + {data.overview.rugged_positions} rugged
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Trades</p>
                    <p className="text-xl font-bold text-blue-400">
                      {data.overview.total_trades}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.overview.winning_trades}W / {data.overview.losing_trades}L
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tokens Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">🪙 Tokens ({data.tokens.length})</h2>
                {data.tokens.length > 10 && (
                  <button
                    onClick={() => setShowAllTokens(!showAllTokens)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                  >
                    {showAllTokens ? 'Show Less' : 'Show All'}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
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
                    {(showAllTokens ? data.tokens : data.tokens.slice(0, 10)).map((token: any, idx: number) => {
                      // Status logic
                      let status = '';
                      let statusColor = '';
                      
                      if (token.is_rugged && token.is_held) {
                        // RUGGED: Open position that got rugged (no exit)
                        status = '🚨 RUGGED';
                        statusColor = 'text-red-400';
                      } else if (token.traded_rug_token) {
                        // ESCAPED: Traded and exited (fully or partially) but token rugged later
                        const hasOpenPosition = token.open_positions > 0;
                        status = hasOpenPosition ? '⚠️ ESCAPED (partial)' : '✅ ESCAPED';
                        statusColor = 'text-yellow-400';
                      } else if (token.closed_trades > 0 && token.open_positions === 0) {
                        // EXITED: Fully exited, not a scam
                        status = '✅ EXITED';
                        statusColor = 'text-green-400';
                      } else if (token.closed_trades > 0 && token.open_positions > 0) {
                        // PARTIAL: Partially exited, still holding, not a scam
                        status = '📊 PARTIAL';
                        statusColor = 'text-blue-400';
                      } else if (token.is_held && !token.is_rugged) {
                        // HOLDING: Only bought, not sold yet, not a scam
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
                {!showAllTokens && data.tokens.length > 10 && (
                  <p className="text-gray-400 text-sm mt-2">
                    Showing 10 of {data.tokens.length} tokens
                  </p>
                )}
              </div>
            </div>

            {/* FIFO Trades Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  📋 FIFO Trades ({data.trades.closed.length} closed, {data.trades.open.length} open)
                </h2>
                {(data.trades.closed.length + data.trades.open.length) > 20 && (
                  <button
                    onClick={() => setShowAllTrades(!showAllTrades)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                  >
                    {showAllTrades ? 'Show Less' : 'Show All'}
                  </button>
                )}
              </div>

              {/* FIFO Summary Metrics */}
              <div className="bg-blue-900/30 border border-blue-500 p-4 rounded mb-6">
                <h3 className="text-lg font-bold mb-3">📊 Trade-Level Summary (Per Trade Metrics)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Per-Trade Win Rate</p>
                    <p className="text-lg font-bold text-blue-400">
                      {(((data.overview.winning_trades ?? 0) / Math.max(data.overview.total_trades ?? 1, 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.overview.winning_trades}W / {data.overview.total_trades}T
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Win (Closed)</p>
                    <p className="text-lg font-bold text-green-400">
                      +${((data.trades.closed.filter((t: any) => (t.realized_pnl ?? 0) > 0)
                        .reduce((sum: number, t: any) => sum + (t.realized_pnl ?? 0), 0) / 
                        Math.max(data.trades.closed.filter((t: any) => (t.realized_pnl ?? 0) > 0).length, 1)) ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Loss (Closed)</p>
                    <p className="text-lg font-bold text-red-400">
                      -${(Math.abs(data.trades.closed.filter((t: any) => (t.realized_pnl ?? 0) < 0)
                        .reduce((sum: number, t: any) => sum + (t.realized_pnl ?? 0), 0) / 
                        Math.max(data.trades.closed.filter((t: any) => (t.realized_pnl ?? 0) < 0).length, 1)) ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Per-Trade PnL</p>
                    <p className={`text-lg font-bold ${(data.overview.net_pnl ?? 0) / Math.max(data.overview.total_trades ?? 1, 1) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(data.overview.net_pnl ?? 0) / Math.max(data.overview.total_trades ?? 1, 1) > 0 ? '+' : ''}${(((data.overview.net_pnl ?? 0) / Math.max(data.overview.total_trades ?? 1, 1)) ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {((((data.overview.net_pnl ?? 0) / Math.max(data.overview.total_trades ?? 1, 1)) / ((data.overview.capital_metrics?.total_buy_volume ?? 0) / Math.max(data.overview.total_trades ?? 1, 1))) * 100).toFixed(1)}% avg ROI
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Hold Time</p>
                    <p className="text-lg font-bold text-blue-400">
                      {(() => {
                        const closedSeconds = data.trades.closed.reduce((sum: number, t: any) => sum + (t.holding_time_seconds || 0), 0);
                        const openSeconds = data.trades.open.reduce((sum: number, t: any) => {
                          if (t.entry_time) {
                            return sum + ((Date.now() - t.entry_time) / 1000);
                          }
                          return sum;
                        }, 0);
                        const totalHours = (closedSeconds + openSeconds) / 3600;
                        const avgHours = totalHours / Math.max((data.trades.closed.length + data.trades.open.length), 1);
                        return (avgHours ?? 0).toFixed(1);
                      })()}h
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Across all trades
                    </p>
                  </div>
                </div>
              </div>

              {/* Closed Trades */}
              {data.trades.closed.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3 text-green-400">✅ Closed Trades ({data.trades.closed.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-2">Token</th>
                          <th className="text-right p-2">Entry Price<br/><span className="text-xs text-gray-400">(Buy Amount)</span></th>
                          <th className="text-right p-2">Exit Price<br/><span className="text-xs text-gray-400">(Sell Amount)</span></th>
                          <th className="text-right p-2">Entry Value</th>
                          <th className="text-right p-2">Exit Value</th>
                          <th className="text-right p-2">PnL</th>
                          <th className="text-right p-2">ROI</th>
                          <th className="text-right p-2">Hold Time</th>
                          <th className="text-left p-2">Status</th>
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
                    {!showAllTrades && data.trades.closed.length > 20 && (
                      <p className="text-gray-400 text-sm mt-2">
                        Showing 20 of {data.trades.closed.length} closed trades
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Open Positions */}
              {data.trades.open.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3 text-blue-400">
                    💎 Open Positions ({data.trades.open.length})
                    {data.trades.open.filter((t: any) => t.is_rug).length > 0 && (
                      <span className="text-red-400 ml-2">
                        ({data.trades.open.filter((t: any) => t.is_rug).length} rugged)
                      </span>
                    )}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-2">Token</th>
                          <th className="text-right p-2">Entry Price<br/><span className="text-xs text-gray-400">(Buy Amount)</span></th>
                          <th className="text-right p-2">Current Price</th>
                          <th className="text-right p-2">Entry Value</th>
                          <th className="text-right p-2">Current Value</th>
                          <th className="text-right p-2">Unrealized PnL</th>
                          <th className="text-right p-2">ROI</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllTrades ? data.trades.open : data.trades.open.slice(0, 20)).map((position: any, idx: number) => (
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
                                  {position.rug_reason && position.rug_reason.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {position.rug_reason.join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!showAllTrades && data.trades.open.length > 20 && (
                      <p className="text-gray-400 text-sm mt-2">
                        Showing 20 of {data.trades.open.length} open positions
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Raw JSON */}
            <details className="bg-gray-800 rounded-lg p-6">
              <summary className="text-xl font-bold cursor-pointer mb-4">
                📄 Raw JSON Response
              </summary>
              <pre className="text-xs overflow-auto bg-gray-900 p-4 rounded">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
