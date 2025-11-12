'use client';

import { useState } from 'react';
import { TrendChart } from '@/components/TrendChart';
import { TopGainersCard } from '@/components/TopGainersCard';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

export default function AnalyticsPage() {
  const [chain, setChain] = useState('eth');
  const [trendDays, setTrendDays] = useState('7');
  const [gainersDays, setGainersDays] = useState('7');

  return (
    <div className="space-y-8">
      {/* Controls */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chain
            </label>
            <Select value={chain} onValueChange={setChain}>
              <option value="eth">Ethereum</option>
              <option value="sol">Solana</option>
              <option value="arb">Arbitrum</option>
              <option value="base">Base</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trend Period (days)
            </label>
            <Select value={trendDays} onValueChange={setTrendDays}>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Top Gainers Period (days)
            </label>
            <Select value={gainersDays} onValueChange={setGainersDays}>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart - Spans 2 columns on desktop */}
        <div className="lg:col-span-2">
          <TrendChart chain={chain} days={parseInt(trendDays)} />
        </div>

        {/* Top Gainers - Right sidebar on desktop */}
        <div>
          <TopGainersCard chain={chain} days={parseInt(gainersDays)} />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Snapshot Data
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Historical wallet metrics are automatically captured every time wallets are synced. Each snapshot preserves the wallet state at that moment.
          </p>
          <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </a>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Trend Analysis
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Track portfolio performance over time. See average PnL, win rates, and profit trends across all tracked wallets.
          </p>
          <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </a>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Top Performers
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Identify wallets with the strongest profit growth over your selected period. Great for learning from top traders.
          </p>
          <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </a>
        </Card>
      </div>

      {/* Data Quality Notice */}
      <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Data Quality Note
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Analytics improve as more snapshots accumulate. Perform wallet syncs regularly to build historical data. 
          The more snapshots you have, the more accurate the trend analysis becomes.
        </p>
      </Card>
    </div>
  );
}
