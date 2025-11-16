'use client';

import { ReconstructedTrade } from '@/types/wallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Target,
  Droplet,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { formatNumber, formatPercentage, formatUSD, getPnLColor } from '@/lib/export';

interface TradeDetailsTabProps {
  trades: ReconstructedTrade[];
}

// Helper function to get entry quality badge color
const getEntryQualityColor = (quality: string) => {
  switch (quality) {
    case 'excellent': return 'bg-green-600';
    case 'good': return 'bg-green-500';
    case 'fair': return 'bg-yellow-500';
    case 'poor': return 'bg-orange-500';
    case 'bad': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

// Helper function to get liquidity status badge
const getLiquidityBadge = (status: string) => {
  switch (status) {
    case 'drained': return <Badge variant="destructive"><Droplet className="h-3 w-3 mr-1" />Drained</Badge>;
    case 'low': return <Badge className="bg-red-600"><Droplet className="h-3 w-3 mr-1" />Low</Badge>;
    case 'warning': return <Badge className="bg-yellow-600"><Droplet className="h-3 w-3 mr-1" />Warning</Badge>;
    case 'healthy': return <Badge className="bg-green-600"><Droplet className="h-3 w-3 mr-1" />Healthy</Badge>;
    default: return <Badge variant="secondary">Unknown</Badge>;
  }
};

export default function TradeDetailsTab({ trades }: TradeDetailsTabProps) {
  if (!trades || trades.length === 0) {
    return (
      <div className="bg-secondary/20 border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No trade data available</p>
      </div>
    );
  }

  // Sort trades by entry timestamp (most recent first)
  const sortedTrades = [...trades].sort((a, b) => b.entry_timestamp - a.entry_timestamp);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trades.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {trades.filter(t => t.win).length} wins, {trades.filter(t => !t.win).length} losses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rugged Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {trades.filter(t => t.is_rug).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((trades.filter(t => t.is_rug).length / trades.length) * 100).toFixed(1)}% of trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Capture Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(
                trades.reduce((sum, t) => sum + (t.capture_efficiency || 0), 0) / trades.length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Of max potential captured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entry Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {['excellent', 'good', 'fair', 'poor', 'bad'].map(quality => {
                const count = trades.filter(t => t.entry_quality === quality).length;
                return count > 0 ? (
                  <Badge key={quality} className={`${getEntryQualityColor(quality)} text-xs`}>
                    {count}
                  </Badge>
                ) : null;
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Excellent/Good/Fair/Poor/Bad
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Max Potential</TableHead>
                  <TableHead>Entry Quality</TableHead>
                  <TableHead>Rug Status</TableHead>
                  <TableHead>Liquidity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTrades.map((trade) => (
                  <TableRow key={trade.trade_id}>
                    {/* Token */}
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold">{trade.token_symbol}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(trade.entry_timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>

                    {/* Entry */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatUSD(trade.entry_price)}</span>
                        {trade.immediate_move_1h !== undefined && (
                          <Badge className={`${getEntryQualityColor(trade.entry_quality || 'unknown')} text-xs mt-1`}>
                            {formatPercentage(trade.immediate_move_1h)} in 1h
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Exit */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{trade.exit_price ? formatUSD(trade.exit_price) : 'Open'}</span>
                        {trade.exited_before_peak && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            <XCircle className="h-3 w-3 mr-1" />
                            Early
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* P&L */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={getPnLColor(trade.realized_pnl)}>
                          {formatUSD(trade.realized_pnl)}
                        </span>
                        <span className={`text-xs ${getPnLColor(trade.realized_pnl)}`}>
                          {formatPercentage(trade.realized_roi)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Max Potential */}
                    <TableCell>
                      <div className="flex flex-col">
                        {trade.max_potential_roi !== undefined && trade.max_potential_roi > 0 ? (
                          <>
                            <span className="text-green-600 dark:text-green-400">
                              {formatPercentage(trade.max_potential_roi)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Eff: {formatPercentage(trade.capture_efficiency || 0)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No data</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Entry Quality */}
                    <TableCell>
                      {trade.entry_quality && trade.entry_quality !== 'unknown' ? (
                        <Badge className={getEntryQualityColor(trade.entry_quality)}>
                          {trade.entry_quality}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>

                    {/* Rug Status */}
                    <TableCell>
                      {trade.is_rug ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {trade.rug_type === 'hard_rug' ? 'Hard Rug' : 'Soft Rug'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {trade.rug_confidence}% conf
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Clean
                        </Badge>
                      )}
                    </TableCell>

                    {/* Liquidity */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {trade.liquidity_status && getLiquidityBadge(trade.liquidity_status)}
                        {trade.liquidity_usd !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            ${formatNumber(trade.liquidity_usd)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Trade Analysis */}
      {sortedTrades.slice(0, 5).map((trade) => (
        <Card key={trade.trade_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {trade.token_symbol}
                {trade.is_rug && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Rugged
                  </Badge>
                )}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {new Date(trade.entry_timestamp).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Realized ROI</p>
                <p className={`text-lg font-bold ${getPnLColor(trade.realized_pnl)}`}>
                  {formatPercentage(trade.realized_roi)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Potential ROI</p>
                <p className="text-lg font-bold text-green-600">
                  {formatPercentage(trade.max_potential_roi || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capture Efficiency</p>
                <p className="text-lg font-bold">
                  {formatPercentage(trade.capture_efficiency || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Drawdown</p>
                <p className="text-lg font-bold text-red-600">
                  {formatPercentage(trade.max_drawdown_roi || 0)}
                </p>
              </div>
            </div>

            {/* Entry Analysis */}
            {trade.immediate_move_1h !== undefined && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Entry Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Entry Quality</p>
                    <Badge className={getEntryQualityColor(trade.entry_quality || 'unknown')}>
                      {trade.entry_quality || 'unknown'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">1h Price Move</p>
                    <p className={`text-sm font-semibold ${trade.immediate_move_1h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(trade.immediate_move_1h)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Peak Timing</p>
                    <p className="text-sm font-semibold">
                      {trade.peak_before_exit ? (
                        <span className="text-green-600">✓ Before Exit</span>
                      ) : (
                        <span className="text-red-600">✗ After Exit</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rug Detection */}
            {trade.is_rug && trade.rug_reasons && trade.rug_reasons.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Rug Detection Indicators
                </h4>
                <ul className="space-y-1">
                  {trade.rug_reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-red-600 dark:text-red-400">
                      • {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Liquidity & Developer Info */}
            {trade.liquidity_status && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Token Health</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Liquidity Status</p>
                    {getLiquidityBadge(trade.liquidity_status)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Liquidity</p>
                    <p className="text-sm font-semibold">${formatNumber(trade.liquidity_usd || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Can Exit?</p>
                    <p className="text-sm font-semibold">
                      {trade.can_exit ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-red-600">✗ No</span>
                      )}
                    </p>
                  </div>
                  {trade.dev_rugged_tokens !== undefined && trade.dev_rugged_tokens > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Dev Rugged Tokens</p>
                      <p className="text-sm font-semibold text-red-600">{trade.dev_rugged_tokens}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
