'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Image from 'next/image';
import { formatUSD, formatPercent, formatNumber, type OKXTokenData } from '@/lib/okx-api-v2';

// ============================================================================
// TOKEN ANALYTICS TABLE COMPONENT
// ============================================================================

type SortField = 'symbol' | 'pnl' | 'roi' | 'buyVolume' | 'sellVolume' | 'holdTime' | 'trades';
type SortDirection = 'asc' | 'desc';

interface TokenAnalyticsTableProps {
  tokens: OKXTokenData[];
  maxRows?: number;
}

export function TokenAnalyticsTable({ tokens, maxRows = 20 }: TokenAnalyticsTableProps) {
  const [sortField, setSortField] = useState<SortField>('pnl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAll, setShowAll] = useState(false);

  // Sort tokens
  const sortedTokens = useMemo(() => {
    const sorted = [...tokens].sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortField) {
        case 'symbol':
          return sortDirection === 'asc'
            ? a.tokenSymbol.localeCompare(b.tokenSymbol)
            : b.tokenSymbol.localeCompare(a.tokenSymbol);
        
        case 'pnl':
          aValue = parseFloat(a.totalPnl || '0');
          bValue = parseFloat(b.totalPnl || '0');
          break;
        
        case 'roi':
          aValue = parseFloat(a.totalPnlPercentage || '0');
          bValue = parseFloat(b.totalPnlPercentage || '0');
          break;
        
        case 'buyVolume':
          aValue = parseFloat(a.buyVolume || '0');
          bValue = parseFloat(b.buyVolume || '0');
          break;
        
        case 'sellVolume':
          aValue = parseFloat(a.sellVolume || '0');
          bValue = parseFloat(b.sellVolume || '0');
          break;
        
        case 'holdTime':
          aValue = a.holdingTime || 0;
          bValue = b.holdingTime || 0;
          break;
        
        case 'trades':
          aValue = a.totalTxBuy + a.totalTxSell;
          bValue = b.totalTxBuy + b.totalTxSell;
          break;
        
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [tokens, sortField, sortDirection]);

  // Display tokens (limit or show all)
  const displayTokens = showAll ? sortedTokens : sortedTokens.slice(0, maxRows);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-600" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl border border-zinc-700/50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Token Analytics</h3>
          <div className="text-sm text-zinc-400">
            {displayTokens.length} of {tokens.length} tokens
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-900/50">
            <tr className="text-xs text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left font-medium">
                <button
                  onClick={() => handleSort('symbol')}
                  className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
                >
                  Token
                  <SortIcon field="symbol" />
                </button>
              </th>
              <th className="px-6 py-3 text-right font-medium">
                <button
                  onClick={() => handleSort('pnl')}
                  className="flex items-center gap-1 ml-auto hover:text-zinc-200 transition-colors"
                >
                  PnL
                  <SortIcon field="pnl" />
                </button>
              </th>
              <th className="px-6 py-3 text-right font-medium">
                <button
                  onClick={() => handleSort('roi')}
                  className="flex items-center gap-1 ml-auto hover:text-zinc-200 transition-colors"
                >
                  ROI
                  <SortIcon field="roi" />
                </button>
              </th>
              <th className="px-6 py-3 text-right font-medium">
                <button
                  onClick={() => handleSort('buyVolume')}
                  className="flex items-center gap-1 ml-auto hover:text-zinc-200 transition-colors"
                >
                  Buy Vol.
                  <SortIcon field="buyVolume" />
                </button>
              </th>
              <th className="px-6 py-3 text-right font-medium">
                <button
                  onClick={() => handleSort('sellVolume')}
                  className="flex items-center gap-1 ml-auto hover:text-zinc-200 transition-colors"
                >
                  Sell Vol.
                  <SortIcon field="sellVolume" />
                </button>
              </th>
              <th className="px-6 py-3 text-right font-medium">
                <button
                  onClick={() => handleSort('trades')}
                  className="flex items-center gap-1 ml-auto hover:text-zinc-200 transition-colors"
                >
                  Trades
                  <SortIcon field="trades" />
                </button>
              </th>
              <th className="px-6 py-3 text-center font-medium">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/30">
            {displayTokens.map((token) => {
              const pnl = parseFloat(token.totalPnl || '0');
              const roi = parseFloat(token.totalPnlPercentage || '0');
              const isProfitable = pnl >= 0;
              const totalTrades = token.totalTxBuy + token.totalTxSell;
              const hasBalance = parseFloat(token.balance || '0') > 0;

              // Risk level badge styling
              const getRiskBadge = (level: number) => {
                if (level <= 2) return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'LOW' };
                if (level <= 3) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'MED' };
                return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'HIGH' };
              };

              const riskBadge = getRiskBadge(token.riskLevel || 3);

              return (
                <tr 
                  key={token.tokenAddress}
                  className="hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Token */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Logo */}
                      <div className="relative w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {token.logoUrl ? (
                          <Image 
                            src={token.logoUrl}
                            alt={token.tokenSymbol}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-zinc-400">
                            {token.tokenSymbol[0]}
                          </span>
                        )}
                      </div>

                      {/* Symbol & Name */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-200 truncate">
                            {token.tokenSymbol}
                          </p>
                          {hasBalance && (
                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">
                              HOLDING
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 truncate max-w-[150px]">
                          {token.tokenName}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* PnL */}
                  <td className="px-6 py-4 text-right">
                    <p className={`text-sm font-semibold ${
                      isProfitable ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatUSD(pnl)}
                    </p>
                    {hasBalance && (
                      <p className="text-xs text-zinc-500">
                        Holding: {formatUSD(token.balanceUsd)}
                      </p>
                    )}
                  </td>

                  {/* ROI */}
                  <td className="px-6 py-4 text-right">
                    <p className={`text-sm font-semibold ${
                      isProfitable ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercent(roi)}
                    </p>
                  </td>

                  {/* Buy Volume */}
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-300">{formatUSD(token.buyVolume)}</p>
                    <p className="text-xs text-zinc-500">{token.totalTxBuy} buys</p>
                  </td>

                  {/* Sell Volume */}
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-zinc-300">{formatUSD(token.sellVolume)}</p>
                    <p className="text-xs text-zinc-500">{token.totalTxSell} sells</p>
                  </td>

                  {/* Total Trades */}
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-medium text-zinc-200">{totalTrades}</p>
                  </td>

                  {/* Risk Level */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${riskBadge.bg} ${riskBadge.text}`}>
                        {riskBadge.label}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show More/Less Button */}
      {tokens.length > maxRows && (
        <div className="px-6 py-4 border-t border-zinc-700/50 bg-zinc-900/30">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showAll ? 'Show Less' : `Show All ${tokens.length} Tokens`}
          </button>
        </div>
      )}
    </div>
  );
}
