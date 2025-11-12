# Task 3: Historical Tracking & Analytics

## Overview

**Goal**: Track wallet performance over time and enable analytics queries.

**Strategy**: Create snapshots on every sync, query trends, identify patterns.

---

## Database Tables (Review)

### Wallets Table
- One row per wallet per chain
- Always updated to latest data
- `last_synced` timestamp updated on each sync

### Wallet Snapshots Table
- One row per sync per wallet
- Created automatically when wallet is synced
- Stores full wallet data + extracted metrics at that point in time
- Enables trend analysis

---

## Implementation: Backend

### Step 1: Extract Helper Functions

File: `backend/scraper/fetcher.js` (add these functions)

```javascript
/**
 * Extract metadata for indexing (denormalized columns)
 * Used to populate wallets.metadata JSONB column
 */
export function extractMetadata(wallet) {
  return {
    pnl_7d: wallet.pnl_7d || 0,
    pnl_30d: wallet.pnl_30d || 0,
    realized_profit_7d: wallet.realized_profit_7d || 0,
    realized_profit_30d: wallet.realized_profit_30d || 0,
    winrate_7d: wallet.winrate_7d || 0,
    token_num_7d: wallet.token_num_7d || 0,
    buy_30d: wallet.buy_30d || 0,
    sell_30d: wallet.sell_30d || 0,
    tags: wallet.tags || [],
    risk: wallet.risk ? {
      token_honeypot_ratio: wallet.risk.token_honeypot_ratio || 0,
      sell_pass_buy_ratio: wallet.risk.sell_pass_buy_ratio || 0,
      fast_tx_ratio: wallet.risk.fast_tx_ratio || 0
    } : {},
  };
}

/**
 * Extract metrics for snapshots (used in analytics)
 * Smaller subset of metadata for snapshots
 */
export function extractMetrics(wallet) {
  return {
    pnl_7d: wallet.pnl_7d || 0,
    pnl_30d: wallet.pnl_30d || 0,
    realized_profit_7d: wallet.realized_profit_7d || 0,
    realized_profit_30d: wallet.realized_profit_30d || 0,
    winrate_7d: wallet.winrate_7d || 0,
    token_num_7d: wallet.token_num_7d || 0,
    buy_30d: wallet.buy_30d || 0,
    sell_30d: wallet.sell_30d || 0,
  };
}
```

---

## Frontend: Historical Data Queries

### Step 1: Add Snapshot Client Functions

File: `frontend/src/lib/supabase-client.ts` (add to existing file)

