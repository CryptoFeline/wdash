'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { calculateWinRateBuckets, type OKXTokenData } from '@/lib/okx-api-v2';

// ============================================================================
// WIN RATE BUCKETS CHART COMPONENT
// ============================================================================

interface WinRateBucketsChartProps {
  tokens: OKXTokenData[];
}

export function WinRateBucketsChart({ tokens }: WinRateBucketsChartProps) {
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  // Calculate win rate buckets distribution
  const buckets = calculateWinRateBuckets(tokens);

  // Prepare chart data
  const chartData = buckets.map((bucket, index) => ({
    label: bucket.label,
    count: bucket.count,
    tokens: bucket.tokens,
    index
  }));

  // Color gradient from green (high win rate) to red (low win rate)
  const colors = [
    'hsl(var(--chart-4))',   // 100% - green
    'hsl(var(--chart-4))',   // 100-75% - light green  
    'hsl(var(--chart-2))',   // 75-50% - blue
    'hsl(var(--chart-5))',   // 50-25% - orange
    'hsl(var(--chart-1))',   // 25-0% - dark orange
    'hsl(var(--destructive))'// 0% - red
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const tokensInBucket = data.tokens || [];

    return (
      <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-xl max-w-xs">
        <p className="text-sm font-semibold text-foreground mb-2">
          {data.label} Win Rate
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {data.count} token{data.count !== 1 ? 's' : ''}
        </p>
        
        {tokensInBucket.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Tokens:
            </p>
            {tokensInBucket.slice(0, 10).map((token: any, i: number) => (
              <div 
                key={i}
                className="flex items-center justify-between text-xs border-b border-border pb-1"
              >
                <span className="text-foreground font-medium">{token.symbol}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{token.winRate}%</span>
                  <span className="text-muted-foreground">({token.tradeCount} tx)</span>
                </div>
              </div>
            ))}
            {tokensInBucket.length > 10 && (
              <p className="text-xs text-muted-foreground italic mt-1">
                +{tokensInBucket.length - 10} more...
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Win Rate Distribution</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Tokens</p>
          <p className="text-lg font-bold text-foreground">{tokens.length}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            onClick={(data) => {
              if (data && data.activeTooltipIndex !== undefined) {
                const index = typeof data.activeTooltipIndex === 'number' 
                  ? data.activeTooltipIndex 
                  : null;
                setSelectedBucket(selectedBucket === index ? null : index);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis 
              dataKey="label" 
              stroke="#a1a1aa"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#a1a1aa"
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Token Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#a1a1aa', fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar 
              dataKey="count" 
              radius={[8, 8, 0, 0]}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index]}
                  opacity={selectedBucket === null || selectedBucket === index ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-zinc-700/50">
        <div className="grid grid-cols-3 gap-2 text-xs">
          {buckets.map((bucket, index) => (
            <button
              key={bucket.label}
              onClick={() => setSelectedBucket(selectedBucket === index ? null : index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                selectedBucket === null || selectedBucket === index
                  ? 'bg-zinc-800/50 hover:bg-zinc-800'
                  : 'bg-zinc-900/30 opacity-50'
              }`}
            >
              <div 
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: colors[index] }}
              />
              <div className="flex-1 text-left">
                <p className="text-zinc-300 font-medium">{bucket.label}</p>
                <p className="text-zinc-500">{bucket.count} tokens</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Bucket Details */}
      {selectedBucket !== null && buckets[selectedBucket].tokens.length > 0 && (
        <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <p className="text-sm font-semibold text-zinc-200 mb-3">
            {buckets[selectedBucket].label} Win Rate Tokens
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {buckets[selectedBucket].tokens.slice(0, 20).map((token, i) => (
              <div 
                key={i}
                className="flex items-center justify-between text-xs py-1.5 px-2 bg-zinc-800/30 rounded"
              >
                <span className="text-zinc-300 font-medium">{token.symbol}</span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">{token.winRate.toFixed(1)}%</span>
                  <span className="text-zinc-500">{token.tradeCount} trades</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
