'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWallets, fetchStats } from '@/lib/api';
import { Wallet, PaginatedResponse, StatsResponse } from '@/types/wallet';
import WalletTable from '@/components/WalletTable';
import FilterBar from '@/components/FilterBar';
import StatsCards from '@/components/StatsCards';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const [chain, setChain] = useState('sol');
  const [timeframe, setTimeframe] = useState('7d');
  const [tag, setTag] = useState('all');
  const [page, setPage] = useState(1);
  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  const [showWinnersOnly, setShowWinnersOnly] = useState(false);

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
        />

        {/* Winners Filter Toggle */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showWinnersOnly}
              onChange={(e) => setShowWinnersOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">
              50%+ PnL Only
            </span>
          </label>
          {showWinnersOnly && (
            <span className="text-xs text-gray-500">
              Showing {allWallets.filter(w => {
                const pnl = typeof w.pnl_7d === 'string' ? parseFloat(w.pnl_7d) : w.pnl_7d;
                return pnl >= 0.5;
              }).length} winners
            </span>
          )}
        </div>

        {/* Table */}
        <WalletTable
          wallets={showWinnersOnly ? allWallets.filter(w => {
            const pnl = typeof w.pnl_7d === 'string' ? parseFloat(w.pnl_7d) : w.pnl_7d;
            return pnl >= 0.5;
          }) : allWallets}
          chain={chain}
          onLoadMore={handleLoadMore}
          hasMore={walletsData?.hasMore || false}
          isLoading={walletsLoading}
        />
      </div>
    </div>
  );
}
