'use client';

import { useState, useEffect } from 'react';
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
      const response = await fetch(`/api/advanced-analysis/${wallet}/${chain}`);
      const json = await response.json();

      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
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
        className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden pointer-events-auto border border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">📊 Advanced Analytics</h2>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div>
                  <span className="text-gray-500">Wallet:</span>
                  <span className="font-mono ml-2">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Chain:</span>
                  <span className="ml-2">{chain === '501' ? 'Solana' : chain}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl font-bold w-10 h-10 flex items-center justify-center rounded hover:bg-gray-700"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
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
