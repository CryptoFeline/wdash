import { useState, useEffect, useCallback } from 'react';
import { Wallet } from '@/types/wallet';

export function useWalletFlags(initialWallets: Wallet[] = []) {
  // Local state for immediate UI updates
  const [flaggedWallets, setFlaggedWallets] = useState<Set<string>>(new Set());

  // Initialize from props
  useEffect(() => {
    const flagged = new Set<string>();
    initialWallets.forEach(w => {
      if (w.is_flagged) flagged.add(w.wallet_address);
    });
    setFlaggedWallets(flagged);
  }, [initialWallets]);

  const isFlagged = useCallback((address: string) => {
    return flaggedWallets.has(address);
  }, [flaggedWallets]);

  const toggleFlag = useCallback(async (address: string, chain: string) => {
    const isCurrentlyFlagged = flaggedWallets.has(address);
    const newStatus = !isCurrentlyFlagged;

    // Optimistic update
    setFlaggedWallets(prev => {
      const next = new Set(prev);
      if (newStatus) next.add(address);
      else next.delete(address);
      return next;
    });

    try {
      const response = await fetch(`/api/wallets/${address}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, is_flagged: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update flag');
      }
    } catch (error) {
      console.error('Flag update failed:', error);
      // Revert on error
      setFlaggedWallets(prev => {
        const next = new Set(prev);
        if (isCurrentlyFlagged) next.add(address);
        else next.delete(address);
        return next;
      });
    }
  }, [flaggedWallets]);

  // Function to force set flag (used by auto-detection)
  const setFlag = useCallback(async (address: string, chain: string, status: boolean) => {
    if (flaggedWallets.has(address) === status) return; // No change needed

    // Optimistic update
    setFlaggedWallets(prev => {
      const next = new Set(prev);
      if (status) next.add(address);
      else next.delete(address);
      return next;
    });

    try {
      await fetch(`/api/wallets/${address}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, is_flagged: status })
      });
    } catch (error) {
      console.error('Auto-flag update failed:', error);
    }
  }, [flaggedWallets]);

  return { isFlagged, toggleFlag, setFlag };
}
