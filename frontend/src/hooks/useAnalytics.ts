'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Wallet } from '@/types/wallet';
import { useWalletStorage } from './useWalletStorage';
import { calculateTraderMetrics, generateCopyTradingSignal, TraderMetrics, CopyTradingSignal } from '@/lib/analytics-engine';

export interface AnalyticsState {
  isInitialized: boolean;
  isLoading: boolean;
  metrics: Record<string, TraderMetrics>; // wallet_address -> metrics
  signals: Record<string, CopyTradingSignal>; // wallet_address -> signal
  copyWorthyWallets: string[]; // List of wallet addresses marked as copy-worthy
  lastUpdated: number; // Timestamp of last calculation
  error: string | null;
}

const ANALYTICS_STORAGE_KEY = 'gmgn_analytics';
const CALCULATE_INTERVAL = 30000; // Recalculate metrics every 30 seconds

/**
 * Hook for calculating and managing analytics metrics
 * Integrates with wallet storage to analyze trader performance
 */
export function useAnalytics() {
  const { getAllWallets } = useWalletStorage();
  const [analyticsState, setAnalyticsState] = useState<AnalyticsState>({
    isInitialized: false,
    isLoading: true,
    metrics: {},
    signals: {},
    copyWorthyWallets: [],
    lastUpdated: 0,
    error: null,
  });

  const calculateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load cached analytics from localStorage
   */
  const loadCachedAnalytics = useCallback((): Partial<AnalyticsState> | null => {
    try {
      const cached = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[Analytics] Failed to load cached analytics:', err);
    }
    return null;
  }, []);

  /**
   * Save analytics to localStorage
   */
  const saveAnalytics = useCallback((state: AnalyticsState) => {
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[Analytics] Failed to save analytics:', err);
    }
  }, []);

  /**
   * Calculate metrics for all wallets
   */
  const calculateMetrics = useCallback(() => {
    const wallets = getAllWallets();
    
    if (wallets.length === 0) {
      setAnalyticsState((prev) => ({
        ...prev,
        isLoading: false,
        metrics: {},
        signals: {},
        copyWorthyWallets: [],
      }));
      return;
    }

    try {
      const newMetrics: Record<string, TraderMetrics> = {};
      const newSignals: Record<string, CopyTradingSignal> = {};
      const copyWorthyList: string[] = [];

      // Calculate metrics for each wallet
      for (const wallet of wallets) {
        const metrics = calculateTraderMetrics(wallet);
        newMetrics[wallet.wallet_address] = metrics;

        // Generate copy trading signal
        const signal = generateCopyTradingSignal(wallet, metrics);
        newSignals[wallet.wallet_address] = signal;

        // Track copy-worthy wallets
        if (metrics.isCopyWorthy) {
          copyWorthyList.push(wallet.wallet_address);
        }
      }

      const newState: AnalyticsState = {
        isInitialized: true,
        isLoading: false,
        metrics: newMetrics,
        signals: newSignals,
        copyWorthyWallets: copyWorthyList,
        lastUpdated: Date.now(),
        error: null,
      };

      setAnalyticsState(newState);
      saveAnalytics(newState);

      console.log(`[Analytics] Calculated metrics for ${wallets.length} wallets`, {
        copyWorthyCount: copyWorthyList.length,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Analytics] Error calculating metrics:', err);

      setAnalyticsState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
    }
  }, [getAllWallets, saveAnalytics]);

  /**
   * Initialize analytics on mount and set up recalculation interval
   */
  useEffect(() => {
    // Load cached analytics first
    const cached = loadCachedAnalytics();
    if (cached) {
      setAnalyticsState((prev) => ({
        ...prev,
        ...cached,
        isLoading: true, // But mark as loading until we recalculate
      }));
    }

    // Calculate initial metrics
    calculateMetrics();

    // Set up interval to recalculate metrics as wallet data changes
    calculateIntervalRef.current = setInterval(() => {
      calculateMetrics();
    }, CALCULATE_INTERVAL);

    return () => {
      if (calculateIntervalRef.current) {
        clearInterval(calculateIntervalRef.current);
      }
    };
  }, [calculateMetrics, loadCachedAnalytics]);

  /**
   * Get metrics for a specific wallet
   */
  const getMetrics = useCallback((walletAddress: string): TraderMetrics | null => {
    return analyticsState.metrics[walletAddress] || null;
  }, [analyticsState.metrics]);

  /**
   * Get signal for a specific wallet
   */
  const getSignal = useCallback((walletAddress: string): CopyTradingSignal | null => {
    return analyticsState.signals[walletAddress] || null;
  }, [analyticsState.signals]);

  /**
   * Get all copy-worthy wallets
   */
  const getCopyWorthyWallets = useCallback((): string[] => {
    return analyticsState.copyWorthyWallets;
  }, [analyticsState.copyWorthyWallets]);

  /**
   * Get copy-worthy wallets with full metrics
   */
  const getCopyWorthyWalletsWithMetrics = useCallback((): Array<{ address: string; metrics: TraderMetrics; signal: CopyTradingSignal }> => {
    return analyticsState.copyWorthyWallets.map((address) => ({
      address,
      metrics: analyticsState.metrics[address],
      signal: analyticsState.signals[address],
    }));
  }, [analyticsState]);

  /**
   * Get wallets sorted by quality score (descending)
   */
  const getWalletsSortedByScore = useCallback((): Array<{ address: string; score: number; metrics: TraderMetrics }> => {
    return Object.entries(analyticsState.metrics)
      .map(([address, metrics]) => ({
        address,
        score: metrics.traderQualityScore,
        metrics,
      }))
      .sort((a, b) => b.score - a.score);
  }, [analyticsState.metrics]);

  /**
   * Get wallets in a specific signal category
   */
  const getWalletsBySignal = useCallback(
    (signal: string): Array<{ address: string; signal: CopyTradingSignal; metrics: TraderMetrics }> => {
      return Object.entries(analyticsState.signals)
        .filter(([_, s]) => s.signal === signal)
        .map(([address, sig]) => ({
          address,
          signal: sig,
          metrics: analyticsState.metrics[address],
        }));
    },
    [analyticsState]
  );

  /**
   * Get statistics summary
   */
  const getAnalyticsStats = useCallback(
    () => {
      const allMetrics = Object.values(analyticsState.metrics);

      if (allMetrics.length === 0) {
        return {
          totalWallets: 0,
          copyWorthyCount: 0,
          copyWorthyPercentage: 0,
          averageScore: 0,
          averageWinRate: 0,
          averagePnL: 0,
          topTrader: null,
          strongBuySignals: 0,
          buySignals: 0,
          holdSignals: 0,
          weakSignals: 0,
          avoidSignals: 0,
        };
      }

      const signals = Object.values(analyticsState.signals);
      const topTraders = getWalletsSortedByScore().slice(0, 3);

      return {
        totalWallets: allMetrics.length,
        copyWorthyCount: analyticsState.copyWorthyWallets.length,
        copyWorthyPercentage: Math.round((analyticsState.copyWorthyWallets.length / allMetrics.length) * 100),
        averageScore: Math.round(allMetrics.reduce((sum, m) => sum + m.traderQualityScore, 0) / allMetrics.length),
        averageWinRate: Math.round(allMetrics.reduce((sum, m) => sum + m.winRate, 0) / allMetrics.length),
        averagePnL: (allMetrics.reduce((sum, m) => sum + m.averagePnL, 0) / allMetrics.length).toFixed(2),
        topTrader: topTraders[0] ? { address: topTraders[0].address, score: topTraders[0].score } : null,
        strongBuySignals: signals.filter((s) => s.signal === 'strong-buy').length,
        buySignals: signals.filter((s) => s.signal === 'buy').length,
        holdSignals: signals.filter((s) => s.signal === 'hold').length,
        weakSignals: signals.filter((s) => s.signal === 'weak').length,
        avoidSignals: signals.filter((s) => s.signal === 'avoid').length,
      };
    },
    [analyticsState, getWalletsSortedByScore]
  );

  /**
   * Clear all analytics
   */
  const clearAnalytics = useCallback(() => {
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    setAnalyticsState({
      isInitialized: false,
      isLoading: false,
      metrics: {},
      signals: {},
      copyWorthyWallets: [],
      lastUpdated: 0,
      error: null,
    });
  }, []);

  return {
    // State
    ...analyticsState,

    // Methods
    getMetrics,
    getSignal,
    getCopyWorthyWallets,
    getCopyWorthyWalletsWithMetrics,
    getWalletsSortedByScore,
    getWalletsBySignal,
    getAnalyticsStats,
    clearAnalytics,
    recalculate: calculateMetrics, // Manual recalculation
  };
}

export type UseAnalyticsReturn = ReturnType<typeof useAnalytics>;
