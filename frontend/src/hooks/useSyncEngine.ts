'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTrackedWallets, TrackedWallet } from './useTrackedWallets';
import { useWalletStorage } from './useWalletStorage';
import {
  getSyncStatus,
  updateWalletSyncStatus,
  recordSyncError,
  updateEndpointStatus,
  addToSyncQueue,
  removeFromSyncQueue,
  getNextWalletInQueue,
  markSyncStarted,
  markSyncCompleted,
  markSyncFailed,
  getSyncProgress,
  pauseSyncing,
  resumeSyncing,
} from '@/lib/sync-status';

/**
 * OKX API endpoints interface
 * These need to be implemented in a separate API module
 */
interface WalletDataResponse {
  summary?: {
    pnl_7d: number;
    realized_profit_7d: number;
    winrate_7d: number;
    token_num_7d: number;
  };
  tokens?: Array<{
    symbol: string;
    balance: number;
    balanceUsd: number;
    totalPnl: number;
    unrealizedPnl?: number;
  }>;
  history?: Array<{
    symbol: string;
    buyTime: number;
    sellTime: number;
    buyPrice: number;
    sellPrice: number;
  }>;
}

export interface SyncEngineStatus {
  status: 'idle' | 'running' | 'paused' | 'error';
  isSyncing: boolean;
  currentWallet: string | null;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  lastSyncTime: number | null;
  nextSyncTime: number | null;
  errors: Array<{
    wallet: string;
    error: string;
    timestamp: number;
  }>;
  queue: Array<{
    address: string;
    scheduledFor: number;
  }>;
  isPaused: boolean;
}

/**
 * Rolling sync engine for tracked wallets
 * Automatically syncs wallet data on a rolling interval
 * 
 * Strategy: 1 wallet every minute, distributed across 5-minute cycle
 * Rate limit: < 50 calls/hour per wallet = 0.4% of OXK limit
 */
