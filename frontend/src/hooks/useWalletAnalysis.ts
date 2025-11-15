import { useState, useEffect } from 'react';
import { OKXWalletSummary } from '@/lib/okx-api-v2';
import { WalletAnalysisMetrics, ReconstructedTrade } from '@/types/wallet';

export function useWalletAnalysis(walletAddress: string, isOpen: boolean) {
  const [summary, setSummary] = useState<OKXWalletSummary | undefined>();
  const [metrics, setMetrics] = useState<WalletAnalysisMetrics | undefined>();
  const [trades, setTrades] = useState<ReconstructedTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !walletAddress) return;

    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch summary from OKX API
        const summaryResponse = await fetch(`/api/analysis/summary?walletAddress=${walletAddress}`);
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
        }

        // Fetch metrics from analysis API
        const metricsResponse = await fetch(`/api/analysis/metrics?walletAddress=${walletAddress}`);
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          setMetrics(metricsData);
        }

        // Fetch reconstructed trades
        const tradesResponse = await fetch(`/api/analysis/trades?walletAddress=${walletAddress}`);
        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          setTrades(Array.isArray(tradesData) ? tradesData : tradesData.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
        console.error('Error loading analysis:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [walletAddress, isOpen]);

  return { summary, metrics, trades, loading, error };
}
