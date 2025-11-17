'use client';

import { useState } from 'react';

const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const TEST_CHAIN = '501';

export default function TestAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
                  <p className="text-2xl font-bold">{data.overview.win_rate.toFixed(2)}%</p>
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
                      ${data.overview.capital_metrics.starting_capital.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Peak Deployed</p>
                    <p className="text-xl font-bold">
                      ${data.overview.capital_metrics.peak_deployed.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Final Capital</p>
                    <p className="text-xl font-bold">
                      ${data.overview.capital_metrics.final_capital.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Net PnL</p>
                    <p className="text-xl font-bold text-green-400">
                      +${data.overview.capital_metrics.net_pnl.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Trading Performance ROI</p>
                    <p className="text-2xl font-bold text-green-400">
                      {data.overview.capital_metrics.trading_performance_roi.toFixed(2)}% 🔥
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Wallet Growth ROI</p>
                    <p className="text-xl font-bold text-blue-400">
                      {data.overview.capital_metrics.wallet_growth_roi.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Volume Metrics */}
              <div className="bg-gray-700/50 p-4 rounded">
                <h3 className="text-lg font-bold mb-3">📈 Volume Metrics (Activity Only)</h3>
                <p className="text-sm text-yellow-400 mb-3">
                  ⚠️ {data.overview.volume_metrics.note}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Total Buy Volume</p>
                    <p className="text-lg">
                      ${data.overview.volume_metrics.total_buy_volume.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Sell Volume</p>
                    <p className="text-lg">
                      ${data.overview.volume_metrics.total_sell_volume.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Volume Ratio</p>
                    <p className="text-lg">
                      {data.overview.volume_metrics.volume_ratio.toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tokens Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">🪙 Tokens ({data.tokens.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-right p-2">Trades</th>
                      <th className="text-right p-2">Invested</th>
                      <th className="text-right p-2">Returned</th>
                      <th className="text-right p-2">Net PnL</th>
                      <th className="text-right p-2">Win Rate</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tokens.slice(0, 10).map((token: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-700">
                        <td className="p-2 font-mono">{token.token_symbol}</td>
                        <td className="text-right p-2">{token.total_trades}</td>
                        <td className="text-right p-2">${token.total_invested.toFixed(2)}</td>
                        <td className="text-right p-2">${token.total_returned.toFixed(2)}</td>
                        <td className={`text-right p-2 ${token.net_pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {token.net_pnl > 0 ? '+' : ''}${token.net_pnl.toFixed(2)}
                        </td>
                        <td className="text-right p-2">{token.win_rate.toFixed(1)}%</td>
                        <td className="p-2">
                          {token.is_rugged && <span className="text-red-400">🚨 RUGGED</span>}
                          {token.traded_rug_token && <span className="text-yellow-400">⚠️ EXITED</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.tokens.length > 10 && (
                  <p className="text-gray-400 text-sm mt-2">
                    Showing 10 of {data.tokens.length} tokens
                  </p>
                )}
              </div>
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
