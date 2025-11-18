'use client';

import { useState, useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import AdvancedAnalyticsContent from './AdvancedAnalyticsContent';

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

  // Get chain display name
  const getChainName = (chainId: string) => {
    const chains: Record<string, string> = {
      '501': 'Solana',
      '1': 'Ethereum',
      '8453': 'Base',
      '56': 'BSC',
    };
    return chains[chainId] || chainId;
  };

  // Load analytics when modal opens
  useEffect(() => {
    if (isOpen && wallet && chain) {
      fetchAnalytics();
    }
  }, [isOpen, wallet, chain]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    const maxAttempts = 30; // Poll for up to 30 attempts (60 seconds with 2s intervals)
    let attempt = 0;

    try {
      while (attempt < maxAttempts) {
        attempt++;
        
        try {
          const response = await fetch(`/api/advanced-analysis/${wallet}/${chain}`);
          
          if (response.status === 504) {
            // Gateway timeout - data is still processing, wait and retry
            console.log(`[Analytics] Attempt ${attempt}/${maxAttempts} - Still processing, retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const json = await response.json();

          if (json.success) {
            setData(json.data);
            setLoading(false);
            return; // Success - exit
          } else {
            setError(json.error || 'Unknown error');
            setLoading(false);
            return;
          }
        } catch (err: any) {
          // If it's a network error on first attempt, might be processing
          if (attempt === 1) {
            console.log('[Analytics] Initial fetch failed, starting polling...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          // On later attempts, if we get an error, wait and retry
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          // Max attempts reached
          throw err;
        }
      }
      
      // Max attempts reached without success
      setError('Request timed out after 60 seconds. This wallet may have too many transactions.');
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
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
          className="bg-black/95 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden pointer-events-auto border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-black border-b border-gray-800 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-400" />
                Advanced Analytics
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-gray-400">
                  <span className="text-gray-500">Wallet:</span>
                  <span className="font-mono ml-2 text-white">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
                </div>
                <div className="text-gray-400">
                  <span className="text-gray-500">Chain:</span>
                  <span className="ml-2 text-blue-400 font-semibold">{getChainName(chain)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
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
