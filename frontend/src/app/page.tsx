'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWallets, fetchStats } from '@/lib/api';
import { Wallet, PaginatedResponse, StatsResponse } from '@/types/wallet';
import WalletTable from '@/components/WalletTable';
import FilterBar from '@/components/FilterBar';
import StatsCards from '@/components/StatsCards';
import { AdvancedFilterValues } from '@/components/AdvancedFilters';
import { ThemeToggle } from '@/components/ThemeToggle';

const DEFAULT_ADVANCED_FILTERS: AdvancedFilterValues = {
  pnlMin: -100,
  pnlMax: 1000,
  roiMin: 0,
  roiMax: 10000,
  tokensMin: 0,
  tokensMax: 500,
  holdTimeMin: 0,
  holdTimeMax: 168,
  rugPullMax: 100,
};

export default function Home() {
  const [chain, setChain] = useState('sol');
  const [timeframe, setTimeframe] = useState('7d');
  const [tag, setTag] = useState('all');
  const [page, setPage] = useState(1);
  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>(DEFAULT_ADVANCED_FILTERS);

  // Fetch wallets
  const { data: walletsData, isLoading: walletsLoading, refetch: refetchWallets } = useQuery<PaginatedResponse>({
    queryKey: ['wallets', chain, timeframe, tag, page],
    queryFn: () => fetchWallets({ chain, timeframe, tag, page, limit: 50 }),
  });

  // Fetch stats
  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['stats', chain, timeframe, tag],
    queryFn: () => fetchStats({ chain, timeframe, tag }),
  });

  // Append new wallets when pagination changes
  useEffect(() => {
    if (walletsData?.data) {
      if (page === 1) {
        setAllWallets(walletsData.data);
      } else {
        setAllWallets((prev) => [...prev, ...walletsData.data]);
      }
    }
  }, [walletsData, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setAllWallets([]);
  }, [chain, timeframe, tag]);

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  const handleRefresh = () => {
    setPage(1);
    setAllWallets([]);
    refetchWallets();
  };

  // Apply all filters
  const filteredWallets = useMemo(() => {
    let filtered = allWallets;

    // Advanced filters
    filtered = filtered.filter(w => {
      // PnL filter
      const pnl = typeof w.pnl_7d === 'string' ? parseFloat(w.pnl_7d) : w.pnl_7d;
      if (pnl < advancedFilters.pnlMin || pnl > advancedFilters.pnlMax) return false;

      // ROI (Realized Profit) filter
      const profit = typeof w.realized_profit_7d === 'string' ? parseFloat(w.realized_profit_7d) : w.realized_profit_7d;
      if (profit < advancedFilters.roiMin || profit > advancedFilters.roiMax) return false;

      // Tokens filter
      const tokens = w.token_num_7d || 0;
      if (tokens < advancedFilters.tokensMin || tokens > advancedFilters.tokensMax) return false;

      // Hold time filter (convert to hours)
      const holdTime = (w.avg_holding_period_7d || 0) / 3600; // seconds to hours
      if (holdTime < advancedFilters.holdTimeMin || holdTime > advancedFilters.holdTimeMax) return false;

      // Rug pull filter
      const rugPullRatio = (w.risk?.sell_pass_buy_ratio || 0) * 100;
      if (rugPullRatio > advancedFilters.rugPullMax) return false;

      return true;
    });

    return filtered;
  }, [allWallets, advancedFilters]);

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Wallet Dashboard
          </h1>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={statsData || null} isLoading={statsLoading} />

        {/* Filters */}
        <FilterBar
          chain={chain}
          timeframe={timeframe}
          tag={tag}
          onChainChange={setChain}
          onTimeframeChange={setTimeframe}
          onTagChange={setTag}
          onRefresh={handleRefresh}
          isLoading={walletsLoading}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={setAdvancedFilters}
        />

        {/* Filter Status */}
        {filteredWallets.length < allWallets.length && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredWallets.length} of {allWallets.length} wallets
          </div>
        )}

        {/* Table */}
        <WalletTable
          wallets={filteredWallets}
          chain={chain}
          onLoadMore={handleLoadMore}
          hasMore={walletsData?.hasMore || false}
          isLoading={walletsLoading}
        />
      </div>
    </div>
  );
}
