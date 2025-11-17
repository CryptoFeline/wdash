'use client';

import { useState, useEffect } from 'react';
import { formatNumber, formatUSD, formatPercent } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'trades'>('overview');
  const [loading, setLoading] = useState(false);
  const [loadingPhase2, setLoadingPhase2] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [rugCheckComplete, setRugCheckComplete] = useState(false);

  // Two-phase loading: Phase 1 (fast) then Phase 2 (with rug checks)
  useEffect(() => {
    if (isOpen && wallet && chain) {
      fetchAnalyticsPhase1();
    }
  }, [isOpen, wallet, chain]);

  // Phase 1: Fast initial load (skip rug detection)
  const fetchAnalyticsPhase1 = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setRugCheckComplete(false);

    try {
      console.log('[Phase 1] Loading basic analytics (no rug checks)...');
      const response = await fetch(`/api/advanced-analysis/${wallet}/${chain}?skipRugCheck=true`);
      const json = await response.json();

      if (json.success) {
        setData(json.data);
        setRugCheckComplete(json.rugCheckComplete || false);
        setLoading(false);
        
        // Immediately start Phase 2 in background
        if (!json.rugCheckComplete) {
          fetchAnalyticsPhase2();
        }
      } else {
        setError(json.error || 'Failed to load analytics');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  // Phase 2: Complete load with rug detection
  const fetchAnalyticsPhase2 = async () => {
    setLoadingPhase2(true);
    
    try {
      console.log('[Phase 2] Loading rug checks...');
      const response = await fetch(`/api/advanced-analysis/${wallet}/${chain}`);
      const json = await response.json();

      if (json.success) {
        setData(json.data);
        setRugCheckComplete(true);
        console.log('[Phase 2] ✅ Rug checks complete');
      }
    } catch (err: any) {
      console.warn('[Phase 2] Failed to load rug checks:', err.message);
    } finally {
      setLoadingPhase2(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Advanced Analytics
              {loadingPhase2 && (
                <span className="text-xs text-yellow-400 flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading rug checks...
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">{wallet}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-900 px-4 flex gap-1 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'tokens'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Tokens
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'trades'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Trades
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading analytics...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded p-4 text-red-400">
              Error: {error}
            </div>
          )}

          {data && activeTab === 'overview' && <OverviewTab data={data.overview} />}
          {data && activeTab === 'tokens' && (
            <TokensTab
              tokens={data.tokens}
              showAll={showAllTokens}
              onToggleShowAll={() => setShowAllTokens(!showAllTokens)}
            />
          )}
          {data && activeTab === 'trades' && (
            <TradesTab
              overview={data.overview}
              trades={data.trades}
              showAllClosed={showAllClosed}
              showAllOpen={showAllOpen}
              onToggleShowAllClosed={() => setShowAllClosed(!showAllClosed)}
              onToggleShowAllOpen={() => setShowAllOpen(!showAllOpen)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================
// OVERVIEW TAB
// ===========================
function OverviewTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Risk Metrics */}
      <div className="bg-gray-700/50 p-4 rounded">
        <h3 className="text-lg font-bold mb-3 text-white">⚠️ Risk Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Rugged Positions"
            value={data.risk_metrics.rugged_positions}
            tooltip="Token price dropped >90% from avg buy"
          />
          <MetricCard
            label="Confirmed Losses"
            value={data.risk_metrics.confirmed_losses}
            tooltip="Closed positions with realized loss"
          />
          <MetricCard
            label="Win/Loss Breakdown"
            value={`${data.risk_metrics.win_breakdown.wins}W / ${data.risk_metrics.win_breakdown.losses}L`}
            tooltip="Number of winning vs losing closed positions"
          />
          <MetricCard
            label="Avg Loss Per Position"
            value={formatUSD(data.risk_metrics.avg_loss_per_position)}
            valueColor="text-red-400"
            tooltip="Average $ amount lost on losing positions"
          />
          <MetricCard
            label="Avg Win Per Position"
            value={formatUSD(data.risk_metrics.avg_win_per_position)}
            valueColor="text-green-400"
            tooltip="Average $ amount gained on winning positions"
          />
          <MetricCard
            label="Win Rate"
            value={formatPercent(data.risk_metrics.win_rate)}
            valueColor={data.risk_metrics.win_rate >= 50 ? 'text-green-400' : 'text-yellow-400'}
            tooltip="% of closed positions that were profitable"
          />
        </div>
      </div>

      {/* Capital Metrics */}
      <div className="bg-gray-700/50 p-4 rounded">
        <h3 className="text-lg font-bold mb-3 text-white">💰 Capital Metrics (FIFO Method)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Starting Capital"
            value={formatUSD(data.capital_metrics.starting_capital)}
          />
          <MetricCard
            label="Peak Deployed"
            value={formatUSD(data.capital_metrics.peak_deployed)}
          />
          <MetricCard
            label="Final Capital"
            value={formatUSD(data.capital_metrics.final_capital)}
          />
          <MetricCard
            label="Net PnL"
            value={formatUSD(data.capital_metrics.net_pnl)}
            valueColor={data.capital_metrics.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <MetricCard
            label="Trading Performance ROI"
            value={formatPercent(data.capital_metrics.trading_performance_roi)}
            valueColor={data.capital_metrics.trading_performance_roi >= 0 ? 'text-green-400' : 'text-red-400'}
            highlight={data.capital_metrics.trading_performance_roi >= 20}
          />
          <MetricCard
            label="Wallet Growth ROI"
            value={formatPercent(data.capital_metrics.wallet_growth_roi)}
            valueColor="text-blue-400"
          />
        </div>
      </div>

      {/* Volume Metrics */}
      <div className="bg-gray-700/50 p-4 rounded">
        <h3 className="text-lg font-bold mb-3 text-white">📈 Volume Metrics</h3>
        <p className="text-sm text-yellow-400 mb-3">
          ⚠️ {data.volume_metrics.note}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Buy Volume"
            value={formatUSD(data.volume_metrics.total_buy_volume)}
          />
          <MetricCard
            label="Total Sell Volume"
            value={formatUSD(data.volume_metrics.total_sell_volume)}
          />
          <MetricCard
            label="Total Volume"
            value={formatUSD(data.volume_metrics.total_volume)}
          />
          <MetricCard
            label="Avg Trade Size"
            value={formatUSD(data.volume_metrics.avg_trade_size)}
          />
        </div>
      </div>
    </div>
  );
}

// ===========================
// TOKENS TAB
// ===========================
function TokensTab({
  tokens,
  showAll,
  onToggleShowAll
}: {
  tokens: any[];
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const displayTokens = showAll ? tokens : tokens.slice(0, 10);

  return (
    <div>
      <h3 className="text-lg font-bold mb-4 text-white">
        Token-Level Aggregation ({tokens.length} tokens)
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-center">Trades</th>
              <th className="px-3 py-2 text-right">Invested</th>
              <th className="px-3 py-2 text-right">Returned</th>
              <th className="px-3 py-2 text-right">Realized PnL</th>
              <th className="px-3 py-2 text-right">Unrealized PnL</th>
              <th className="px-3 py-2 text-right">Net PnL</th>
              <th className="px-3 py-2 text-center">Win Rate</th>
              <th className="px-3 py-2 text-center">Time Window</th>
              <th className="px-3 py-2 text-center">Avg Hold</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {displayTokens.map((token, idx) => {
              const netPnL = token.total_realized_pnl + token.total_unrealized_pnl;
              const status = getTokenStatus(token);
              
              return (
                <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30">
                  <td className="px-3 py-3">
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs text-gray-400 font-mono">{token.token_address.slice(0, 8)}...</div>
                  </td>
                  <td className="px-3 py-3 text-center">{token.total_trades}</td>
                  <td className="px-3 py-3 text-right">{formatUSD(token.total_invested)}</td>
                  <td className="px-3 py-3 text-right">{formatUSD(token.total_returned)}</td>
                  <td className={`px-3 py-3 text-right ${token.total_realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatUSD(token.total_realized_pnl)}
                  </td>
                  <td className={`px-3 py-3 text-right ${token.total_unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatUSD(token.total_unrealized_pnl)}
                  </td>
                  <td className={`px-3 py-3 text-right font-medium ${netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatUSD(netPnL)}
                  </td>
                  <td className="px-3 py-3 text-center">{formatPercent(token.win_rate)}</td>
                  <td className="px-3 py-3 text-center text-xs">{formatTimeWindow(token)}</td>
                  <td className="px-3 py-3 text-center text-xs">{formatHoldTime(token.avg_hold_time_seconds)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tokens.length > 10 && (
        <div className="mt-4 text-center">
          <button
            onClick={onToggleShowAll}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
          >
            {showAll ? 'Show Less' : `Show All (${tokens.length} tokens)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ===========================
// TRADES TAB
// ===========================
function TradesTab({
  overview,
  trades,
  showAllClosed,
  showAllOpen,
  onToggleShowAllClosed,
  onToggleShowAllOpen
}: {
  overview: any;
  trades: any;
  showAllClosed: boolean;
  showAllOpen: boolean;
  onToggleShowAllClosed: () => void;
  onToggleShowAllOpen: () => void;
}) {
  const closedTrades = trades.closed || [];
  const openTrades = trades.open || [];
  const totalTrades = closedTrades.length + openTrades.length;

  const displayClosed = showAllClosed ? closedTrades : closedTrades.slice(0, 10);
  const displayOpen = showAllOpen ? openTrades : openTrades.slice(0, 10);

  // Calculate per-trade metrics
  const perTradeWinRate = totalTrades > 0 
    ? (overview.risk_metrics.win_breakdown.wins / totalTrades) * 100 
    : 0;
  const avgPerTradePnL = totalTrades > 0
    ? overview.capital_metrics.net_pnl / totalTrades
    : 0;
  const avgPerTradeROI = totalTrades > 0 && overview.capital_metrics.starting_capital > 0
    ? (overview.capital_metrics.net_pnl / overview.capital_metrics.starting_capital / totalTrades) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Trade-Level Summary */}
      <div className="bg-gray-700/50 p-4 rounded">
        <h3 className="text-lg font-bold mb-3 text-white">📊 Trade-Level Summary (All Trades: Closed + Open)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Per-Trade Win Rate"
            value={`${overview.risk_metrics.win_breakdown.wins}W / ${totalTrades}T = ${formatPercent(perTradeWinRate)}`}
          />
          <MetricCard
            label="Avg Per-Trade PnL"
            value={formatUSD(avgPerTradePnL)}
            valueColor={avgPerTradePnL >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <MetricCard
            label="Avg Hold Time (All)"
            value={formatHoldTime(overview.capital_metrics.avg_hold_time_seconds)}
          />
          <MetricCard
            label="Avg Per-Trade ROI"
            value={formatPercent(avgPerTradeROI)}
            valueColor={avgPerTradeROI >= 0 ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      </div>

      {/* Closed Trades */}
      <div>
        <h3 className="text-lg font-bold mb-3 text-white">
          🔒 Closed Trades ({closedTrades.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-right">Buy</th>
                <th className="px-3 py-2 text-right">Sell</th>
                <th className="px-3 py-2 text-right">PnL</th>
                <th className="px-3 py-2 text-center">ROI</th>
                <th className="px-3 py-2 text-center">Hold Time</th>
                <th className="px-3 py-2 text-center">Entry</th>
                <th className="px-3 py-2 text-center">Exit</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {displayClosed.map((trade: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30">
                  <td className="px-3 py-3">
                    <div className="font-medium">{trade.symbol}</div>
                    <div className="text-xs text-gray-400 font-mono">{trade.token_address.slice(0, 8)}...</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div>{formatUSD(trade.avg_buy_price)}</div>
                    <div className="text-xs text-gray-400">{formatNumber(trade.total_bought)} tokens</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div>{formatUSD(trade.avg_sell_price)}</div>
                    <div className="text-xs text-gray-400">{formatNumber(trade.total_sold)} tokens</div>
                  </td>
                  <td className={`px-3 py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatUSD(trade.pnl)}
                  </td>
                  <td className={`px-3 py-3 text-center ${trade.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(trade.roi)}
                  </td>
                  <td className="px-3 py-3 text-center text-xs">{formatHoldTime(trade.hold_time_seconds)}</td>
                  <td className="px-3 py-3 text-center text-xs text-gray-400">
                    {new Date(trade.entry_time).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-gray-400">
                    {new Date(trade.exit_time).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {closedTrades.length > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={onToggleShowAllClosed}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              {showAllClosed ? 'Show Less' : `Show All (${closedTrades.length} trades)`}
            </button>
          </div>
        )}
      </div>

      {/* Open Positions */}
      <div>
        <h3 className="text-lg font-bold mb-3 text-white">
          🔓 Open Positions ({openTrades.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-right">Avg Buy</th>
                <th className="px-3 py-2 text-right">Current Price</th>
                <th className="px-3 py-2 text-right">Invested</th>
                <th className="px-3 py-2 text-right">Current Value</th>
                <th className="px-3 py-2 text-right">Unrealized PnL</th>
                <th className="px-3 py-2 text-center">ROI</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {displayOpen.map((trade: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30">
                  <td className="px-3 py-3">
                    <div className="font-medium">{trade.symbol}</div>
                    <div className="text-xs text-gray-400 font-mono">{trade.token_address.slice(0, 8)}...</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div>{formatUSD(trade.avg_buy_price)}</div>
                    <div className="text-xs text-gray-400">{formatNumber(trade.remaining_amount)} tokens</div>
                  </td>
                  <td className="px-3 py-3 text-right">{formatUSD(trade.current_price)}</td>
                  <td className="px-3 py-3 text-right">{formatUSD(trade.invested)}</td>
                  <td className="px-3 py-3 text-right">{formatUSD(trade.current_value)}</td>
                  <td className={`px-3 py-3 text-right font-medium ${trade.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatUSD(trade.unrealized_pnl)}
                  </td>
                  <td className={`px-3 py-3 text-center ${trade.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(trade.roi)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.is_rugged ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'
                    }`}>
                      {trade.is_rugged ? 'RUGGED' : 'HOLDING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {openTrades.length > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={onToggleShowAllOpen}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              {showAllOpen ? 'Show Less' : `Show All (${openTrades.length} positions)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================
// HELPER COMPONENTS
// ===========================
function MetricCard({
  label,
  value,
  valueColor = 'text-white',
  tooltip,
  highlight = false
}: {
  label: string;
  value: string | number;
  valueColor?: string;
  tooltip?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-800/50 p-3 rounded">
      <p className="text-gray-400 text-xs mb-1" title={tooltip}>
        {label}
        {tooltip && <span className="ml-1 text-gray-500 cursor-help">ⓘ</span>}
      </p>
      <p className={`text-lg font-bold ${valueColor} ${highlight ? 'text-2xl' : ''}`}>
        {value}
        {highlight && ' 🔥'}
      </p>
    </div>
  );
}

// ===========================
// HELPER FUNCTIONS
// ===========================
function getTokenStatus(token: any): string {
  const hasOpenPositions = token.open_position_count > 0;
  const hasClosedTrades = token.closed_position_count > 0;
  const isRugged = token.is_rugged;

  if (isRugged && hasOpenPositions) return 'RUGGED';
  if (!hasClosedTrades && hasOpenPositions) return 'HOLDING';
  if (hasClosedTrades && !hasOpenPositions) {
    return token.total_realized_pnl < -50 ? 'ESCAPED' : 'EXITED';
  }
  if (hasClosedTrades && hasOpenPositions) return 'PARTIAL';
  return 'UNKNOWN';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'RUGGED': return 'bg-red-900 text-red-200';
    case 'ESCAPED': return 'bg-yellow-900 text-yellow-200';
    case 'EXITED': return 'bg-green-900 text-green-200';
    case 'PARTIAL': return 'bg-purple-900 text-purple-200';
    case 'HOLDING': return 'bg-blue-900 text-blue-200';
    default: return 'bg-gray-700 text-gray-300';
  }
}

function formatTimeWindow(token: any): string {
  if (!token.first_trade || !token.last_trade) return 'N/A';
  const start = new Date(token.first_trade);
  const end = new Date(token.last_trade);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function formatHoldTime(seconds: number): string {
  if (!seconds || seconds === 0) return 'N/A';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
