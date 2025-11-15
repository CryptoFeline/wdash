'use client';

import { useState, useMemo } from 'react';
import { ReconstructedTrade } from '@/types/wallet';
import { formatUSD, formatPercent } from '@/lib/okx-api-v2';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface PerformanceTableProps {
  trades: ReconstructedTrade[];
}

type SortField = 'symbol' | 'pnl' | 'roi' | 'holding';
type SortDirection = 'asc' | 'desc';

export default function PerformanceTable({ trades }: PerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('pnl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'symbol':
          aValue = a.token_symbol;
          bValue = b.token_symbol;
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        case 'pnl':
          aValue = a.realized_pnl;
          bValue = b.realized_pnl;
          break;
        case 'roi':
          aValue = a.realized_roi;
          bValue = b.realized_roi;
          break;
        case 'holding':
          aValue = a.holding_hours;
          bValue = b.holding_hours;
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });
  }, [trades, sortField, sortDirection]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTrades = sorted.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-muted-foreground">/</span>;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr className="text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('symbol')}
                  className="flex items-center gap-2 hover:text-foreground"
                >
                  Token
                  <SortIndicator field="symbol" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('holding')}
                  className="flex items-center justify-end gap-2 hover:text-foreground"
                >
                  Hold Time
                  <SortIndicator field="holding" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('roi')}
                  className="flex items-center justify-end gap-2 hover:text-foreground"
                >
                  ROI %
                  <SortIndicator field="roi" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('pnl')}
                  className="flex items-center justify-end gap-2 hover:text-foreground"
                >
                  Realized PnL
                  <SortIndicator field="pnl" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">Entry Price</th>
              <th className="px-6 py-3 text-right">Exit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTrades.map((trade) => (
              <tr
                key={trade.trade_id}
                className="hover:bg-secondary/20 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {trade.logoUrl && (
                      <img
                        src={trade.logoUrl}
                        alt={trade.token_symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {trade.token_symbol}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {trade.token_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="text-sm text-foreground">
                    {trade.holding_hours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({trade.holding_days.toFixed(2)}d)
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-semibold ${
                    trade.realized_roi >= 0 ? 'text-chart-4' : 'text-destructive'
                  }`}>
                    {trade.realized_roi >= 0 ? '+' : ''}{formatPercent(trade.realized_roi)}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-semibold ${
                    trade.realized_pnl >= 0 ? 'text-chart-4' : 'text-destructive'
                  }`}>
                    {formatUSD(trade.realized_pnl)}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="text-sm text-muted-foreground">
                    {formatUSD(trade.entry_price)}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="text-sm text-muted-foreground">
                    {formatUSD(trade.exit_price)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, sorted.length)} of {sorted.length} trades
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-input transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-input transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {trades.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trades to display</p>
        </div>
      )}
    </div>
  );
}
