'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, TrendingUp, TrendingDown, Wallet, BarChart3, Activity } from 'lucide-react';
import { fetchWalletData, calculateWalletMetrics, formatUSD, formatPercent, type OKXWalletData } from '@/lib/okx-api';

interface WalletDetailModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  walletData?: {
    twitter_username?: string;
    twitter_name?: string;
    avatar?: string;
  };
}

type TabType = 'overview' | 'holdings' | 'history' | 'analytics';

export default function WalletDetailModalEnhanced({
  isOpen,
  onClose,
  walletAddress,
  walletData
}: WalletDetailModalEnhancedProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [okxData, setOkxData] = useState<OKXWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchData();
    }
  }, [isOpen, walletAddress]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWalletData(walletAddress);
      setOkxData(data);
    } catch (err) {
      console.error('Error fetching OKX data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    // Could add a toast notification here
  };

  if (!isOpen) return null;

  const metrics = okxData ? calculateWalletMetrics(okxData) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gray-900 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            {walletData?.avatar && (
              <img
                src={walletData.avatar}
                alt={walletData.twitter_name || 'Wallet'}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {walletData?.twitter_name || 'Wallet Details'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm text-gray-400">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-1 hover:bg-gray-800 rounded transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
                <a
                  href={`https://solscan.io/account/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-gray-800 rounded transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'overview'
                ? 'text-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </div>
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('holdings')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'holdings'
                ? 'text-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Holdings
            </div>
            {activeTab === 'holdings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'history'
                ? 'text-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              History
            </div>
            {activeTab === 'history' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'analytics'
                ? 'text-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </div>
            {activeTab === 'analytics' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading wallet data...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchData}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && okxData && metrics && (
            <>
              {activeTab === 'overview' && (
                <OverviewTab data={okxData} metrics={metrics} />
              )}
              {activeTab === 'holdings' && (
                <HoldingsTab holdings={okxData.holdings} />
              )}
              {activeTab === 'history' && (
                <HistoryTab trades={okxData.historicalTrades} />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsTab data={okxData} metrics={metrics} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data, metrics }: { data: OKXWalletData; metrics: any }) {
  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Total Value</div>
          <div className="text-2xl font-bold text-white">{formatUSD(metrics.totalValue)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Portfolio + Native: {formatUSD(metrics.totalPortfolioValue)} + {formatUSD(metrics.nativeTokenBalance)}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Total PnL (7d)</div>
          <div className={`text-2xl font-bold ${parseFloat(summary.totalPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatUSD(summary.totalPnl)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ROI: {formatPercent(summary.totalPnlRoi)}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-white">{summary.totalWinRate}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.totalTxsBuy + summary.totalTxsSell} trades
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Holdings</div>
          <div className="text-2xl font-bold text-white">{metrics.tokenCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.tradedTokenCount} traded & sold
          </div>
        </div>
      </div>

      {/* Top Tokens */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Top Performing Tokens</h3>
        <div className="space-y-3">
          {summary.topTokens.map((token, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <div>
                <div className="font-medium text-white">{token.tokenSymbol}</div>
                <div className="text-sm text-gray-400">{token.tokenAddress.slice(0, 8)}...</div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${parseFloat(token.pnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatUSD(token.pnl)}
                </div>
                <div className="text-sm text-gray-400">{formatPercent(token.roi)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily PnL Chart */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">7-Day PnL Trend</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {summary.datePnlList.map((day, index) => {
            const profit = parseFloat(day.profit);
            const maxProfit = Math.max(...summary.datePnlList.map(d => Math.abs(parseFloat(d.profit))));
            const height = (Math.abs(profit) / maxProfit) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end">
                <div
                  className={`w-full rounded-t ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${formatUSD(profit)} on ${new Date(day.timestamp * 1000).toLocaleDateString()}`}
                />
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(day.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Holdings Tab Component
function HoldingsTab({ holdings }: { holdings: any[] }) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Token</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Balance</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Value (USD)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">PnL</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">ROI</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {holdings.map((token, index) => (
              <tr key={index} className="hover:bg-gray-900/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {token.logoUrl && (
                      <img src={token.logoUrl} alt={token.tokenSymbol} className="w-6 h-6 rounded-full" />
                    )}
                    <div>
                      <div className="font-medium text-white">{token.tokenSymbol}</div>
                      <div className="text-xs text-gray-500">{token.tokenName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-white">{parseFloat(token.balance).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-sm text-white">{formatUSD(token.balanceUsd)}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${parseFloat(token.totalPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatUSD(token.totalPnl)}
                </td>
                <td className={`px-4 py-3 text-right text-sm ${parseFloat(token.totalPnlPercentage) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercent(token.totalPnlPercentage)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    token.riskLevel === 1 ? 'bg-green-900/50 text-green-400' :
                    token.riskLevel === 2 ? 'bg-blue-900/50 text-blue-400' :
                    token.riskLevel === 3 ? 'bg-yellow-900/50 text-yellow-400' :
                    token.riskLevel === 4 ? 'bg-orange-900/50 text-orange-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    L{token.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// History Tab Component
function HistoryTab({ trades }: { trades: any[] }) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Token</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Buy Vol</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Sell Vol</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Realized PnL</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">ROI</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Trades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {trades.map((token, index) => (
              <tr key={index} className="hover:bg-gray-900/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {token.logoUrl && (
                      <img src={token.logoUrl} alt={token.tokenSymbol} className="w-6 h-6 rounded-full" />
                    )}
                    <div>
                      <div className="font-medium text-white">{token.tokenSymbol}</div>
                      <div className="text-xs text-gray-500">{token.tokenName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-green-400">{formatUSD(token.buyVolume)}</td>
                <td className="px-4 py-3 text-right text-sm text-red-400">{formatUSD(token.sellVolume)}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${parseFloat(token.realizedPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatUSD(token.realizedPnl)}
                </td>
                <td className={`px-4 py-3 text-right text-sm ${parseFloat(token.totalPnlPercentage) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercent(token.totalPnlPercentage)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-400">
                  {token.totalTxBuy}B / {token.totalTxSell}S
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Analytics Tab Component  
function AnalyticsTab({ data, metrics }: { data: OKXWalletData; metrics: any }) {
  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Win Rate Distribution */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Win Rate Distribution</h3>
        <div className="space-y-3">
          {summary.newWinRateDistribution.map((count, index) => {
            const labels = ['>500% ROI', '0-500% ROI', '-50%-0%', '<-50%'];
            const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500'];
            const total = summary.newWinRateDistribution.reduce((sum, c) => sum + c, 0);
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
            
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{labels[index]}</span>
                  <span className="text-sm text-gray-400">{count} trades ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colors[index]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Market Cap Preference */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Market Cap Preference</h3>
        <div className="space-y-3">
          {summary.mcapTxsBuyList.map((count, index) => {
            const labels = ['<$100k', '$100k-$1M', '$1M-$10M', '$10M-$100M', '>$100M'];
            const total = summary.mcapTxsBuyList.reduce((sum, c) => sum + c, 0);
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
            
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{labels[index]}</span>
                  <span className="text-sm text-gray-400">{count} buys ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-purple-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Avg Hold Time</div>
          <div className="text-xl font-bold text-white">{metrics.avgHoldingTime.toFixed(1)}h</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Profit Factor</div>
          <div className="text-xl font-bold text-white">{metrics.profitFactor.toFixed(2)}x</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Avg Buy Size</div>
          <div className="text-xl font-bold text-white">{formatUSD(summary.avgCostBuy)}</div>
        </div>
      </div>
    </div>
  );
}
