'use client';

import { useState, useEffect } from 'react';
import { X, BarChart3, Copy, ExternalLink } from 'lucide-react';
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
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use the flag hook to auto-flag wallets
  const { setFlag } = useWalletFlags();

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
      // Reset state when closing
      setData(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, wallet, chain]);

  const fetchAnalytics = async () => {
    // Don't reset data here - it's already reset in useEffect
    // setLoading(true);
    // setError(null);
    // setData(null);

    const maxAttempts = 15; // Poll for up to 15 attempts (45 seconds with 3s intervals)
    let attempt = 0;
    let success = false; // Track if we successfully loaded data

    try {
      while (attempt < maxAttempts) {
        attempt++;
        
        try {
          // Add timeout to each individual request (26 seconds to match backend)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 26000);
          
          // First request: trigger processing
          // Subsequent requests: check for cached result only
          const url = attempt === 1 
            ? `/api/advanced-analysis/${wallet}/${chain}`
            : `/api/advanced-analysis/${wallet}/${chain}?cacheOnly=true`;
          
          console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Fetching:`, url);
          const response = await fetch(url, { signal: controller.signal });
          
          clearTimeout(timeoutId);
          
          if (response.status === 504 || response.status === 202) {
            // Still processing - wait and check cache again
            console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Still processing, checking cache in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          if (!response.ok) {
            // On first attempt, non-200 might mean it's processing
            if (attempt === 1) {
              console.log('[Analytics] First request failed, polling for cached result...');
              await new Promise(resolve => setTimeout(resolve, 2000));
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
            
            // Check for Rug Detection > 10% and auto-flag
            // Assuming rugDetection is in json.data.overview.rugDetection or similar
            // Based on previous context, it might be in overview
            const rugScore = json.data?.overview?.rugDetection?.score || 0;
            if (rugScore >= 10) {
              console.log(`[Analytics] Auto-flagging wallet ${wallet} (Rug Score: ${rugScore}%)`);
              setFlag(wallet, chain, true);
            }

            setLoading(false);
            success = true; // Mark as successful
            break; // Exit while loop successfully
          } else if (json.processing || response.status === 202) {
            // Backend says it's still processing
            console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Still processing, checking cache in 3s...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          } else {
            console.error('[Analytics] Unexpected response:', json);
            setError(json.error || 'Failed to load analytics data');
            setLoading(false);
            break;
          }
        } catch (err: any) {
          // Handle abort/timeout
          if (err.name === 'AbortError') {
            console.warn(`[Analytics] Attempt ${attempt}/${maxAttempts} - Request timed out after 26s`);
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            } else {
              setError('Request timed out. The wallet analysis is taking longer than expected.');
              setLoading(false);
              break;
            }
          }
          
          // Other errors
          if (attempt < maxAttempts) {
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
            <AdvancedAnalyticsContent 
              data={data}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    </>
  );
}
