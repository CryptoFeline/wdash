'use client';

import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatNumber,
  formatPercentage,
  formatUSD,
  getPnLColor,
  truncateAddress,
} from '@/lib/export';
import { Copy, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard';
import { useWalletAnalysis } from '@/hooks/useWalletAnalysis';

interface WalletDetailsModalProps {
  wallet: Wallet | null;
  chain: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WalletDetailsModal({
  wallet,
  chain,
  isOpen,
  onClose,
}: WalletDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!wallet) return null;

  const { summary, metrics, trades, loading: analysisLoading, error: analysisError } = useWalletAnalysis(wallet.wallet_address, isOpen);

  // Calculate if this is a good candidate for copy trading
  const isGoodCandidate = 
    wallet.winrate_7d >= 0.7 && 
    wallet.pnl_2x_5x_num_7d_ratio >= 0.3 &&
    wallet.realized_profit_7d > 1000;

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-lg">{truncateAddress(wallet.wallet_address)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openGMGN}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            {isGoodCandidate && (
              <Badge variant="default" className="bg-green-600 ml-2">
                <Star className="h-3 w-3 mr-1" />
                Good Candidate
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Last active: {formatTimestamp(wallet.last_active)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Advanced Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
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
                <CardTitle className="text-sm font-medium">Profit 7d</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatUSD(wallet.realized_profit_7d)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{wallet.balance.toFixed(4)} SOL</p>
              </CardContent>
            </Card>
          </div>

          {/* PnL Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PnL Distribution (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Loss &gt; 50%</p>
                  <p className="text-lg font-semibold text-red-600">
                    {wallet.pnl_lt_minus_dot5_num_7d}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(wallet.pnl_lt_minus_dot5_num_7d_ratio * 100)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Loss 0-50%</p>
                  <p className="text-lg font-semibold text-orange-500">
                    {wallet.pnl_minus_dot5_0x_num_7d}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(wallet.pnl_minus_dot5_0x_num_7d_ratio * 100)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Gain 0-2x</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {wallet.pnl_lt_2x_num_7d}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(wallet.pnl_lt_2x_num_7d_ratio * 100)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Gain 2-5x</p>
                  <p className="text-lg font-semibold text-green-600">
                    {wallet.pnl_2x_5x_num_7d}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(wallet.pnl_2x_5x_num_7d_ratio * 100)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Gain &gt; 5x</p>
                  <p className="text-lg font-semibold text-green-700 font-bold">
                    {wallet.pnl_gt_5x_num_7d}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(wallet.pnl_gt_5x_num_7d_ratio * 100)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Profit Chart (Simple) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Profit (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {wallet.daily_profit_7d.map((day, idx) => {
                  const date = new Date(day.timestamp * 1000).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  const maxProfit = Math.max(...wallet.daily_profit_7d.map(d => d.profit));
                  const barWidth = maxProfit > 0 ? (day.profit / maxProfit) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground">{date}</span>
                      <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                        <div 
                          className={`h-full ${day.profit > 0 ? 'bg-green-500' : 'bg-red-500'} transition-all`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">
                        {formatUSD(day.profit)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Risk Breakdown */}
          {wallet.risk ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Active Tokens</p>
                  <p className="text-lg font-semibold">{wallet.risk.token_active || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Honeypot Exposure</p>
                  <p className={`text-lg font-semibold ${(wallet.risk.token_honeypot_ratio || 0) > 0.3 ? 'text-red-500' : (wallet.risk.token_honeypot_ratio || 0) > 0.1 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {wallet.risk.token_honeypot || 0} ({formatPercentage((wallet.risk.token_honeypot_ratio || 0) * 100)})
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rug Pull Exposure</p>
                  <p className={`text-lg font-semibold ${(wallet.risk.sell_pass_buy_ratio || 0) > 0.3 ? 'text-red-500' : (wallet.risk.sell_pass_buy_ratio || 0) > 0.1 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {wallet.risk.sell_pass_buy || 0} ({formatPercentage((wallet.risk.sell_pass_buy_ratio || 0) * 100)})
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fast TX Ratio</p>
                  <p className={`text-lg font-semibold ${(wallet.risk.fast_tx_ratio || 0) > 0.5 ? 'text-red-500' : (wallet.risk.fast_tx_ratio || 0) > 0.2 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {wallet.risk.fast_tx || 0} ({formatPercentage((wallet.risk.fast_tx_ratio || 0) * 100)})
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">No Buy/Hold</p>
                  <p className="text-lg font-semibold">
                    {wallet.risk.no_buy_hold || 0} ({formatPercentage((wallet.risk.no_buy_hold_ratio || 0) * 100)})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Risk data not available for this wallet</p>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {wallet.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Tag Rank</p>
                  <p className="font-medium">
                    {wallet.tag_rank[wallet.tag] ? `#${wallet.tag_rank[wallet.tag]}` : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Followers</p>
                  <p className="font-medium">{formatNumber(wallet.follow_count)}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Total Realized Profit</p>
                  <p className="font-medium">{formatUSD(wallet.realized_profit)}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Avg Cost 7d</p>
                  <p className="font-medium">{formatUSD(wallet.avg_cost_7d)}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Avg Hold Time 7d</p>
                  <p className="font-medium">
                    {wallet.avg_holding_period_7d > 0 
                      ? `${(wallet.avg_holding_period_7d / 3600).toFixed(1)}h` 
                      : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Total Transactions</p>
                  <p className="font-medium">{formatNumber(wallet.txs)}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Buy/Sell (30d)</p>
                  <p className="font-medium">
                    <span className="text-green-600">{wallet.buy_30d}</span> / 
                    <span className="text-red-600"> {wallet.sell_30d}</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Tokens Traded (7d)</p>
                  <p className="font-medium">{wallet.token_num_7d}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="analysis" className="py-4">
            {analysisLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading detailed analysis...</p>
                </div>
              </div>
            ) : analysisError ? (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <p className="text-destructive text-sm">{analysisError}</p>
              </div>
            ) : (
              <AnalysisDashboard 
                summary={summary}
                metrics={metrics}
                trades={trades}
                loading={false}
                error={null}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
