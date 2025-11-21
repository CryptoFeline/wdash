'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchWallets, fetchStats } from '@/lib/api';
import { Wallet, PaginatedResponse, StatsResponse } from '@/types/wallet';
import WalletTable from '@/components/WalletTable';
import FilterBar from '@/components/FilterBar';
import StatsCards from '@/components/StatsCards';
import { StalenessIndicator } from '@/components/StalenessIndicator';
import { AdvancedFilterValues } from '@/components/AdvancedFilters';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useWalletStorage } from '@/hooks/useWalletStorage';
import { useTrackedWallets } from '@/hooks/useTrackedWallets';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SyncProgressCard } from '@/components/SyncProgressCard';
import { TraderScoreCard } from '@/components/TraderScoreCard';
import { triggerSync } from '@/lib/supabase-client';
import { clearSyncErrors } from '@/lib/sync-status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import { WalletDetailsModal } from '@/components/WalletDetailsModal';
import AdvancedAnalyticsModal from '@/components/AdvancedAnalyticsModal';
import WalletSearch from '@/components/WalletSearch';

const DEFAULT_ADVANCED_FILTERS: AdvancedFilterValues = {
  pnlMin: 50,
  pnlMax: 100000,
  roiMin: 0,
  roiMax: 100000000,
  tokensMin: 0,
  tokensMax: 1000,
  holdTimeMin: 0,
  holdTimeMax: 168,
  rugPullMax: 10,
  winRateMin: 0,
  winRateMax: 100,
};

