'use client';

import { Wallet } from '@/types/wallet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatNumber,
  formatPercentage,
  formatUSD,
  getPnLColor,
  truncateAddress,
} from '@/lib/export';
import { Copy, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalletOverviewModalProps {
  wallet: Wallet | null;
  chain: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WalletOverviewModal({
  wallet,
  chain,
  isOpen,
  onClose,
}: WalletOverviewModalProps) {
  if (!wallet) return null;

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.wallet_address);
  };

  const openGMGN = () => {
    window.open(`https://gmgn.ai/${chain}/address/${wallet.wallet_address}`, '_blank');
  };

  // Format timestamp to readable date
  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-lg">{truncateAddress(wallet.wallet_address)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openGMGN}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Last active: {formatTimestamp(wallet.last_active)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Win Rate 7d</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${wallet.winrate_7d >= 0.7 ? 'text-green-600' : wallet.winrate_7d >= 0.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {formatPercentage(wallet.winrate_7d * 100)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">PnL 7d</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${getPnLColor(wallet.pnl_7d)}`}>
                  {wallet.pnl_7d > 0 ? '+' : ''}{formatPercentage(wallet.pnl_7d)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Realized Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${getPnLColor(wallet.realized_profit_7d)}`}>
                  {formatUSD(wallet.realized_profit_7d)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tokens Traded</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {wallet.token_num_7d}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trading Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Buys (30d)</p>
                  <p className="text-lg font-semibold">{wallet.buy_30d}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Hold Time</p>
                  <p className="text-lg font-semibold">{(wallet.avg_holding_period_7d / 3600).toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">2x-5x Ratio</p>
                  <p className="text-lg font-semibold">{formatPercentage(wallet.pnl_2x_5x_num_7d_ratio * 100)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GT 5x Ratio</p>
                  <p className="text-lg font-semibold">{formatPercentage(wallet.pnl_gt_5x_num_7d_ratio * 100)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Losses (&lt; -50%)</p>
                  <p className={`text-lg font-semibold ${wallet.pnl_lt_minus_dot5_num_7d > 3 ? 'text-red-500' : 'text-green-600'}`}>
                    {wallet.pnl_lt_minus_dot5_num_7d}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loss Ratio</p>
                  <p className={`text-lg font-semibold ${wallet.pnl_lt_minus_dot5_num_7d_ratio > 0.2 ? 'text-red-500' : 'text-green-600'}`}>
                    {formatPercentage(wallet.pnl_lt_minus_dot5_num_7d_ratio * 100)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Info */}
          {(wallet.twitter_username || wallet.twitter_name) && (
            <Card>
              <CardHeader>
                <CardTitle>Social Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {wallet.twitter_username && (
                  <div>
                    <p className="text-sm text-muted-foreground">Twitter</p>
                    <a 
                      href={`https://twitter.com/${wallet.twitter_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      @{wallet.twitter_username}
                    </a>
                  </div>
                )}
                {wallet.twitter_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Display Name</p>
                    <p className="font-medium">{wallet.twitter_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