export function useSyncEngine() {
  const { trackedWallets, isLoaded: trackersLoaded } = useTrackedWallets();
  const storage = useWalletStorage();

  const [engineStatus, setEngineStatus] = useState<SyncEngineStatus>({
    status: 'idle',
    isSyncing: false,
    currentWallet: null,
    progress: { completed: 0, total: 0, percentage: 0 },
    lastSyncTime: null,
    nextSyncTime: null,
    errors: [],
    queue: [],
    isPaused: false,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const hasStartedRef = useRef(false);

  /**
   * Initialize sync queue with rolling schedule
   */
  const initializeQueue = useCallback(() => {
    if (trackedWallets.length === 0) {
      console.log('[SyncEngine] No tracked wallets');
      return;
    }

    console.log('[SyncEngine] Initializing queue for', trackedWallets.length, 'wallets');

    // Calculate sync interval: 5 minutes / number of wallets
    const syncWindow = 5 * 60 * 1000; // 5 minutes in ms
    const intervalPerWallet = syncWindow / trackedWallets.length;

    // Schedule each wallet on rolling basis
    const now = Date.now();
    trackedWallets.forEach((wallet, index) => {
      const scheduledFor = now + (index * intervalPerWallet);
      addToSyncQueue(wallet.address, scheduledFor, 'normal');
      console.log(
        `[SyncEngine] Scheduled ${wallet.address.substring(0, 8)}... for ${new Date(scheduledFor).toLocaleTimeString()}`
      );
    });

    isInitializedRef.current = true;
  }, [trackedWallets]);

  /**
   * Fetch wallet data from OXK API endpoints
   */
  const fetchWalletData = useCallback(async (address: string): Promise<WalletDataResponse> => {
    try {
      // TODO: Replace with actual API calls to OXK endpoints 1, 4a, 4b, 6
      // For now, fetch from our backend which proxies OXK
      const response = await fetch(`/api/wallets/sync?address=${address}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch wallet data: ${errorMsg}`);
    }
  }, []);

  /**
   * Sync a single wallet
   */
  const syncWallet = useCallback(
    async (address: string) => {
      try {
        console.log('[SyncEngine] Starting sync for', address.substring(0, 8) + '...');
        markSyncStarted(address);

        setEngineStatus((prev) => ({
          ...prev,
          isSyncing: true,
          currentWallet: address,
          status: 'running',
        }));

        // Fetch wallet data
        updateEndpointStatus(address, 'endpoint1', { status: 'in-progress' });
        const startTime = Date.now();
        const walletData = await fetchWalletData(address);
        const elapsed = Date.now() - startTime;

        updateEndpointStatus(address, 'endpoint1', {
          status: 'success',
          time: elapsed,
        });

        // Merge into storage
        if (walletData.summary) {
          storage.mergeWallets([
            {
              wallet_address: address,
              ...walletData.summary,
            } as any, // Storage layer adds last_updated
          ]);
        }

        // Mark as completed
        markSyncCompleted(address, walletData.tokens?.length || 0, '158KB');

        console.log('[SyncEngine] Sync completed for', address.substring(0, 8) + '...');

        // Schedule next sync (5 minutes from now)
        const nextSyncTime = Date.now() + 5 * 60 * 1000;
        addToSyncQueue(address, nextSyncTime, 'normal');

        setEngineStatus((prev) => ({
          ...prev,
          isSyncing: false,
          currentWallet: null,
          lastSyncTime: Date.now(),
          nextSyncTime,
          progress: getSyncProgress(),
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SyncEngine] Sync failed:', errorMsg);

        recordSyncError(address, errorMsg);
        markSyncFailed(address, errorMsg);

        // Retry in 30 seconds on error
        const retryTime = Date.now() + 30 * 1000;
        addToSyncQueue(address, retryTime, 'high');

        setEngineStatus((prev) => ({
          ...prev,
          isSyncing: false,
          currentWallet: null,
          status: 'error',
          errors: [
            ...prev.errors.slice(-10),
            {
              wallet: address,
              error: errorMsg,
              timestamp: Date.now(),
            },
          ],
        }));
      }
    },
    [fetchWalletData, storage]
  );

  /**
   * Main sync loop - runs every minute
   */
  const runSyncLoop = useCallback(async () => {
    const status = getSyncStatus();

    // Check if paused
    if (status.paused) {
      console.log('[SyncEngine] Sync paused');
      return;
    }

    // Get next wallet from queue
    const nextWallet = getNextWalletInQueue();

    if (nextWallet) {
      console.log('[SyncEngine] Processing', nextWallet.address.substring(0, 8) + '...');
      removeFromSyncQueue(nextWallet.address);
      await syncWallet(nextWallet.address);
    } else {
      console.log('[SyncEngine] No wallets ready to sync');
    }
  }, [syncWallet]);

  /**
   * Start the sync engine
   */
  const startSyncEngine = useCallback(() => {
    if (syncIntervalRef.current) {
      console.log('[SyncEngine] Already running');
      return;
    }

    console.log('[SyncEngine] Starting...');

    // Initialize queue on first start
    if (!isInitializedRef.current) {
      initializeQueue();
    }

    // Run immediately
    runSyncLoop().catch((err) => console.error('[SyncEngine] Error in sync loop:', err));

    // Set up interval (check every minute)
    syncIntervalRef.current = setInterval(() => {
      runSyncLoop().catch((err) => console.error('[SyncEngine] Error in sync loop:', err));
    }, 60 * 1000); // 1 minute

    setEngineStatus((prev) => ({
      ...prev,
      status: 'running',
      isPaused: false,
    }));
  }, [initializeQueue, runSyncLoop]);

  /**
   * Stop the sync engine
   */
  const stopSyncEngine = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
      console.log('[SyncEngine] Stopped');
    }

    setEngineStatus((prev) => ({
      ...prev,
      status: 'idle',
      isSyncing: false,
    }));
  }, []);

  /**
   * Pause the sync engine
   */
  const pauseSyncEngine = useCallback(() => {
    pauseSyncing();
    setEngineStatus((prev) => ({
      ...prev,
      status: 'paused',
      isPaused: true,
    }));
    console.log('[SyncEngine] Paused');
  }, []);

  /**
   * Resume the sync engine
   */
  const resumeSyncEngine = useCallback(() => {
    resumeSyncing();
    setEngineStatus((prev) => ({
      ...prev,
      status: 'running',
      isPaused: false,
    }));
    console.log('[SyncEngine] Resumed');
  }, []);

  /**
   * Manually sync a wallet immediately
   */
  const manualSyncWallet = useCallback(
    async (address: string) => {
      console.log('[SyncEngine] Manual sync triggered for', address.substring(0, 8) + '...');
      removeFromSyncQueue(address);
      await syncWallet(address);
    },
    [syncWallet]
  );

  /**
   * Auto-start when tracked wallets loaded
   */
  useEffect(() => {
    if (trackersLoaded && trackedWallets.length > 0 && !hasStartedRef.current) {
      console.log('[SyncEngine] Tracked wallets loaded, starting engine');
      hasStartedRef.current = true;

      // Initialize queue immediately with current wallets
      if (!isInitializedRef.current && trackedWallets.length > 0) {
        console.log('[SyncEngine] Initializing queue for', trackedWallets.length, 'wallets');
        const syncWindow = 5 * 60 * 1000;
        const intervalPerWallet = syncWindow / trackedWallets.length;
        const now = Date.now();
        
        trackedWallets.forEach((wallet, index) => {
          const scheduledFor = now + (index * intervalPerWallet);
          addToSyncQueue(wallet.address, scheduledFor, 'normal');
          console.log(
            `[SyncEngine] Scheduled ${wallet.address.substring(0, 8)}... for ${new Date(scheduledFor).toLocaleTimeString()}`
          );
        });
        isInitializedRef.current = true;
      }

      // Start the sync loop
      if (!syncIntervalRef.current) {
        console.log('[SyncEngine] Starting...');
        
        // Run sync loop immediately
        (async () => {
          const status = getSyncStatus();
          if (!status.paused) {
            const nextWallet = getNextWalletInQueue();
            if (nextWallet) {
              console.log('[SyncEngine] Processing', nextWallet.address.substring(0, 8) + '...');
              removeFromSyncQueue(nextWallet.address);
              await syncWallet(nextWallet.address);
            }
          }
        })().catch((err) => console.error('[SyncEngine] Error in sync loop:', err));

        // Set up interval
        syncIntervalRef.current = setInterval(() => {
          (async () => {
            const status = getSyncStatus();
            if (!status.paused) {
              const nextWallet = getNextWalletInQueue();
              if (nextWallet) {
                console.log('[SyncEngine] Processing', nextWallet.address.substring(0, 8) + '...');
                removeFromSyncQueue(nextWallet.address);
                await syncWallet(nextWallet.address);
              }
            }
          })().catch((err) => console.error('[SyncEngine] Error in sync loop:', err));
        }, 60 * 1000);

        setEngineStatus((prev) => ({
          ...prev,
          status: 'running',
          isPaused: false,
        }));
      }
    }

    return () => {
      // Don't stop on unmount - let it continue in background
    };
  }, [trackersLoaded, trackedWallets.length, trackedWallets, syncWallet]);

  return {
    engineStatus,
    startSyncEngine,
    stopSyncEngine,
    pauseSyncEngine,
    resumeSyncEngine,
    manualSyncWallet,
  };
}
