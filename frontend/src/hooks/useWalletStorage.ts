import { useState, useEffect } from 'react';
import { Wallet } from '@/types/wallet';

interface WalletWithMeta extends Wallet {
  last_updated: number; // Timestamp when this wallet was last fetched
}

interface WalletDatabase {
  wallets: Record<string, WalletWithMeta>; // Key: wallet_address
  version: number; // For future migrations
}

const STORAGE_KEY = 'gmgn-wallet-database';
const DATABASE_VERSION = 1;

/**
 * Persistent wallet database that:
 * 1. Accumulates ALL wallets ever fetched (never deletes)
 * 2. Updates wallets when new data arrives (merge by wallet_address)
 * 3. Tracks per-wallet staleness (last_updated timestamp)
 * 4. Independent of filter combinations (single global database)
 */
export function useWalletStorage() {
  const [database, setDatabase] = useState<WalletDatabase>({
    wallets: {},
    version: DATABASE_VERSION,
  });

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WalletDatabase;
        if (parsed.version === DATABASE_VERSION) {
          setDatabase(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading wallet database:', error);
    }
  }, []);

  // Persist database to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch (error) {
      console.error('Error saving wallet database:', error);
    }
  }, [database]);

  /**
   * Merge new wallets into database
   * Updates existing wallets, adds new ones
   */
  const mergeWallets = (newWallets: Wallet[]) => {
    const timestamp = Date.now();
    
    setDatabase((prev) => {
      const updated = { ...prev.wallets };
      
      newWallets.forEach((wallet) => {
        updated[wallet.wallet_address] = {
          ...wallet,
          last_updated: timestamp,
        };
      });
      
      return {
        ...prev,
        wallets: updated,
      };
    });
    
    return timestamp;
  };

  /**
   * Get all wallets as array (for display/filtering)
   */
  const getAllWallets = (): WalletWithMeta[] => {
    return Object.values(database.wallets);
  };

  /**
   * Get wallets matching chain/timeframe/tag filters
   * (This is just for reference - actual filtering happens in page.tsx)
   */
  const getFilteredWallets = (chain: string, timeframe: string, tag: string): WalletWithMeta[] => {
    // Note: We don't have filter metadata stored per wallet
    // The backend determines which wallets to return based on these filters
    // This function returns ALL wallets for now
    return getAllWallets();
  };

  /**
   * Get oldest timestamp in database (for global staleness)
   */
  const getOldestTimestamp = (): number | null => {
    const wallets = getAllWallets();
    if (wallets.length === 0) return null;
    
    return Math.min(...wallets.map(w => w.last_updated));
  };

  /**
   * Get newest timestamp in database (for global staleness)
   */
  const getNewestTimestamp = (): number | null => {
    const wallets = getAllWallets();
    if (wallets.length === 0) return null;
    
    return Math.max(...wallets.map(w => w.last_updated));
  };

  /**
   * Clear entire database (for testing/debugging)
   */
  const clearDatabase = () => {
    setDatabase({
      wallets: {},
      version: DATABASE_VERSION,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  /**
   * Get database stats
   */
  const getStats = () => {
    const wallets = getAllWallets();
    return {
      totalWallets: wallets.length,
      oldestUpdate: getOldestTimestamp(),
      newestUpdate: getNewestTimestamp(),
      sizeBytes: JSON.stringify(database).length,
    };
  };

  return {
    // Data access
    getAllWallets,
    getFilteredWallets,
    
    // Mutations
    mergeWallets,
    clearDatabase,
    
    // Metadata
    getOldestTimestamp,
    getNewestTimestamp,
    getStats,
    
    // Raw database (for advanced use)
    database,
  };
}

