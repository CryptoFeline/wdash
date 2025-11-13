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
import { useBackendKeepAlive } from '@/hooks/useBackendKeepAlive';
import { useTrackedWallets } from '@/hooks/useTrackedWallets';
import { triggerSync } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { BarChart3, Bookmark } from 'lucide-react';

const DEFAULT_ADVANCED_FILTERS: AdvancedFilterValues = {
  pnlMin: 50,
  pnlMax: 100000, // Increase from 1000 to 100,000% (some wallets have massive gains)
  roiMin: 0,
  roiMax: 100000000, // Increase from 10,000 to 100M (realized profit can be huge)
  tokensMin: 0,
  tokensMax: 1000, // Increase from 500 to 1000
  holdTimeMin: 0,
  holdTimeMax: 168,
  rugPullMax: 10,
  winRateMin: 0,
  winRateMax: 100,
};

export default function Home() {
  // Keep backend alive (prevents cold start on Render free tier)
  useBackendKeepAlive();

  // Tracked wallets hook
  const { getTrackedCount } = useTrackedWallets();

  // API filters (trigger actual fetch from backend)
  const [chain, setChain] = useState('sol');
  const [timeframe, setTimeframe] = useState('7d');
  const [tag, setTag] = useState('all');
  
  // Display filters (client-side only, filter the database)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>(DEFAULT_ADVANCED_FILTERS);

  // Backend wake-up state (Solution E: show loading modal while backend starts)
  const [showBackendLoadingModal, setShowBackendLoadingModal] = useState(false);
  const [backendReady, setBackendReady] = useState(false);

  // Wake up backend by pinging health endpoint
  const wakeupBackend = useCallback(async (): Promise<boolean> => {
    setShowBackendLoadingModal(true);
    const maxAttempts = 30; // 5 sec * 30 = 2.5 min max wait
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('/health');
        if (response.ok) {
          console.log('[Page] Backend is ready');
          setBackendReady(true);
          setShowBackendLoadingModal(false);
          return true;
        }
      } catch (error) {
        console.log(`[Page] Health check attempt ${attempt}/${maxAttempts} - waiting...`);
      }
      
      // Wait 5 seconds before next attempt
      await new Promise(r => setTimeout(r, 5000));
    }
    
    // Timeout after 2.5 min
    console.warn('[Page] Backend wake-up timeout after 2.5 min, proceeding anyway');
    setShowBackendLoadingModal(false);
    return false;
  }, []);

  // Persistent wallet database hook
  const storage = useWalletStorage();
  const stats = storage.getStats();

  // Fetch wallets with STATIC queryKey (manual refresh only)
  const { 
    data: walletsData, 
    isLoading: walletsLoading, 
    refetch: refetchWallets,
    isFetching: walletsFetching,
  } = useQuery<PaginatedResponse>({
    queryKey: ['wallets', 'manual-fetch'], // Static key
    queryFn: () => fetchWallets({ chain, timeframe, tag, page: 1, limit: 200 }),
    enabled: false, // Only fetch manually
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
    queryKey: ['stats', 'manual-fetch'], // Static key
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

  // Load from Supabase on initial mount (fast, pre-populate localStorage)
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        // Skip if we already have data
        const currentWallets = storage.getAllWallets();
        if (currentWallets.length > 0) {
          console.log('[Page] Using cached wallets from localStorage');
          return;
        }

        // No cache found - wake up backend first
        console.log('[Page] No cache found, waking backend...');
        await wakeupBackend();

        console.log('[Page] Loading initial wallets from Supabase...');
        const response = await fetch('/api/wallets/db?chain=sol&limit=500', {
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          console.error('[Page] Failed to load from Supabase:', response.status);
          return;
        }

        const { data } = await response.json();
        if (data && data.length > 0) {
          storage.mergeWallets(data);
          console.log('[Page] Loaded', data.length, 'wallets from Supabase');
        }
      } catch (error) {
        console.error('[Page] Supabase load error:', error);
        // Fail silently - let manual fetch handle it
      }
    };

    loadFromSupabase();
  }, [wakeupBackend, storage]); // Only on mount

  // Initial fetch on mount OR when API filters change (chain/timeframe/tag)
  useEffect(() => {
    // Only fetch if database is empty or filter combination not in database
    const hasDataForFilters = allWallets.length > 0;
    
    if (!hasDataForFilters) {
      // console.log('[Debug] Fetching data for', chain, timeframe, tag);
      refetchWallets();
      refetchStats();
    } /* else {
      console.log('[Debug] Using cached data, no fetch needed');
    } */
  }, [chain, timeframe, tag]); // Only when API filters change

  // Manual refresh handler - fetches fresh data from API
  const handleManualRefresh = useCallback(async () => {
    try {
      // Fetch fresh data from backend (will auto-merge into database via useEffect above)
      await Promise.all([
        refetchWallets(),
        refetchStats(),
      ]);
      
      // Also trigger Supabase sync in background (creates snapshots for analytics)
      // Don't await this - let it run in background
      triggerSync(chain, timeframe, tag).catch(err => console.error('Background sync failed:', err));
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, [refetchWallets, refetchStats, chain, timeframe, tag]);

  // Get all wallets from database
  const allWallets = storage.getAllWallets();

  // Debug: Log wallet data
  /* useEffect(() => {
    console.log('[Debug] Total wallets in database:', allWallets.length);
    if (allWallets.length > 0) {
      const sample = allWallets[0];
      console.log('[Debug] Sample wallet:', sample);
      console.log('[Debug] Sample wallet PnL values:', {
        pnl_7d: sample.pnl_7d,
        realized_profit_7d: sample.realized_profit_7d,
        token_num_7d: sample.token_num_7d,
        avg_holding_period_7d: sample.avg_holding_period_7d,
        avg_holding_hours: (sample.avg_holding_period_7d || 0) / 3600,
        risk_rug_ratio: (sample.risk?.sell_pass_buy_ratio || 0) * 100,
      });
      console.log('[Debug] Advanced filters:', advancedFilters);
    }
  }, [allWallets, advancedFilters]); */

  // Apply DISPLAY filters (client-side only - never triggers API call)
  const filteredWallets = useMemo(() => {
    let filtered = allWallets;

    // Advanced filters (DISPLAY ONLY - no API calls)
    filtered = filtered.filter((w, index) => {
      // Helper: Parse value that might be string with % or commas
      const parseValue = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          // Remove %, commas, and whitespace, then parse
          const cleaned = val.replace(/[%,\s]/g, '');
          return parseFloat(cleaned);
        }
        return NaN;
      };

      // PnL % filter (matches "PnL 7d %" column)
      // Note: pnl_7d is stored as decimal (0.5 = 50%), so multiply by 100 for percentage comparison
      const pnlRaw = parseValue(w.pnl_7d);
      const pnl = pnlRaw * 100; // Convert decimal to percentage for filter comparison
      const pnlValid = !isNaN(pnl) && pnl >= advancedFilters.pnlMin && pnl <= advancedFilters.pnlMax;
      
      // Profit $ filter (matches "Profit 7d" column - dollar amount)
      const profit = parseValue(w.realized_profit_7d);
      const profitValid = !isNaN(profit) && profit >= advancedFilters.roiMin && profit <= advancedFilters.roiMax;

      // Tokens filter (matches "Tokens 7d" column)
      const tokens = w.token_num_7d || 0;
      const tokensValid = tokens >= advancedFilters.tokensMin && tokens <= advancedFilters.tokensMax;

      // Hold time filter (convert to hours - matches "Avg Hold" column)
      const holdTime = (w.avg_holding_period_7d || 0) / 3600; // seconds to hours
      const holdTimeValid = holdTime >= advancedFilters.holdTimeMin && holdTime <= advancedFilters.holdTimeMax;

      // Rug pull filter (matches "Rug Pull %" column)
      const rugPullRatio = (w.risk?.sell_pass_buy_ratio || 0) * 100;
      const rugPullValid = rugPullRatio <= advancedFilters.rugPullMax;

      // Win rate filter (matches "Win Rate %" - convert decimal to percentage)
      const winRatePercent = (w.winrate_7d || 0) * 100;
      const winRateValid = winRatePercent >= advancedFilters.winRateMin && winRatePercent <= advancedFilters.winRateMax;

      // Debug first wallet that fails
      /* if (index === 0) {
        console.log('[Debug] First wallet filter check:', {
          wallet_address: w.wallet_address,
          pnl_7d_raw: w.pnl_7d,
          pnl_decimal: pnlRaw,
          pnl_percentage: pnl,
          pnlValid,
          pnlRange: [advancedFilters.pnlMin, advancedFilters.pnlMax],
          realized_profit_raw: w.realized_profit_7d,
          profit_parsed: profit,
          profitValid,
          profitRange: [advancedFilters.roiMin, advancedFilters.roiMax],
          tokens,
          tokensValid,
          tokensRange: [advancedFilters.tokensMin, advancedFilters.tokensMax],
          holdTime,
          holdTimeValid,
          holdTimeRange: [advancedFilters.holdTimeMin, advancedFilters.holdTimeMax],
          rugPullRatio,
          rugPullValid,
          rugPullMax: advancedFilters.rugPullMax,
          winRatePercent,
          winRateValid,
          winRateRange: [advancedFilters.winRateMin, advancedFilters.winRateMax],
        });
      } */

      return pnlValid && profitValid && tokensValid && holdTimeValid && rugPullValid && winRateValid;
    });

    // console.log('[Debug] After filtering:', filtered.length, 'of', allWallets.length);
    
    // Strip last_updated field for table (convert WalletWithMeta[] to Wallet[])
    return filtered.map(({ last_updated, ...wallet }) => wallet as Wallet);
  }, [allWallets, advancedFilters]);

  const isRefreshing = walletsLoading || walletsFetching || statsLoading;

  // Check if table has data and hide modal if it does
  useEffect(() => {
    if (!showBackendLoadingModal) {
      return; // Modal not visible, skip check
    }

    // If we have data loaded, hide the modal immediately
    if (allWallets.length > 0) {
      console.log('[Page] Data loaded, hiding modal');
      setShowBackendLoadingModal(false);
      return;
    }

    // Otherwise, check every 1 second if data has been loaded
    const interval = setInterval(() => {
      const currentWallets = storage.getAllWallets();
      if (currentWallets.length > 0) {
        console.log('[Page] Data detected, hiding modal');
        setShowBackendLoadingModal(false);
        clearInterval(interval);
      }
    }, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, [showBackendLoadingModal, allWallets.length, storage]);

  return (
    <div className="min-h-screen bg-background">
      {/* Backend Loading Modal (Solution E: Wake-up modal with backdrop blur) */}
      {showBackendLoadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-2xl max-w-sm">
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
            <p className="text-center text-gray-900 dark:text-white font-semibold text-lg mb-2">
              Backend is loading...
            </p>
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
              This usually takes 10-15 seconds
            </p>
          </div>
        </div>
      )}

      <ThemeToggle />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Analytics Link */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Wallet Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.totalWallets.toLocaleString()} wallets - {(stats.sizeBytes / 1024).toFixed(1)} KB
            </p>
          </div>
          <Link href="/tracked">
            <Button variant="outline" className="gap-2">
              <Bookmark className="w-4 h-4" />
              Tracked ({getTrackedCount()})
            </Button>
          </Link>
        </div>

        {/* Staleness Indicator with Manual Refresh */}
        <StalenessIndicator
          oldestTimestamp={stats.oldestUpdate}
          newestTimestamp={stats.newestUpdate}
          totalWallets={stats.totalWallets}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Stats Cards */}
        <StatsCards 
          stats={statsData || null} 
          isLoading={statsLoading}
          totalWalletsInDB={allWallets.length}
        />

        {/* API Filters (chain/timeframe/tag) - Triggers Backend Fetch */}
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
        {filteredWallets.length < allWallets.length && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredWallets.length.toLocaleString()} of {allWallets.length.toLocaleString()} wallets (filtered)
          </div>
        )}

        {/* Table - Client-side display */}
        <WalletTable
          wallets={filteredWallets}
          chain={chain}
          onLoadMore={() => {}} // No server-side pagination
          hasMore={false} // All data loaded from database
          isLoading={isRefreshing && allWallets.length === 0} // Only show loading if no data yet
        />
      </div>
    </div>
  );
}

