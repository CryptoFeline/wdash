import { useState, useEffect } from 'react';
import { OKXWalletSummary } from '@/lib/okx-api-v2';
import { WalletAnalysisMetrics, ReconstructedTrade } from '@/types/wallet';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84';

export function useWalletAnalysis(walletAddress: string, chain: string = 'eth', isOpen: boolean = true) {
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

        const headers = {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        };

        // Fetch all three endpoints in parallel
        const [summaryResponse, metricsResponse, tradesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/analysis/summary/${walletAddress}?chain=${chain}`, { headers }),
          fetch(`${API_BASE_URL}/analysis/metrics/${walletAddress}?chain=${chain}`, { headers }),
          fetch(`${API_BASE_URL}/analysis/trades/${walletAddress}?chain=${chain}`, { headers }),
        ]);

        // Handle summary response
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
        } else {
          console.warn('Summary fetch failed:', summaryResponse.status);
        }

        // Handle metrics response
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          setMetrics(metricsData.metrics || metricsData);
        } else {
          console.warn('Metrics fetch failed:', metricsResponse.status);
        }

        // Handle trades response
        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          setTrades(tradesData.trades || tradesData.data || []);
        } else {
          console.warn('Trades fetch failed:', tradesResponse.status);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
        console.error('Error loading analysis:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [walletAddress, chain, isOpen]);

  return { summary, metrics, trades, loading, error };
}
