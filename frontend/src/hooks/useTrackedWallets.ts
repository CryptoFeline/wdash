'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Tracked Wallet interface - stores user's selected wallets for monitoring
 */
export interface TrackedWallet {
  address: string;
  chain: string; // 'sol', 'eth', etc.
  addedAt: number; // timestamp when added
  lastSynced?: number; // timestamp of last data sync
}

/**
 * Storage key for localStorage
 */
const STORAGE_KEY = 'gmgn_tracked_wallets';

/**
 * Hook: Manage tracked wallets with localStorage persistence
 * Provides CRUD operations and localStorage auto-sync
 */
export function useTrackedWallets() {
  const [trackedWallets, setTrackedWallets] = useState<TrackedWallet[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const wallets = JSON.parse(stored) as TrackedWallet[];
        setTrackedWallets(wallets);
        console.log('[useTrackedWallets] Loaded', wallets.length, 'tracked wallets from localStorage');
      }
    } catch (error) {
      console.error('[useTrackedWallets] Failed to load from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persist to localStorage whenever wallets change
  useEffect(() => {
    if (!isLoaded) return; // Don't persist before first load

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackedWallets));
      console.log('[useTrackedWallets] Persisted', trackedWallets.length, 'wallets to localStorage');
    } catch (error) {
      console.error('[useTrackedWallets] Failed to persist to localStorage:', error);
    }
  }, [trackedWallets, isLoaded]);

  /**
   * Add a wallet to tracked wallets
   */
  const addWallet = useCallback((address: string, chain: string = 'sol') => {
    setTrackedWallets((prev) => {
      // Check if already tracked
      if (prev.some((w) => w.address.toLowerCase() === address.toLowerCase())) {
        console.log('[useTrackedWallets] Wallet already tracked:', address);
        return prev;
      }

      const newWallet: TrackedWallet = {
        address: address.toLowerCase(),
        chain,
        addedAt: Date.now(),
      };

      console.log('[useTrackedWallets] Added wallet:', address);
      return [...prev, newWallet];
    });
  }, []);

  /**
   * Remove a wallet from tracked wallets
   */
  const removeWallet = useCallback((address: string) => {
    setTrackedWallets((prev) => {
      const filtered = prev.filter((w) => w.address.toLowerCase() !== address.toLowerCase());
      if (filtered.length < prev.length) {
        console.log('[useTrackedWallets] Removed wallet:', address);
      }
      return filtered;
    });
  }, []);

  /**
   * Toggle tracking for a wallet (add if not tracked, remove if tracked)
   */
  const toggleWallet = useCallback((address: string, chain: string = 'sol') => {
    setTrackedWallets((prev) => {
      const isTracked = prev.some((w) => w.address.toLowerCase() === address.toLowerCase());

      if (isTracked) {
        console.log('[useTrackedWallets] Untracked wallet:', address);
        return prev.filter((w) => w.address.toLowerCase() !== address.toLowerCase());
      } else {
        console.log('[useTrackedWallets] Tracked wallet:', address);
        return [
          ...prev,
          {
            address: address.toLowerCase(),
            chain,
            addedAt: Date.now(),
          },
        ];
      }
    });
  }, []);

  /**
   * Check if a wallet is tracked
   */
  const isTracked = useCallback((address: string): boolean => {
    return trackedWallets.some((w) => w.address.toLowerCase() === address.toLowerCase());
  }, [trackedWallets]);

  /**
   * Get all tracked wallets
   */
  const getTrackedWallets = useCallback((): TrackedWallet[] => {
    return trackedWallets;
  }, [trackedWallets]);

  /**
   * Get tracked wallets count
   */
  const getTrackedCount = useCallback((): number => {
    return trackedWallets.length;
  }, [trackedWallets]);

  /**
   * Clear all tracked wallets
   */
  const clearAll = useCallback(() => {
    setTrackedWallets([]);
    console.log('[useTrackedWallets] Cleared all tracked wallets');
  }, []);

  /**
   * Update last synced timestamp for a wallet
   */
  const updateLastSynced = useCallback((address: string, timestamp: number = Date.now()) => {
    setTrackedWallets((prev) =>
      prev.map((w) =>
        w.address.toLowerCase() === address.toLowerCase() ? { ...w, lastSynced: timestamp } : w
      )
    );
  }, []);

  return {
    trackedWallets,
    isLoaded,
    addWallet,
    removeWallet,
    toggleWallet,
    isTracked,
    getTrackedWallets,
    getTrackedCount,
    clearAll,
    updateLastSynced,
  };
}