export default function TrackedWalletsPage() {
  // Persistent wallet database hook
  const storage = useWalletStorage();
  const stats = storage.getStats();

  // Tracked wallets hook
  const { trackedWallets, isLoaded, clearAll, removeWallet } = useTrackedWallets();

  // SYNC ENGINE DISABLED - Not needed, wallets already in database
  // Background syncing causes React #185 errors when wallets not in Supabase
  // Instead: fetch OKX data on-demand when user clicks a row
  // const { engineStatus, startSyncEngine, stopSyncEngine, pauseSyncEngine, resumeSyncEngine, manualSyncWallet } = useSyncEngine();

  // ANALYTICS DISABLED - Depends on sync engine which is disabled
  // const { metrics, signals, copyWorthyWallets, getAnalyticsStats } = useAnalytics();

  // API filters (trigger actual fetch from backend)
  const [chain, setChain] = useState('sol');
  const [timeframe, setTimeframe] = useState('7d');
  const [tag, setTag] = useState('all');

  // Display filters (client-side only, filter the database)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>(DEFAULT_ADVANCED_FILTERS);

  // Manual sync state
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Enhanced modal state
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleWalletClick = useCallback((wallet: Wallet) => {
    setSelectedWallet(wallet);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    // Delay clearing selectedWallet to allow for closing animation
    setTimeout(() => setSelectedWallet(null), 300);
  }, []);

  // Fetch wallets with STATIC queryKey (manual refresh only)
  const {
    data: walletsData,
    isLoading: walletsLoading,
    refetch: refetchWallets,
    isFetching: walletsFetching,
  } = useQuery<PaginatedResponse>({
    queryKey: ['wallets', 'manual-fetch'],
    queryFn: () => fetchWallets({ chain, timeframe, tag, page: 1, limit: 200 }),
    enabled: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Fetch stats (separate query, also manual)
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<StatsResponse>({
    queryKey: ['stats', 'manual-fetch'],
    queryFn: () => fetchStats({ chain, timeframe, tag }),
    enabled: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Merge fetched wallets into database when data arrives
  useEffect(() => {
    if (walletsData?.data && walletsData.data.length > 0) {
      storage.mergeWallets(walletsData.data);
    }
  }, [walletsData]);

  // Manual refresh handler - fetches fresh data from API
  const handleManualRefresh = useCallback(async () => {
    try {
      setIsManualSyncing(true);
      setLastSyncTime(Date.now());

      // Fetch fresh data from backend
      await Promise.all([
        refetchWallets(),
        refetchStats(),
      ]);

      // Also trigger Supabase sync in background
      triggerSync(chain, timeframe, tag).catch(err => console.error('Background sync failed:', err));

      console.log('[TrackedWallets] Manual sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  }, [refetchWallets, refetchStats, chain, timeframe, tag]);

  // Get all wallets from database
  const allWallets = storage.getAllWallets();

  // Filter to show ONLY tracked wallets
  const trackedAddresses = useMemo(() => {
    return new Set(
      trackedWallets
        .filter(w => w && w.address)
        .map(w => w.address.toLowerCase())
    );
  }, [trackedWallets]);

  const trackedWalletsList = useMemo(() => {
    return allWallets.filter(w => 
      w && w.wallet_address && trackedAddresses.has(w.wallet_address.toLowerCase())
    );
  }, [allWallets, trackedAddresses]);

  // Apply DISPLAY filters (client-side only)
  const filteredWallets = useMemo(() => {
    let filtered = trackedWalletsList;

    // Advanced filters (DISPLAY ONLY)
    filtered = filtered.filter((w) => {
      const parseValue = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const cleaned = val.replace(/[%,\s]/g, '');
          return parseFloat(cleaned);
        }
        return NaN;
      };

      // PnL % filter
      const pnlRaw = parseValue(w.pnl_7d);
      const pnl = pnlRaw * 100;
      const pnlValid = !isNaN(pnl) && pnl >= advancedFilters.pnlMin && pnl <= advancedFilters.pnlMax;

      // Profit $ filter
      const profit = parseValue(w.realized_profit_7d);
      const profitValid = !isNaN(profit) && profit >= advancedFilters.roiMin && profit <= advancedFilters.roiMax;

      // Tokens filter
      const tokens = w.token_num_7d || 0;
      const tokensValid = tokens >= advancedFilters.tokensMin && tokens <= advancedFilters.tokensMax;

      // Hold time filter
      const holdTime = (w.avg_holding_period_7d || 0) / 3600;
      const holdTimeValid = holdTime >= advancedFilters.holdTimeMin && holdTime <= advancedFilters.holdTimeMax;

      // Rug pull filter
      const rugPullRatio = (w.risk?.sell_pass_buy_ratio || 0) * 100;
      const rugPullValid = rugPullRatio <= advancedFilters.rugPullMax;

      // Win rate filter
      const winRatePercent = (w.winrate_7d || 0) * 100;
      const winRateValid = winRatePercent >= advancedFilters.winRateMin && winRatePercent <= advancedFilters.winRateMax;

      return pnlValid && profitValid && tokensValid && holdTimeValid && rugPullValid && winRateValid;
    });

    // Strip last_updated field for table
    return filtered.map(({ last_updated, ...wallet }) => wallet as Wallet);
  }, [trackedWalletsList, advancedFilters]);

  const isRefreshing = walletsLoading || walletsFetching || statsLoading;

  // Format last sync time
  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Back Link */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-4xl font-bold tracking-tight">
                Tracked Wallets
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredWallets.length} of {trackedWallets.length} tracked wallets
              {trackedWallets.length > 0 && ` - Last sync: ${formatLastSync(lastSyncTime)}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <WalletSearch />
          </div>
        </div>

        {/* Tracked Wallets Status Card */}
        {trackedWallets.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center">
            <p className="text-lg font-semibold mb-2">No Tracked Wallets Yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Go back to the dashboard and click the bookmark icon on wallets you want to track.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* SYNC ENGINE & ANALYTICS UI DISABLED
                Background syncing causes React #185 infinite re-renders
                Wallets not yet populated in Supabase, causing 404 errors
                Solution: Fetch OKX data on-demand when clicking wallet row
            */}

            {/* <SyncProgressCard
              engineStatus={engineStatus}
              onSync={() => manualSyncWallet(trackedWallets[0]?.address || '')}
              onPause={pauseSyncEngine}
              onResume={resumeSyncEngine}
              onClearErrors={() => clearSyncErrors()}
              isSyncing={engineStatus.isSyncing}
            />

            {(() => {
              const stats = getAnalyticsStats();
              return (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">Copy Trading Analytics</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Analyzing {stats.totalWallets} tracked wallets
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="border rounded p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.copyWorthyCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Copy-Worthy</p>
                      <p className="text-xs font-semibold">{stats.copyWorthyPercentage}%</p>
                    </div>
                    <div className="border rounded p-3 text-center">
                      <p className="text-2xl font-bold">{stats.averageScore}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
                    </div>
                    <div className="border rounded p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">{stats.averageWinRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Win Rate</p>
                    </div>
                    <div className="border rounded p-3 text-center">
                      <p className="text-2xl font-bold">${typeof stats.averagePnL === 'string' ? parseFloat(stats.averagePnL).toFixed(0) : stats.averagePnL.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg P&L</p>
                    </div>
                    <div className="border rounded p-3 text-center">
                      <div className="flex gap-1 justify-center mb-1">
                        <Badge variant="default" className="text-xs">{stats.strongBuySignals}</Badge>
                        <Badge variant="outline" className="text-xs">{stats.buySignals}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Strong Buy + Buy</p>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {copyWorthyWallets.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Top Copy-Worthy Traders</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredWallets
                    .filter((w) => copyWorthyWallets.includes(w.wallet_address))
                    .sort((a, b) => (metrics[b.wallet_address]?.traderQualityScore || 0) - (metrics[a.wallet_address]?.traderQualityScore || 0))
                    .slice(0, 2)
                    .map((wallet) => {
                      const walletMetrics = metrics[wallet.wallet_address];
                      return walletMetrics ? (
                        <TraderScoreCard key={wallet.wallet_address} metrics={walletMetrics} walletAddress={wallet.wallet_address} compact={true} />
                      ) : null;
                    })}
                </div>
              </div>
            )} */}

            {/* Stats Cards */}
            <StatsCards
              stats={statsData || null}
              isLoading={statsLoading}
              totalWalletsInDB={trackedWalletsList.length}
            />

            {/* API Filters */}
            <FilterBar
              chain={chain}
              timeframe={timeframe}
              tag={tag}
              onChainChange={setChain}
              onTimeframeChange={setTimeframe}
              onTagChange={setTag}
              onRefresh={handleManualRefresh}
              isLoading={isRefreshing}
              advancedFilters={advancedFilters}
              onAdvancedFiltersChange={setAdvancedFilters}
            />

            {/* Filter Status */}
            {filteredWallets.length < trackedWalletsList.length && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredWallets.length.toLocaleString()} of {trackedWalletsList.length.toLocaleString()} tracked wallets (filtered)
              </div>
            )}

            {/* Table - Client-side display */}
            <WalletTable
              wallets={filteredWallets}
              chain={chain}
              onLoadMore={() => { }} // No server-side pagination
              hasMore={false} // All data loaded from database
              isLoading={isRefreshing && trackedWalletsList.length === 0} // Only show loading if no data yet
              onRowClick={handleWalletClick}
            />

            {/* Advanced Analytics Modal - NEW */}
            <AdvancedAnalyticsModal
              wallet={selectedWallet?.wallet_address || ''}
              chain={chain === 'sol' ? '501' : chain}
              isOpen={isModalOpen}
              onClose={handleModalClose}
            />

            {/* Old Deep Analysis Modal - DEPRECATED, keeping for reference
            <WalletDetailsModal
              wallet={selectedWallet}
              chain={chain}
              isOpen={isModalOpen}
              onClose={handleModalClose}
            />
            */}
          </>
        )}
      </div>
    </div>
  );
}
