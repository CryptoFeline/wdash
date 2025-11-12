'use client';

import { useEffect, useState } from 'react';
import { getTopGainers } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TopGainersCardProps {
  chain?: string;
  days?: number;
}

interface Gainer {
  wallet_address: string;
  profit_change: number;
  current_profit: number;
}

/**
 * Display top 10 gaining wallets over a period
 */
export function TopGainersCard({ chain = 'eth', days = 7 }: TopGainersCardProps) {
  const [gainers, setGainers] = useState<Gainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGainers() {
      try {
        setLoading(true);
        const data = await getTopGainers(chain, days);
        setGainers(data);
      } catch (err) {
        console.error('Failed to load top gainers:', err);
        setError('Failed to load top gainers');
      } finally {
        setLoading(false);
      }
    }

    loadGainers();
  }, [chain, days]);

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Gainers ({days}d)</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Gainers ({days}d)</h3>
        <div className="text-red-500 text-sm">{error}</div>
      </Card>
    );
  }

  if (gainers.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Gainers ({days}d)</h3>
        <div className="text-gray-500 text-sm">No gainer data yet</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Top Gainers ({days}d)</h3>
      <div className="space-y-3">
        {gainers.map((gainer, idx) => (
          <div key={gainer.wallet_address} className="flex items-center justify-between p-3 rounded border border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">#{idx + 1}</span>
                <code className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 truncate">
                  {gainer.wallet_address.slice(0, 8)}...{gainer.wallet_address.slice(-6)}
                </code>
              </div>
              <div className="text-xs text-gray-500">
                Current: ${gainer.current_profit.toFixed(0)}
              </div>
            </div>
            <Badge 
              variant={gainer.profit_change >= 0 ? 'default' : 'destructive'}
              className="ml-2 whitespace-nowrap"
            >
              {gainer.profit_change >= 0 ? '+' : ''}
              ${gainer.profit_change.toFixed(0)}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
