'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { 
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  fetchCompleteWalletData,
  type OKXWalletData,
  formatUSD,
  formatPercent,
  formatNumber
} from '@/lib/okx-api-v2';
import {
  BalancesCard,
  PnLCard,
  WinRateCard,
  TradingStatsCard
} from './modal/OverviewCards';
import {
  MarketCapCard,
  QualityMetricsCard
} from './modal/MetricCards';
import { TokenAnalyticsTable } from './modal/TokenAnalyticsTable';
import { WinRateBucketsChart } from './modal/WinRateBucketsChart';
import { BuySellTimelineChart } from './modal/BuySellTimelineChart';

// ============================================================================
// TYPES
// ============================================================================

interface WalletDetailModalProps {
  wallet: {
    address: string;
    chainId?: string;
    nickname?: string;
    avatarUrl?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'holdings' | 'history' | 'analytics';

interface TabConfig {
  id: TabType;
  label: string;
  icon?: React.ReactNode;
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export default function WalletDetailModal({ wallet, isOpen, onClose }: WalletDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [walletData, setWalletData] = useState<OKXWalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallet data when modal opens
  useEffect(() => {
    if (isOpen && wallet?.address) {
      loadWalletData();
    } else {
      // Reset state when modal closes
      setWalletData(null);
      setError(null);
      setActiveTab('overview');
    }
  }, [isOpen, wallet?.address]);

  const loadWalletData = async () => {
    if (!wallet?.address) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchCompleteWalletData(
        wallet.address,
        wallet.chainId || '501'
      );

      if (result.success && result.data) {
        setWalletData(result.data);
      } else {
        setError(result.error || 'Failed to load wallet data');
      }
    } catch (err) {
      console.error('[Modal] Error loading wallet data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      // TODO: Show toast notification
    }
  };

  const handleOpenExplorer = () => {
    if (wallet?.address) {
      const explorerUrl = wallet.chainId === '501' 
        ? `https://solscan.io/account/${wallet.address}`
        : `https://etherscan.io/address/${wallet.address}`;
      window.open(explorerUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <ModalHeader 
          wallet={wallet}
          walletData={walletData}
          onClose={onClose}
          onCopyAddress={handleCopyAddress}
          onOpenExplorer={handleOpenExplorer}
        />

        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content Area */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 bg-zinc-900/50">
          {loading && <LoadingState />}
          {error && <ErrorState error={error} onRetry={loadWalletData} />}
          {!loading && !error && walletData && (
            <TabContent 
              activeTab={activeTab}
              walletData={walletData}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL HEADER COMPONENT
// ============================================================================

interface ModalHeaderProps {
  wallet: WalletDetailModalProps['wallet'];
  walletData: OKXWalletData | null;
  onClose: () => void;
  onCopyAddress: () => void;
  onOpenExplorer: () => void;
}

function ModalHeader({ 
  wallet, 
  walletData, 
  onClose, 
  onCopyAddress, 
  onOpenExplorer 
}: ModalHeaderProps) {
  const totalPnL = walletData?.summary.totalPnl 
    ? parseFloat(walletData.summary.totalPnl) 
    : 0;
  const isProfitable = totalPnL >= 0;

  return (
    <div className="relative border-b border-zinc-700/50 bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800 p-6">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors text-zinc-400 hover:text-zinc-200"
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
          {wallet?.nickname ? wallet.nickname[0].toUpperCase() : wallet?.address?.[0] || '?'}
        </div>

        {/* Wallet Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-zinc-100">
              {wallet?.nickname || 'Wallet Details'}
            </h2>
            
            {walletData && (
              <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${
                isProfitable 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isProfitable ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">
                  {formatPercent(walletData.summary.totalPnlRoi)}
                </span>
              </div>
            )}
          </div>

          {/* Address & Actions */}
          <div className="flex items-center gap-2">
            <code className="text-sm text-zinc-400 font-mono bg-zinc-800/50 px-3 py-1 rounded">
              {wallet?.address 
                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                : 'Unknown'}
            </code>
            
            <button
              onClick={onCopyAddress}
              className="p-1.5 rounded bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-200"
              title="Copy address"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            <button
              onClick={onOpenExplorer}
              className="p-1.5 rounded bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-200"
              title="View on explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Stats */}
          {walletData && (
            <div className="flex items-center gap-6 mt-3 text-sm">
              <div>
                <span className="text-zinc-500">Total Value: </span>
                <span className="text-zinc-200 font-semibold">
                  {formatUSD(walletData.summary.nativeTokenBalanceUsd)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">7d PnL: </span>
                <span className={`font-semibold ${
                  isProfitable ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatUSD(totalPnL)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Win Rate: </span>
                <span className="text-zinc-200 font-semibold">
                  {walletData.summary.totalWinRate}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB NAVIGATION COMPONENT
// ============================================================================

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'holdings', label: 'Holdings' },
    { id: 'history', label: 'History' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div className="flex border-b border-zinc-700/50 bg-zinc-800/30">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 px-6 py-3 text-sm font-medium transition-all
            ${activeTab === tab.id
              ? 'text-blue-400 border-b-2 border-blue-400 bg-zinc-800/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// TAB CONTENT COMPONENT
// ============================================================================

interface TabContentProps {
  activeTab: TabType;
  walletData: OKXWalletData;
}

function TabContent({ activeTab, walletData }: TabContentProps) {
  switch (activeTab) {
    case 'overview':
      return <OverviewTab walletData={walletData} />;
    case 'holdings':
      return <HoldingsTab walletData={walletData} />;
    case 'history':
      return <HistoryTab walletData={walletData} />;
    case 'analytics':
      return <AnalyticsTab walletData={walletData} />;
    default:
      return null;
  }
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ walletData }: { walletData: OKXWalletData }) {
  return (
    <div className="space-y-6">
      {/* Row 1: Balances, PnL, Win Rate, Trading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalancesCard summary={walletData.summary} />
        <PnLCard summary={walletData.summary} />
        <WinRateCard summary={walletData.summary} />
        <TradingStatsCard summary={walletData.summary} />
      </div>

      {/* Row 2: Market Cap & Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MarketCapCard summary={walletData.summary} />
        <QualityMetricsCard tokenList={walletData.tokenList} />
      </div>

      {/* Row 3: Token Analytics Table */}
      <TokenAnalyticsTable tokens={walletData.tokenList} maxRows={20} />

      {/* Row 4: Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WinRateBucketsChart tokens={walletData.tokenList} />
        <BuySellTimelineChart 
          walletAddress={walletData.address} 
          tokens={walletData.tokenList}
          chainId={walletData.chainId}
        />
      </div>
    </div>
  );
}

// ============================================================================
// HOLDINGS TAB - Current Positions
// ============================================================================

function HoldingsTab({ walletData }: { walletData: OKXWalletData }) {
  const [sortField, setSortField] = useState<'symbol' | 'balance' | 'value' | 'pnl' | 'holdTime'>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter to only tokens with current balance
  const holdings = walletData.tokenList.filter(token => parseFloat(token.balance || '0') > 0);

  // Sort holdings
  const sortedHoldings = [...holdings].sort((a, b) => {
    let aValue: number, bValue: number;

    switch (sortField) {
      case 'symbol':
        return sortDirection === 'asc'
          ? a.tokenSymbol.localeCompare(b.tokenSymbol)
          : b.tokenSymbol.localeCompare(a.tokenSymbol);
      case 'balance':
        aValue = parseFloat(a.balance || '0');
        bValue = parseFloat(b.balance || '0');
        break;
      case 'value':
        aValue = parseFloat(a.balanceUsd || '0');
        bValue = parseFloat(b.balanceUsd || '0');
        break;
      case 'pnl':
        aValue = parseFloat(a.unrealizedPnl || '0');
        bValue = parseFloat(b.unrealizedPnl || '0');
        break;
      case 'holdTime':
        aValue = a.holdingTime || 0;
        bValue = b.holdingTime || 0;
        break;
      default:
        return 0;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalHoldingValue = holdings.reduce((sum, token) => 
    sum + parseFloat(token.balanceUsd || '0'), 0
  );

  const totalUnrealizedPnL = holdings.reduce((sum, token) => 
    sum + parseFloat(token.unrealizedPnl || '0'), 0
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Total Holdings</p>
          <p className="text-2xl font-bold text-zinc-100">{holdings.length}</p>
          <p className="text-xs text-zinc-500 mt-1">tokens</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-zinc-100">{formatUSD(totalHoldingValue)}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Unrealized PnL</p>
          <p className={`text-2xl font-bold ${
            totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatUSD(totalUnrealizedPnL)}
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-900/50">
            <tr className="text-xs text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">
                <button onClick={() => handleSort('symbol')} className="hover:text-zinc-200">
                  Token
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('balance')} className="hover:text-zinc-200">
                  Balance
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('value')} className="hover:text-zinc-200">
                  Value
                </button>
              </th>
              <th className="px-6 py-3 text-right">Avg Buy Price</th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('pnl')} className="hover:text-zinc-200">
                  Unrealized PnL
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('holdTime')} className="hover:text-zinc-200">
                  Hold Time
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/30">
            {sortedHoldings.map((token) => {
              const balance = parseFloat(token.balance || '0');
              const value = parseFloat(token.balanceUsd || '0');
              const unrealizedPnL = parseFloat(token.unrealizedPnl || '0');
              const avgBuyPrice = parseFloat(token.buyAvgPrice || '0');
              const holdTimeDays = Math.floor((token.holdingTime || 0) / 86400);

              return (
                <tr key={token.tokenAddress} className="hover:bg-zinc-800/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">{token.tokenSymbol}</span>
                      <span className="text-xs text-zinc-500 truncate max-w-[100px]">{token.tokenName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-300">{formatNumber(balance)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-medium text-zinc-200">{formatUSD(value)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-400">{formatUSD(avgBuyPrice)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`text-sm font-semibold ${
                      unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatUSD(unrealizedPnL)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-400">
                      {holdTimeDays > 0 ? `${holdTimeDays}d` : '<1d'}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// HISTORY TAB - Completed Trades
// ============================================================================

function HistoryTab({ walletData }: { walletData: OKXWalletData }) {
  const [sortField, setSortField] = useState<'symbol' | 'buyVol' | 'sellVol' | 'pnl' | 'roi'>('pnl');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter to only tokens that have been sold (completed trades)
  const completedTrades = walletData.tokenList.filter(token => token.totalTxSell > 0);

  // Sort completed trades
  const sortedTrades = [...completedTrades].sort((a, b) => {
    let aValue: number, bValue: number;

    switch (sortField) {
      case 'symbol':
        return sortDirection === 'asc'
          ? a.tokenSymbol.localeCompare(b.tokenSymbol)
          : b.tokenSymbol.localeCompare(a.tokenSymbol);
      case 'buyVol':
        aValue = parseFloat(a.buyVolume || '0');
        bValue = parseFloat(b.buyVolume || '0');
        break;
      case 'sellVol':
        aValue = parseFloat(a.sellVolume || '0');
        bValue = parseFloat(b.sellVolume || '0');
        break;
      case 'pnl':
        aValue = parseFloat(a.realizedPnl || '0');
        bValue = parseFloat(b.realizedPnl || '0');
        break;
      case 'roi':
        aValue = parseFloat(a.totalPnlPercentage || '0');
        bValue = parseFloat(b.totalPnlPercentage || '0');
        break;
      default:
        return 0;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalRealizedPnL = completedTrades.reduce((sum, token) => 
    sum + parseFloat(token.realizedPnl || '0'), 0
  );

  const profitableTrades = completedTrades.filter(token => 
    parseFloat(token.realizedPnl || '0') > 0
  ).length;

  const winRate = completedTrades.length > 0 
    ? (profitableTrades / completedTrades.length) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Completed Trades</p>
          <p className="text-2xl font-bold text-zinc-100">{completedTrades.length}</p>
          <p className="text-xs text-zinc-500 mt-1">tokens traded</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Realized PnL</p>
          <p className={`text-2xl font-bold ${
            totalRealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatUSD(totalRealizedPnL)}
          </p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-blue-400">{winRate.toFixed(1)}%</p>
          <p className="text-xs text-zinc-500 mt-1">{profitableTrades} winners</p>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-900/50">
            <tr className="text-xs text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">
                <button onClick={() => handleSort('symbol')} className="hover:text-zinc-200">
                  Token
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('buyVol')} className="hover:text-zinc-200">
                  Buy Volume
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('sellVol')} className="hover:text-zinc-200">
                  Sell Volume
                </button>
              </th>
              <th className="px-6 py-3 text-right">Avg Buy</th>
              <th className="px-6 py-3 text-right">Avg Sell</th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('pnl')} className="hover:text-zinc-200">
                  Realized PnL
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button onClick={() => handleSort('roi')} className="hover:text-zinc-200">
                  ROI
                </button>
              </th>
              <th className="px-6 py-3 text-center">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/30">
            {sortedTrades.map((token) => {
              const buyVolume = parseFloat(token.buyVolume || '0');
              const sellVolume = parseFloat(token.sellVolume || '0');
              const avgBuyPrice = parseFloat(token.buyAvgPrice || '0');
              const avgSellPrice = parseFloat(token.sellAvgPrice || '0');
              const realizedPnL = parseFloat(token.realizedPnl || '0');
              const roi = parseFloat(token.totalPnlPercentage || '0');
              const totalTrades = token.totalTxBuy + token.totalTxSell;

              return (
                <tr key={token.tokenAddress} className="hover:bg-zinc-800/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">{token.tokenSymbol}</span>
                      <span className="text-xs text-zinc-500 truncate max-w-[100px]">{token.tokenName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-300">{formatUSD(buyVolume)}</p>
                    <p className="text-xs text-zinc-500">{token.totalTxBuy} buys</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-300">{formatUSD(sellVolume)}</p>
                    <p className="text-xs text-zinc-500">{token.totalTxSell} sells</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-400">{formatUSD(avgBuyPrice)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-400">{formatUSD(avgSellPrice)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`text-sm font-semibold ${
                      realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatUSD(realizedPnL)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`text-sm font-semibold ${
                      roi >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercent(roi)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm text-zinc-400">{totalTrades}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// ANALYTICS TAB - Advanced Charts
// ============================================================================

function AnalyticsTab({ walletData }: { walletData: OKXWalletData }) {
  // Prepare data for charts
  const topPerformers = [...walletData.tokenList]
    .sort((a, b) => parseFloat(b.totalPnlPercentage || '0') - parseFloat(a.totalPnlPercentage || '0'))
    .slice(0, 5);

  const worstPerformers = [...walletData.tokenList]
    .sort((a, b) => parseFloat(a.totalPnlPercentage || '0') - parseFloat(b.totalPnlPercentage || '0'))
    .slice(0, 5);

  // Market cap distribution data
  const mcapData = (walletData.summary.mcapTxsBuyList || []).map((count, index) => ({
    name: ['<$100k', '$100k-$1M', '$1M-$10M', '$10M-$100M', '>$100M'][index],
    value: count
  }));

  return (
    <div className="space-y-6">
      {/* PnL Trend Chart */}
      <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700/50">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">7-Day PnL Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={walletData.summary.datePnlList || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis 
                dataKey="timestamp"
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                stroke="#a1a1aa"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tickFormatter={(value) => formatUSD(value)}
                stroke="#a1a1aa"
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: any) => [formatUSD(value), 'PnL']}
                labelFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }}
                contentStyle={{ 
                  backgroundColor: '#27272a', 
                  border: '1px solid #3f3f46',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top & Worst Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700/50">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {topPerformers.map((token, index) => {
              const roi = parseFloat(token.totalPnlPercentage || '0');
              const pnl = parseFloat(token.totalPnl || '0');
              return (
                <div key={token.tokenAddress} className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-200">{token.tokenSymbol}</p>
                    <p className="text-xs text-zinc-500 truncate">{token.tokenName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">{formatPercent(roi)}</p>
                    <p className="text-xs text-zinc-500">{formatUSD(pnl)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Worst Performers */}
        <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700/50">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            Worst Performers
          </h3>
          <div className="space-y-3">
            {worstPerformers.map((token, index) => {
              const roi = parseFloat(token.totalPnlPercentage || '0');
              const pnl = parseFloat(token.totalPnl || '0');
              return (
                <div key={token.tokenAddress} className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-200">{token.tokenSymbol}</p>
                    <p className="text-xs text-zinc-500 truncate">{token.tokenName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">{formatPercent(roi)}</p>
                    <p className="text-xs text-zinc-500">{formatUSD(pnl)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Market Cap Preference Pie Chart */}
      <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700/50">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Market Cap Preference Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={mcapData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {mcapData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#ef4444'][index % 5]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name) => [value, 'Buys']}
                contentStyle={{ 
                  backgroundColor: '#27272a', 
                  border: '1px solid #3f3f46',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-zinc-400 text-sm">Loading wallet data...</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <X className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">Failed to Load Data</h3>
      <p className="text-zinc-400 text-sm mb-4 max-w-md text-center">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
