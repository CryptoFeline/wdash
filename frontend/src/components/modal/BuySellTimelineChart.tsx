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
        // result.data is OKXTokenHistoryResponse with .data array inside
        const points: TimelineDataPoint[] = [];
        const historyData = result.data.data || [];

        if (!Array.isArray(historyData)) {
          throw new Error('Invalid history data format: expected array');
        }

        historyData.forEach((record: any) => {
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
      <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          {isBuy ? (
            <TrendingUp className="w-4 h-4 text-chart-4" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
          <p className={`text-sm font-semibold ${
            isBuy ? 'text-chart-4' : 'text-destructive'
          }`}>
            {isBuy ? 'BUY' : 'SELL'}
          </p>
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Price:</span>
            <span className="text-foreground font-medium">{formatUSD(data.price)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Value:</span>
            <span className="text-foreground font-medium">{formatUSD(data.value)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Txs:</span>
            <span className="text-foreground">{data.count}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">DEX:</span>
            <span className="text-foreground">{data.dex}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Time:</span>
            <span className="text-foreground">
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
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Buy/Sell Timeline</h3>
        
        {selectedTokenData && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="text-sm font-semibold text-foreground">
              {selectedTokenData.totalTxBuy + selectedTokenData.totalTxSell}
            </p>
          </div>
        )}
      </div>

      {/* Token Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Select Token
        </label>
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          className="w-full px-4 py-2.5 bg-secondary/50 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
      <div className="h-96 bg-secondary/30 rounded-lg border border-border p-4">
        {!selectedToken && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Select a token to view buy/sell timeline</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-muted-foreground text-sm">Loading trading history...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-destructive text-sm mb-2">Failed to load data</p>
            <p className="text-muted-foreground text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && selectedToken && timelineData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time"
                type="number"
                domain={['auto', 'auto']}
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                stroke="hsl(var(--muted-foreground))"
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
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                label={{ 
                  value: 'Price (USD)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              {/* Buy points (chart-4 green) */}
              <Scatter
                name="Buys"
                data={timelineData.filter(d => d.type === 'buy')}
                fill="hsl(var(--chart-4))"
              >
                {timelineData.filter(d => d.type === 'buy').map((entry, index) => {
                  const size = Math.min(Math.max(parseFloat(entry.value) / 100, 50), 400);
                  return <Cell key={`buy-${index}`} r={size} />;
                })}
              </Scatter>

              {/* Sell points (destructive red) */}
              <Scatter
                name="Sells"
                data={timelineData.filter(d => d.type === 'sell')}
                fill="hsl(var(--destructive))"
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
            <p className="text-muted-foreground text-sm">No trading history found for this token</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {selectedToken && timelineData.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-4" />
            <span className="text-xs text-muted-foreground">
              Buy ({timelineData.filter(d => d.type === 'buy').length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">
              Sell ({timelineData.filter(d => d.type === 'sell').length})
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            * Bubble size = transaction value
          </div>
        </div>
      )}
    </div>
  );
}
