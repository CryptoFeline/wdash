'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
} from '@tanstack/react-table';
import { Wallet } from '@/types/wallet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowUpDown,
  Copy,
  ExternalLink,
  Download,
  FileJson,
  Rocket,
  Star
} from 'lucide-react';
import {
  formatNumber,
  formatPercentage,
  formatUSD,
  getPnLColor,
  getRiskInfo,
  truncateAddress,
  copyToClipboard,
} from '@/lib/export';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { WalletDetailsModal } from './WalletDetailsModal';

interface WalletTableProps {
  wallets: Wallet[];
  chain: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export default function WalletTable({
  wallets,
  chain,
  onLoadMore,
  hasMore,
  isLoading,
}: WalletTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'pnl_7d', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedWallet(null);
  };

  // Check if wallet is a good candidate for copy trading
  const isGoodCandidate = (wallet: Wallet) => {
    return (
      wallet.winrate_7d >= 0.7 && 
      wallet.pnl_2x_5x_num_7d_ratio >= 0.3 &&
      wallet.realized_profit_7d > 1000
    );
  };

  /**
   * HOW TO ADD/REMOVE COLUMNS:
   * 
   * Each column is an object in the columns array with these properties:
   * 
   * - accessorKey: The field name from the Wallet type (see src/types/wallet.ts)
   * - id: Optional unique ID (only needed if using same accessorKey twice)
   * - header: Can be a string or a function returning JSX (use function for sortable columns)
   * - cell: Function that returns JSX for rendering the cell value
   * 
   * EXAMPLE - Add a simple column:
   * {
   *   accessorKey: 'balance',
   *   header: 'Balance',
   *   cell: ({ row }) => <span>{row.original.balance}</span>
   * }
   * 
   * EXAMPLE - Add a sortable column:
   * {
   *   accessorKey: 'balance',
   *   header: ({ column }) => (
   *     <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
   *       Balance <ArrowUpDown className="ml-2 h-4 w-4" />
   *     </Button>
   *   ),
   *   cell: ({ row }) => <span>{formatUSD(row.original.balance)}</span>
   * }
   * 
   * To remove a column: Simply delete its object from the columns array
   * To reorder columns: Move the column objects in the array
   */
  const columns: ColumnDef<Wallet>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'rank',
      header: '#',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="font-medium">{row.index + 1}</span>
          {isGoodCandidate(row.original) && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'wallet_address',
      header: 'Wallet',
      cell: ({ row }) => {
        const address = row.original.wallet_address;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {truncateAddress(address)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(address)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() =>
                window.open(
                  `https://gmgn.ai/${chain}/address/${address}`,
                  '_blank'
                )
              }
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'pnl_7d',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            PnL 7d %
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const pnl = row.original.pnl_7d;
        const pnlNum = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
        
        if (pnlNum === null || pnlNum === undefined || isNaN(pnlNum)) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <span className={getPnLColor(pnlNum)}>
            {pnlNum > 0 ? '+' : ''}
            {formatPercentage(pnlNum)}
          </span>
        );
      },
    },
    {
      accessorKey: 'pnl_7d',
      id: 'roi',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            ROI 7d
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const pnl = row.original.pnl_7d;
        const pnlNum = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
        
        if (pnlNum === null || pnlNum === undefined || isNaN(pnlNum)) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        const multiplier = 1 + pnlNum;
        const color = pnlNum > 5 ? 'text-green-600 font-bold' : 
                      pnlNum > 1 ? 'text-green-500' : 
                      pnlNum > 0 ? 'text-yellow-600' : 'text-red-500';
        
        return (
          <span className={color}>
            {multiplier.toFixed(2)}x
          </span>
        );
      },
    },
    {
      accessorKey: 'realized_profit_7d',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Profit 7d
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const profit = row.original.realized_profit_7d;
        const profitNum = typeof profit === 'string' ? parseFloat(profit) : profit;
        
        if (profitNum === null || profitNum === undefined || isNaN(profitNum)) {
          return <span className="text-gray-400">N/A</span>;
        }
        return <span className="font-medium">{formatUSD(profitNum)}</span>;
      },
    },
    {
      accessorKey: 'winrate_7d',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Win Rate
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const winrate = row.original.winrate_7d;
        const winrateNum = typeof winrate === 'string' ? parseFloat(winrate) : winrate;
        
        if (winrateNum === null || winrateNum === undefined || isNaN(winrateNum)) {
          return <span className="text-gray-400">N/A</span>;
        }
        return <span>{formatPercentage(winrateNum)}</span>;
      },
    },
    {
      accessorKey: 'txs',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            TXs
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const { txs, buy, sell } = row.original;
        return (
          <div className="flex flex-col text-sm">
            <span className="font-medium">{formatNumber(txs)}</span>
            <span className="text-xs text-gray-500">
              <span className="text-green-600">{buy}B</span> / <span className="text-red-600">{sell}S</span>
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'avg_holding_period_7d',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Avg Hold
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const holdTime = row.original.avg_holding_period_7d;
        const holdTimeNum = typeof holdTime === 'string' ? parseFloat(holdTime) : holdTime;
        
        if (holdTimeNum === null || holdTimeNum === undefined || isNaN(holdTimeNum)) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        // Convert seconds to hours
        const hours = holdTimeNum / 3600;
        if (hours < 1) {
          return <span className="text-xs">{(hours * 60).toFixed(0)}m</span>;
        } else if (hours < 24) {
          return <span className="text-xs">{hours.toFixed(1)}h</span>;
        } else {
          return <span className="text-xs">{(hours / 24).toFixed(1)}d</span>;
        }
      },
    },
    {
      accessorKey: 'token_num_7d',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Tokens
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const tokens = row.original.token_num_7d;
        const moonshots = row.original.pnl_gt_5x_num_7d;
        
        if (tokens === null || tokens === undefined) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <span>{tokens} /</span>
            {moonshots > 0 && (
              <span className="text-green-600 font-semibold flex items-center gap-1">
                {moonshots}<Rocket className="h-4 w-4" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'balance',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Balance
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const balance = row.original.balance;
        const balanceNum = typeof balance === 'string' ? parseFloat(balance) : balance;
        
        if (balanceNum === null || balanceNum === undefined || isNaN(balanceNum)) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        return <span className="font-medium">{balanceNum.toFixed(4)} SOL</span>;
      },
    },
    {
      accessorKey: 'last_active',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Active
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const lastActive = row.original.last_active;
        
        if (!lastActive) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        const now = Math.floor(Date.now() / 1000);
        const diff = now - lastActive;
        
        if (diff < 3600) {
          const mins = Math.floor(diff / 60);
          return <span className="text-xs text-green-600">{mins}m ago</span>;
        } else if (diff < 86400) {
          const hours = Math.floor(diff / 3600);
          return <span className="text-xs text-yellow-600">{hours}h ago</span>;
        } else {
          const days = Math.floor(diff / 86400);
          return <span className="text-xs text-gray-500">{days}d ago</span>;
        }
      },
    },
    {
      accessorKey: 'follow_count',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Followers
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const followCount = row.original.follow_count;
        
        if (followCount === null || followCount === undefined) {
          return <span className="text-gray-400">0</span>;
        }
        
        return (
          <span className={followCount > 10 ? 'font-semibold text-blue-600' : ''}>
            {formatNumber(followCount)}
          </span>
        );
      },
    },
    {
      accessorKey: 'tag_rank',
      header: 'Tag Rank',
      cell: ({ row }) => {
        const tagRank = row.original.tag_rank;
        const tag = row.original.tag;
        
        if (!tagRank || !tag || !tagRank[tag]) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        const rank = tagRank[tag];
        const isTopRank = rank <= 100;
        
        return (
          <span className={`text-xs font-medium ${isTopRank ? 'text-yellow-600' : 'text-gray-600'}`}>
            #{rank}
          </span>
        );
      },
    },
    {
      id: 'honeypot',
      header: 'Honeypot',
      cell: ({ row }) => {
        const ratio = row.original.risk?.token_honeypot_ratio || 0;
        const color = ratio > 0.3 ? 'text-red-500' : ratio > 0.1 ? 'text-yellow-600' : 'text-green-600';
        return (
          <span className={`font-medium ${color}`}>
            {formatPercentage(ratio * 100)}
          </span>
        );
      },
    },
    {
      id: 'rug_pull',
      header: 'Rug Pull',
      cell: ({ row }) => {
        const ratio = row.original.risk?.sell_pass_buy_ratio || 0;
        const color = ratio > 0.3 ? 'text-red-500' : ratio > 0.1 ? 'text-yellow-600' : 'text-green-600';
        return (
          <span className={`font-medium ${color}`}>
            {formatPercentage(ratio * 100)}
          </span>
        );
      },
    },
    {
      id: 'fast_tx',
      header: 'Fast TX',
      cell: ({ row }) => {
        const ratio = row.original.risk?.fast_tx_ratio || 0;
        const color = ratio > 0.5 ? 'text-red-500' : ratio > 0.2 ? 'text-yellow-600' : 'text-green-600';
        return (
          <span className={`font-medium ${color}`}>
            {formatPercentage(ratio * 100)}
          </span>
        );
      },
    },
    {
      id: 'risk_score',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Risk
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const riskScore =
          (row.original.risk?.token_honeypot_ratio || 0) * 0.4 +
          (row.original.risk?.sell_pass_buy_ratio || 0) * 0.4 +
          (row.original.risk?.fast_tx_ratio || 0) * 0.2;

        const { color, label } = getRiskInfo(riskScore);

        return (
          <Badge className={color} variant="outline">
            {label}
          </Badge>
        );
      },
    },
  ];

  const table = useReactTable({
    data: wallets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  // Get selected wallets
  const selectedWallets = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  const selectedCount = selectedWallets.length;

  return (
    <div className="space-y-4">
      {/* Selection toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted p-4">
          <span className="text-sm font-medium">
            {selectedCount} wallet{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(selectedWallets, 'selected-wallets.csv')}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToJSON(selectedWallets, 'selected-wallets.json')
              }
            >
              <FileJson className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => handleRowClick(row.original)}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    isGoodCandidate(row.original) ? 'bg-green-50 dark:bg-green-950/20' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => {
                      // Prevent row click when clicking on checkbox, buttons, etc.
                      if (cell.column.id === 'select' || 
                          (e.target as HTMLElement).closest('button')) {
                        e.stopPropagation();
                      }
                    }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {isLoading ? 'Loading...' : 'No results.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} disabled={isLoading} variant="outline">
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Wallet Details Modal */}
      <WalletDetailsModal
        wallet={selectedWallet}
        chain={chain}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
