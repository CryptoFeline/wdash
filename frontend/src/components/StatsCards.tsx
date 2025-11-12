'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsResponse } from '@/types/wallet';
import { formatPercentage, formatUSD, truncateAddress } from '@/lib/export';
import { TrendingUp, DollarSign, Users, Trophy } from 'lucide-react';

interface StatsCardsProps {
  stats: StatsResponse | null;
  isLoading?: boolean;
  totalWalletsInDB?: number; // Override totalWallets with actual DB count
}

export default function StatsCards({ stats, isLoading, totalWalletsInDB }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 animate-pulse rounded bg-muted"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Use provided totalWalletsInDB (from accumulated localStorage) or fall back to stats
  const totalWallets = totalWalletsInDB !== undefined ? totalWalletsInDB : (stats.totalWallets || 0);
  const averagePnL = stats.averagePnL || 0;
  const averageProfit = stats.averageProfit || 0;
  const totalProfit = stats.totalProfit || 0;
  const topPerformer = stats.topPerformer || null;
  const riskDist = stats.riskDistribution || { low: 0, medium: 0, high: 0 };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalWallets}</div>
          <p className="text-xs text-muted-foreground">
            {riskDist.low} low risk,{' '}
            {riskDist.medium} medium,{' '}
            {riskDist.high} high
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg PnL 7d</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            +{formatPercentage(averagePnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            Average return on investment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Profit 7d</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatUSD(averageProfit)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total: {formatUSD(totalProfit)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {topPerformer ? (
            <>
              <div className="text-2xl font-bold text-green-600">
                +{formatPercentage(topPerformer.pnl_7d)}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {truncateAddress(topPerformer.wallet_address)}
              </p>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