```typescript
/**
 * Get wallet snapshots for trend analysis
 * 
 * @param walletAddress - Wallet to get snapshots for
 * @param chain - Chain name
 * @param days - How many days back (default 30)
 */
export async function getWalletTrend(
  walletAddress: string,
  chain: string = 'eth',
  days: number = 30
): Promise<Array<{
  snapped_at: string;
  pnl_7d: number;
  realized_profit_7d: number;
  winrate_7d: number;
}>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('snapped_at, metrics')
      .eq('wallet_address', walletAddress)
      .eq('chain', chain)
      .gte('snapped_at', since.toISOString())
      .order('snapped_at', { ascending: true });
    
    if (error) {
      console.error('[Snapshots] Query error:', error);
      return [];
    }
    
    // Flatten metrics from JSONB
    return data.map(row => ({
      snapped_at: row.snapped_at,
      pnl_7d: row.metrics?.pnl_7d || 0,
      realized_profit_7d: row.metrics?.realized_profit_7d || 0,
      winrate_7d: row.metrics?.winrate_7d || 0,
    }));
    
  } catch (error) {
    console.error('[Snapshots] Get trend failed:', error);
    return [];
  }
}

/**
 * Get best performing wallets (by realized profit growth)
 * 
 * @param chain - Chain to query
 * @param days - Period to analyze (default 7)
 */
export async function getTopGainers(
  chain: string = 'eth',
  days: number = 7
): Promise<Array<{
  wallet_address: string;
  profit_change: number;
  current_profit: number;
}>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Get snapshots from period
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('wallet_address, metrics')
      .eq('chain', chain)
      .gte('snapped_at', since.toISOString())
      .order('wallet_address, snapped_at', { ascending: [true, true] });
    
    if (error) {
      console.error('[Analytics] Query error:', error);
      return [];
    }
    
    // Group by wallet and calculate profit change
    const walletTrends: {
      [key: string]: {
        start_profit: number;
        end_profit: number;
      };
    } = {};
    
    data.forEach(row => {
      const walletAddr = row.wallet_address;
      const profit = row.metrics?.realized_profit_7d || 0;
      
      if (!walletTrends[walletAddr]) {
        walletTrends[walletAddr] = {
          start_profit: profit,
          end_profit: profit,
        };
      } else {
        walletTrends[walletAddr].end_profit = profit;
      }
    });
    
    // Calculate gains and sort
    const gainers = Object.entries(walletTrends)
      .map(([wallet, trend]) => ({
        wallet_address: wallet,
        profit_change: trend.end_profit - trend.start_profit,
        current_profit: trend.end_profit,
      }))
      .sort((a, b) => b.profit_change - a.profit_change)
      .slice(0, 10); // Top 10
    
    return gainers;
    
  } catch (error) {
    console.error('[Analytics] Top gainers failed:', error);
    return [];
  }
}

/**
 * Get average metrics trend across all wallets
 * Useful for dashboard analytics
 */
export async function getAverageMetricsTrend(
  chain: string = 'eth',
  days: number = 7
): Promise<Array<{
  date: string;
  avg_pnl_7d: number;
  avg_profit_7d: number;
  avg_winrate_7d: number;
  wallet_count: number;
}>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Fetch snapshots
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('snapped_at, metrics')
      .eq('chain', chain)
      .gte('snapped_at', since.toISOString())
      .order('snapped_at', { ascending: true });
    
    if (error) {
      console.error('[Analytics] Query error:', error);
      return [];
    }
    
    // Group by date and calculate averages
    const dailyStats: {
      [date: string]: {
        pnl_sum: number;
        profit_sum: number;
        winrate_sum: number;
        count: number;
      };
    } = {};
    
    data.forEach(row => {
      const date = new Date(row.snapped_at).toISOString().split('T')[0];
      const metrics = row.metrics || {};
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          pnl_sum: 0,
          profit_sum: 0,
          winrate_sum: 0,
          count: 0,
        };
      }
      
      dailyStats[date].pnl_sum += metrics.pnl_7d || 0;
      dailyStats[date].profit_sum += metrics.realized_profit_7d || 0;
      dailyStats[date].winrate_sum += metrics.winrate_7d || 0;
      dailyStats[date].count += 1;
    });
    
    // Calculate averages
    const trend = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        avg_pnl_7d: stats.pnl_sum / stats.count,
        avg_profit_7d: stats.profit_sum / stats.count,
        avg_winrate_7d: stats.winrate_sum / stats.count,
        wallet_count: stats.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return trend;
    
  } catch (error) {
    console.error('[Analytics] Average metrics trend failed:', error);
    return [];
  }
}
```

### Step 2: Create Deep Dive Analytics Component

File: `frontend/src/components/DeepDiveChart.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getWalletTrend, getAverageMetricsTrend } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';

interface WalletTrendProps {
  walletAddress: string;
  chain: string;
}

/**
 * Show PnL trend for a specific wallet
 */
export function WalletTrendChart({ walletAddress, chain }: WalletTrendProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const trend = await getWalletTrend(walletAddress, chain, 30);
      setData(trend);
      setLoading(false);
    }

    loadData();
  }, [walletAddress, chain]);

  if (loading) return <div>Loading trend data...</div>;

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-4">PnL Trend (30 days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="snapped_at" 
            tickFormatter={(val) => new Date(val).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip 
            formatter={(value) => `${(value * 100).toFixed(2)}%`}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="pnl_7d" 
            stroke="#8884d8" 
            name="PnL 7d"
          />
          <Line 
            type="monotone" 
            dataKey="realized_profit_7d" 
            stroke="#82ca9d"
            yAxisId="right"
            name="Profit 7d"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Show average metrics trend across all wallets
 */
export function AverageMetricsTrendChart({ chain = 'eth' }: { chain: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const trend = await getAverageMetricsTrend(chain, 7);
      setData(trend);
      setLoading(false);
    }

    loadData();
  }, [chain]);

  if (loading) return <div>Loading analytics...</div>;

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-4">Portfolio Average Trend (7 days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip 
            formatter={(value) => value.toFixed(2)}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="avg_pnl_7d" 
            stroke="#8884d8" 
            name="Avg PnL"
          />
          <Line 
            type="monotone" 
            dataKey="avg_winrate_7d" 
            stroke="#82ca9d"
            name="Avg Win Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

---

## Supabase SQL Queries for Analytics

### Get Wallet Performance Trend

```sql
SELECT 
  snapped_at,
  metrics->>'pnl_7d' as pnl_7d,
  metrics->>'realized_profit_7d' as profit_7d,
  metrics->>'winrate_7d' as winrate
