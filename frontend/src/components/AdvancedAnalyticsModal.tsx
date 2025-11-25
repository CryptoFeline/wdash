'use client';

import { useState, useEffect, useRef } from 'react';
import { X, BarChart3, Copy, ExternalLink, Flag, Bookmark } from 'lucide-react';
import AdvancedAnalyticsContent from './AdvancedAnalyticsContent';
import { useWalletFlags } from '@/hooks/useWalletFlags';

interface AdvancedAnalyticsModalProps {
  wallet: string;
  chain: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedAnalyticsModal({
  wallet,
  chain,
  isOpen,
  onClose
}: AdvancedAnalyticsModalProps) {
  const [loading, setLoading] = useState(false);
  const [copyTradeLoading, setCopyTradeLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // AbortController ref to cancel requests when modal closes
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Use the flag hook to auto-flag wallets
  const { isFlagged, isSaved, toggleFlag, toggleSave, setFlag, setInitialFlag, setInitialSave } = useWalletFlags();

  // Get chain display name
  const getChainName = (chainId: string) => {
    const chainMap: Record<string, string> = {
      '501': 'Solana',
      '1': 'Ethereum',
      '8453': 'Base',
      '56': 'BSC',
      '42161': 'Arbitrum'
    };
    return chainMap[chainId] || `Chain ${chainId}`;
  };

  const getExplorerUrl = (chainId: string, address: string) => {
    const explorers: Record<string, string> = {
      '501': `https://solscan.io/account/${address}`,
      '1': `https://etherscan.io/address/${address}`,
      '8453': `https://basescan.org/address/${address}`,
      '56': `https://bscscan.com/address/${address}`,
      '42161': `https://arbiscan.io/address/${address}`
    };
    return explorers[chainId] || '#';
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('[Analytics] Copied to clipboard:', text);
    } catch (err) {
      console.error('[Analytics] Failed to copy:', err);
    }
  };

  // Load analytics when modal opens
  useEffect(() => {
    if (isOpen && wallet && chain) {
      // Reset state when opening
      setData(null);
      setError(null);
      setLoading(true);
      fetchAnalytics();
    } else if (!isOpen) {
      // Abort any in-flight requests when modal closes
      if (abortControllerRef.current) {
        console.log('[Analytics] Modal closed - aborting pending requests');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Reset state when closing
      setData(null);
      setError(null);
      setLoading(false);
    }
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [isOpen, wallet, chain]);

  const fetchAnalytics = async () => {
    // Don't reset data here - it's already reset in useEffect
    // setLoading(true);
    // setError(null);
    // setData(null);

    const maxAttempts = 15; // Poll for up to 15 attempts (45 seconds with 3s intervals)
    let attempt = 0;
    let success = false; // Track if we successfully loaded data
    
    // Create a new AbortController for this fetch session
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      while (attempt < maxAttempts && !signal.aborted) {
        attempt++;
        
        try {
          // First request: trigger processing (skip copy trade AND rug check for speed)
          // Subsequent requests: check for cached result only
          const url = attempt === 1 
            ? `/api/advanced-analysis/${wallet}/${chain}?skipCopyTrade=true&skipRugCheck=true`
            : `/api/advanced-analysis/${wallet}/${chain}?cacheOnly=true`;
          
          console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Fetching:`, url);
          const response = await fetch(url, { signal });
          
          if (response.status === 504 || response.status === 202) {
            // Still processing - wait and check cache again
            console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Still processing, checking cache in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (signal.aborted) return; // Check if aborted during sleep
            continue;
          }
          
          if (!response.ok) {
            // On first attempt, non-200 might mean it's processing
            if (attempt === 1) {
              console.log('[Analytics] First request failed, polling for cached result...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              if (signal.aborted) return; // Check if aborted during sleep
              continue;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const json = await response.json();

          if (json.success && json.data) {
            console.log('[Analytics] ✅ Data received on attempt', attempt);
            console.log('[Analytics] Data structure:', {
              hasOverview: !!json.data?.overview,
              hasTokens: !!json.data?.tokens,
              hasTrades: !!json.data?.trades,
              tokenCount: json.data?.tokens?.length,
              tradeCount: json.data?.trades?.length
            });
            setData(json.data);
            
            // Sync flag and save status from backend
            if (json.data?.meta) {
              setInitialFlag(wallet, json.data.meta.is_flagged || false);
              setInitialSave(wallet, json.data.meta.is_saved || false);
            }
            
            // Check for Rug Detection > 10% and auto-flag
            // The rug_detection object is in overview.rug_detection
            const rugDetection = json.data?.overview?.rug_detection;
            if (rugDetection && rugDetection.percent >= 10 && !json.data?.meta?.is_flagged) {
              console.log(`[Analytics] Auto-flagging wallet ${wallet} (Rug Detection: ${rugDetection.percent.toFixed(1)}%)`);
              // Backend already auto-flags, but sync local state
              setFlag(wallet, chain, true);
            }

            setLoading(false);
            success = true; // Mark as successful

            // If we got fast data (no rug checks), trigger background update
            if (json.data?.meta && !json.data.meta.rugCheckComplete) {
               fetchRugChecks();
            }

            break; // Exit while loop successfully
          } else if (json.processing || response.status === 202) {
            // Backend says it's still processing
            console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Still processing, checking cache in 3s...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            if (signal.aborted) return; // Check if aborted during sleep
            continue;
          } else {
            console.error('[Analytics] Unexpected response:', json);
            setError(json.error || 'Failed to load analytics data');
            setLoading(false);
            break;
          }
        } catch (err: any) {
          // Handle abort - modal was closed
          if (err.name === 'AbortError') {
            console.log('[Analytics] Request aborted (modal closed)');
            // Don't set error state if aborted - modal is closed anyway
            return;
          }
          
          // Other errors - retry if we have attempts left
          if (attempt < maxAttempts && !signal.aborted) {
            console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Error, retrying in 3s:`, err.message);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          // Max attempts reached
          setError(err.message || 'Failed to load analytics');
          setLoading(false);
        }
      }
      
      // Max attempts reached without success
      if (!success && !error) {
        setError('Request timed out after multiple attempts. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[Analytics] Fatal error:', err);
      setError(err.message || 'Failed to load analytics');
      setLoading(false);
    }
  };

  const fetchRugChecks = async () => {
    try {
      console.log('[Analytics] Background: Fetching rug checks...');
      // Request full data (skipCopyTrade=true, skipRugCheck=false)
      // This will trigger Phase 2 on the backend
      const response = await fetch(`/api/advanced-analysis/${wallet}/${chain}?skipCopyTrade=true`);
      const json = await response.json();
      
      if (json.success && json.data) {
        console.log('[Analytics] Background: Rug checks complete. Updating data.');
        setData(json.data);
        
        // Check for auto-flagging
        const rugScore = json.data?.overview?.rugDetection?.score || 0;
        if (rugScore >= 10) {
          console.log(`[Analytics] Auto-flagging wallet ${wallet} (Rug Score: ${rugScore}%)`);
          setFlag(wallet, chain, true);
        }
      }
    } catch (err) {
      console.error('[Analytics] Background rug check failed:', err);
    }
  };

  const runCopyTradeAnalysis = async () => {
    // Deprecated: Now handled per-row
    console.log('Global copy trade analysis is deprecated');
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Dark overlay */}
      <div 
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-black/95 rounded-xl shadow-2xl w-full max-w-7xl h-full overflow-hidden pointer-events-auto border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-black p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-green-500" />
                Advanced Analytics
              </h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Wallet Address with Actions */}
              <div className="flex items-center gap-3">
                <span className="text-gray-200 text-sm">Wallet:</span>
                <code className="font-mono text-white text-sm bg-black/20 px-3 py-1 rounded">
                  {wallet}
                </code>
                <button
                  onClick={() => copyToClipboard(wallet)}
                  className="text-white/70 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
                  title="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={getExplorerUrl(chain, wallet)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
                  title="View on explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button
                  onClick={() => toggleSave(wallet, chain)}
                  className={`transition-colors p-1.5 rounded hover:bg-white/10 ${isSaved(wallet) ? 'text-yellow-500' : 'text-white/70 hover:text-white'}`}
                  title={isSaved(wallet) ? "Unsave wallet" : "Save wallet"}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved(wallet) ? 'fill-yellow-500' : ''}`} />
                </button>
                <button
                  onClick={() => toggleFlag(wallet, chain)}
                  className={`transition-colors p-1.5 rounded hover:bg-white/10 ${isFlagged(wallet) ? 'text-red-500' : 'text-white/70 hover:text-white'}`}
                  title={isFlagged(wallet) ? "Unflag wallet" : "Flag wallet (Rug Suspect)"}
                >
                  <Flag className={`h-4 w-4 ${isFlagged(wallet) ? 'fill-red-500' : ''}`} />
                </button>
              </div>

              {/* Chain and Native Balance */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-200">Chain:</span>
                  <span className="text-white font-semibold">{getChainName(chain)}</span>
                </div>
                {data?.meta?.nativeBalance && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200">Native Balance:</span>
                    <span className="text-white font-semibold">
                      {parseFloat(data.meta.nativeBalance.amount).toFixed(2)} {data.meta.nativeBalance.symbol || 'SOL'}
                      <span className="text-gray-300 ml-1">
                        (${parseFloat(data.meta.nativeBalance.usd || '0').toLocaleString()})
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6 bg-black/50">
            {loading ? (
              // Loading state
              <div className="flex flex-col items-center justify-center py-10">
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full blur-md bg-green-500/30 animate-pulse"></div>
                  <svg 
                    className="relative animate-spin h-12 w-12 text-green-500"
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <span className="text-white text-lg font-medium animate-pulse">Analyzing Wallet...</span>
                <span className="text-gray-400 text-sm mt-2">Fetching trades, checking rugs, and calculating PnL</span>
              </div>
            ) : error ? (
              // Error state
              <div className="text-red-400 text-center py-10">
                <p className="text-lg font-semibold mb-2">Error loading analytics</p>
                <p className="text-sm">{error}</p>
              </div>
            ) : data ? (
              <AdvancedAnalyticsContent 
                data={data} 
                wallet={wallet} 
                chain={chain}
                onRunCopyTrade={() => {}}
                copyTradeLoading={false}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
