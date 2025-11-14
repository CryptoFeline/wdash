'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { fetchTokenHistory, formatUSD, type OKXTokenData } from '@/lib/okx-api-v2';

// ============================================================================
// BUY/SELL TIMELINE CHART COMPONENT
// ============================================================================

interface BuySellTimelineChartProps {
  walletAddress: string;
  tokens: OKXTokenData[];
  chainId?: string;
}

interface TimelineDataPoint {
  time: number;
  price: number;
  type: 'buy' | 'sell';
  amount: string;
  value: string;
  count: number;
  dex: string;
}

export function BuySellTimelineChart({ 
  walletAddress, 
  tokens, 
  chainId = '501' 
}: BuySellTimelineChartProps) {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort tokens by PnL descending for dropdown
  const sortedTokens = [...tokens]
    .sort((a, b) => parseFloat(b.totalPnl || '0') - parseFloat(a.totalPnl || '0'))
    .slice(0, 50); // Limit to top 50 tokens

  // Fetch token history when selected
  useEffect(() => {
    if (!selectedToken) {
      setTimelineData([]);
      return;
    }

    const loadTokenHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchTokenHistory(walletAddress, selectedToken, chainId);

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to load token history');
        }

        // Transform API response to timeline data points
        const points: TimelineDataPoint[] = [];

        result.data.data.forEach((record) => {
          const timestamp = parseInt(record.time);

          // Add buy point if exists
          if (record.buyCount > 0 && parseFloat(record.buyValue || '0') > 0) {
            points.push({
              time: timestamp,
              price: parseFloat(record.buyPrice || '0'),
              type: 'buy',
              amount: record.buyAmount || '0',
              value: record.buyValue || '0',
              count: record.buyCount,
              dex: record.fromAddressTag || 'Unknown DEX'
            });
          }

          // Add sell point if exists
          if (record.sellCount > 0 && parseFloat(record.sellValue || '0') > 0) {
            points.push({
              time: timestamp,
              price: parseFloat(record.sellPrice || '0'),
              type: 'sell',
              amount: record.sellAmount || '0',
              value: record.sellValue || '0',
              count: record.sellCount,
              dex: record.fromAddressTag || 'Unknown DEX'
            });
          }
        });

        setTimelineData(points);
      } catch (err) {
        console.error('[BuySellTimeline] Error loading token history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadTokenHistory();
  }, [selectedToken, walletAddress, chainId]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload as TimelineDataPoint;
    const isBuy = data.type === 'buy';

    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          {isBuy ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <p className={`text-sm font-semibold ${
            isBuy ? 'text-green-400' : 'text-red-400'
          }`}>
            {isBuy ? 'BUY' : 'SELL'}
          </p>
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-6">
            <span className="text-zinc-500">Price:</span>
            <span className="text-zinc-200 font-medium">{formatUSD(data.price)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-zinc-500">Value:</span>
            <span className="text-zinc-200 font-medium">{formatUSD(data.value)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-zinc-500">Txs:</span>
            <span className="text-zinc-200">{data.count}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-zinc-500">DEX:</span>
            <span className="text-zinc-200">{data.dex}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-zinc-500">Time:</span>
            <span className="text-zinc-200">
              {new Date(data.time).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Get selected token details
  const selectedTokenData = tokens.find(t => t.tokenAddress === selectedToken);

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-100">Buy/Sell Timeline</h3>
        
        {selectedTokenData && (
          <div className="text-right">
            <p className="text-xs text-zinc-500">Total Trades</p>
            <p className="text-sm font-semibold text-zinc-200">
              {selectedTokenData.totalTxBuy + selectedTokenData.totalTxSell}
            </p>
          </div>
        )}
      </div>

      {/* Token Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Select Token
        </label>
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Choose a token --</option>
          {sortedTokens.map((token) => {
            const pnl = parseFloat(token.totalPnl || '0');
            const trades = token.totalTxBuy + token.totalTxSell;
            return (
              <option key={token.tokenAddress} value={token.tokenAddress}>
                {token.tokenSymbol} - {formatUSD(pnl)} ({trades} trades)
              </option>
            );
          })}
        </select>
      </div>

      {/* Chart Area */}
      <div className="h-96 bg-zinc-900/30 rounded-lg border border-zinc-700/30 p-4">
        {!selectedToken && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 text-sm">Select a token to view buy/sell timeline</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
            <p className="text-zinc-500 text-sm">Loading trading history...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-400 text-sm mb-2">Failed to load data</p>
            <p className="text-zinc-500 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && selectedToken && timelineData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis 
                dataKey="time"
                type="number"
                domain={['auto', 'auto']}
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                stroke="#a1a1aa"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                dataKey="price"
                type="number"
                domain={['auto', 'auto']}
                tickFormatter={(value) => formatUSD(value)}
                stroke="#a1a1aa"
                tick={{ fontSize: 11 }}
                label={{ 
                  value: 'Price (USD)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#a1a1aa', fontSize: 12 }
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              {/* Buy points (green) */}
              <Scatter
                name="Buys"
                data={timelineData.filter(d => d.type === 'buy')}
                fill="#10b981"
              >
                {timelineData.filter(d => d.type === 'buy').map((entry, index) => {
                  const size = Math.min(Math.max(parseFloat(entry.value) / 100, 50), 400);
                  return <Cell key={`buy-${index}`} r={size} />;
                })}
              </Scatter>

              {/* Sell points (red) */}
              <Scatter
                name="Sells"
                data={timelineData.filter(d => d.type === 'sell')}
                fill="#ef4444"
              >
                {timelineData.filter(d => d.type === 'sell').map((entry, index) => {
                  const size = Math.min(Math.max(parseFloat(entry.value) / 100, 50), 400);
                  return <Cell key={`sell-${index}`} r={size} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {!loading && !error && selectedToken && timelineData.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 text-sm">No trading history found for this token</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {selectedToken && timelineData.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-zinc-400">
              Buy ({timelineData.filter(d => d.type === 'buy').length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-zinc-400">
              Sell ({timelineData.filter(d => d.type === 'sell').length})
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            * Bubble size = transaction value
          </div>
        </div>
      )}
    </div>
  );
}
