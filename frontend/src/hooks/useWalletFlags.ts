import { useState, useEffect, useCallback } from 'react';
import { Wallet } from '@/types/wallet';

export function useWalletFlags(initialWallets: Wallet[] = []) {
  // Local state for immediate UI updates
  const [flaggedWallets, setFlaggedWallets] = useState<Set<string>>(new Set());
  const [savedWallets, setSavedWallets] = useState<Set<string>>(new Set());

  // Initialize from props
  useEffect(() => {
    const flagged = new Set<string>();
    const saved = new Set<string>();
    initialWallets.forEach(w => {
      if (w.is_flagged) flagged.add(w.wallet_address);
      if (w.is_saved) saved.add(w.wallet_address);
    });
    setFlaggedWallets(flagged);
    setSavedWallets(saved);
  }, [initialWallets]);

  const isFlagged = useCallback((address: string) => {
    return flaggedWallets.has(address);
  }, [flaggedWallets]);

  const isSaved = useCallback((address: string) => {
    return savedWallets.has(address);
  }, [savedWallets]);

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

  const toggleSave = useCallback(async (address: string, chain: string) => {
    const isCurrentlySaved = savedWallets.has(address);
    const newStatus = !isCurrentlySaved;

    // Optimistic update
    setSavedWallets(prev => {
      const next = new Set(prev);
      if (newStatus) next.add(address);
      else next.delete(address);
      return next;
    });

    try {
      const response = await fetch(`/api/wallets/${address}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, field: 'is_saved', value: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update save status');
      }
    } catch (error) {
      console.error('Save update failed:', error);
      // Revert on error
      setSavedWallets(prev => {
        const next = new Set(prev);
        if (isCurrentlySaved) next.add(address);
        else next.delete(address);
        return next;
      });
    }
  }, [savedWallets]);

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

  // Function to sync flag state from external source (no API call)
  const setInitialFlag = useCallback((address: string, status: boolean) => {
    setFlaggedWallets(prev => {
      if (prev.has(address) === status) return prev;
      const next = new Set(prev);
      if (status) next.add(address);
      else next.delete(address);
      return next;
    });
  }, []);

  const setInitialSave = useCallback((address: string, status: boolean) => {
    setSavedWallets(prev => {
      if (prev.has(address) === status) return prev;
      const next = new Set(prev);
      if (status) next.add(address);
      else next.delete(address);
      return next;
    });
  }, []);

  return { isFlagged, isSaved, toggleFlag, toggleSave, setFlag, setInitialFlag, setInitialSave };
}
