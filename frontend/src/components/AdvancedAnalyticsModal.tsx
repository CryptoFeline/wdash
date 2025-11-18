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

    try {
      // Set a 25-second timeout to match Netlify function timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(`/api/advanced-analysis/${wallet}/${chain}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const json = await response.json();

      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Unknown error');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. This wallet may have too many transactions. Please try again.');
      } else {
        setError(err.message);
      }
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