FROM wallet_snapshots
WHERE wallet_address = 'wallet_address_here'
  AND chain = 'eth'
  AND snapped_at > NOW() - INTERVAL '30 days'
ORDER BY snapped_at ASC;
```

### Find Top Gainers (Last 7 Days)

```sql
WITH first_snap AS (
  SELECT 
    wallet_address,
    CAST(metrics->>'realized_profit_7d' AS NUMERIC) as first_profit,
    ROW_NUMBER() OVER (PARTITION BY wallet_address ORDER BY snapped_at ASC) as rn
  FROM wallet_snapshots
  WHERE chain = 'eth'
    AND snapped_at > NOW() - INTERVAL '7 days'
),
last_snap AS (
  SELECT 
    wallet_address,
    CAST(metrics->>'realized_profit_7d' AS NUMERIC) as last_profit,
    ROW_NUMBER() OVER (PARTITION BY wallet_address ORDER BY snapped_at DESC) as rn
  FROM wallet_snapshots
  WHERE chain = 'eth'
    AND snapped_at > NOW() - INTERVAL '7 days'
)
SELECT 
  f.wallet_address,
  f.first_profit,
  l.last_profit,
  (l.last_profit - f.first_profit) as profit_gain
FROM first_snap f
JOIN last_snap l ON f.wallet_address = l.wallet_address
WHERE f.rn = 1 AND l.rn = 1
ORDER BY profit_gain DESC
LIMIT 10;
```

### Average Portfolio Metrics by Date

```sql
SELECT 
  DATE(snapped_at) as date,
  COUNT(DISTINCT wallet_address) as wallet_count,
  AVG(CAST(metrics->>'pnl_7d' AS NUMERIC)) as avg_pnl_7d,
  AVG(CAST(metrics->>'realized_profit_7d' AS NUMERIC)) as avg_profit_7d,
  AVG(CAST(metrics->>'winrate_7d' AS NUMERIC)) as avg_winrate_7d
FROM wallet_snapshots
WHERE chain = 'eth'
  AND snapped_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(snapped_at)
ORDER BY date DESC;
```

### Wallet Performance Comparison

```sql
-- Compare wallet metrics between two dates
WITH old_metrics AS (
  SELECT 
    wallet_address,
    CAST(metrics->>'pnl_7d' AS NUMERIC) as pnl,
    CAST(metrics->>'realized_profit_7d' AS NUMERIC) as profit,
    snapped_at
  FROM wallet_snapshots
  WHERE chain = 'eth'
    AND snapped_at < NOW() - INTERVAL '7 days'
  ORDER BY wallet_address, snapped_at DESC
  LIMIT 1
),
new_metrics AS (
  SELECT 
    wallet_address,
    CAST(metrics->>'pnl_7d' AS NUMERIC) as pnl,
    CAST(metrics->>'realized_profit_7d' AS NUMERIC) as profit,
    snapped_at
  FROM wallet_snapshots
  WHERE chain = 'eth'
    AND snapped_at > NOW() - INTERVAL '1 day'
  ORDER BY wallet_address, snapped_at DESC
  LIMIT 1
)
SELECT 
  n.wallet_address,
  o.pnl as old_pnl,
  n.pnl as new_pnl,
  (n.pnl - o.pnl) as pnl_change,
  o.profit as old_profit,
  n.profit as new_profit,
  (n.profit - o.profit) as profit_change
FROM new_metrics n
JOIN old_metrics o ON n.wallet_address = o.wallet_address
ORDER BY profit_change DESC;
```

---

## Data Retention & Cleanup (Future)

For long-term data, you may want to archive old snapshots:

```javascript
/**
 * Archive snapshots older than 90 days (runs monthly)
 * Keep high-level aggregates, delete detailed snapshots
 */
export async function archiveOldSnapshots() {
  try {
    const { error } = await supabase
      .from('wallet_snapshots')
      .delete()
      .lt('snapped_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    console.log('[Archive] Old snapshots cleaned up');
  } catch (error) {
    console.error('[Archive] Cleanup failed:', error);
  }
}
```

---

## Summary

✅ Snapshots created automatically on sync
✅ Query wallet trends over time
✅ Aggregate analytics across wallets
✅ Deep dive insights and performance tracking
✅ Ready for dashboard components

**Next**: Deploy and test everything end-to-end

