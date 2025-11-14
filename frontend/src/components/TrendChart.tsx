'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAverageMetricsTrend } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';

interface TrendChartProps {
  chain?: string;
  days?: number;
}

/**
 * Portfolio average metrics trend across all wallets
 */
export function TrendChart({ chain = 'eth', days = 7 }: TrendChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const trend = await getAverageMetricsTrend(chain, days);
        setData(trend);
      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError('Failed to load trend data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [chain, days]);

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Trend</h3>
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          Loading trend data...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Trend</h3>
        <div className="h-80 flex items-center justify-center text-destructive">
          {error}
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Trend</h3>
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          No snapshot data yet. Sync wallets to generate analytics.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Portfolio Average Trend ({days} days)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value) => {
              if (typeof value === 'number') {
                return value.toFixed(2);
              }
              return value;
            }}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '4px' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="avg_pnl_7d" 
            stroke="#3b82f6" 
            name="Avg PnL %"
            isAnimationActive={false}
          />
          <Line 
            type="monotone" 
            dataKey="avg_profit_7d" 
            stroke="#10b981"
            name="Avg Profit"
            isAnimationActive={false}
          />
          <Line 
            type="monotone" 
            dataKey="avg_winrate_7d" 
            stroke="#f59e0b"
            name="Avg Win Rate %"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
