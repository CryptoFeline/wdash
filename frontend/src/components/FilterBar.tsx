'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { AdvancedFilters, AdvancedFilterValues } from '@/components/AdvancedFilters';

interface FilterBarProps {
  chain: string;
  timeframe: string;
  tag: string;
  onChainChange: (value: string) => void;
  onTimeframeChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  advancedFilters: AdvancedFilterValues;
  onAdvancedFiltersChange: (filters: AdvancedFilterValues) => void;
}

export default function FilterBar({
  chain,
  timeframe,
  tag,
  onChainChange,
  onTimeframeChange,
  onTagChange,
  onRefresh,
  isLoading,
  advancedFilters,
  onAdvancedFiltersChange,
}: FilterBarProps) {
  const chains = [
    { id: 'eth', name: 'Ethereum' },
    { id: 'sol', name: 'Solana' },
    { id: 'bsc', name: 'BNB Chain' },
    { id: 'arb', name: 'Arbitrum' },
    { id: 'base', name: 'Base' },
  ];

  const timeframes = [
    { id: '1d', name: '24 Hours' },
    { id: '7d', name: '7 Days' },
    { id: '30d', name: '30 Days' },
  ];

  const tags = [
    { id: 'all', name: 'All Wallets' },
    { id: 'smart_degen', name: 'Smart Money' },
    { id: 'pump_smart', name: 'Early Pumpers' },
    { id: 'renowned', name: 'Renowned' },
    { id: 'snipe_bot', name: 'Sniper Bots' },
    { id: 'kol', name: 'KOL/VC' },
    { id: 'fresh_wallet', name: 'Fresh Wallets' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Chain:</label>
        <Select value={chain} onValueChange={onChainChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {chains.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Timeframe:</label>
        <Select value={timeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeframes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Tag:</label>
        <Select value={tag} onValueChange={onTagChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters Modal - Icon only */}
      <AdvancedFilters
        filters={advancedFilters}
        onFiltersChange={onAdvancedFiltersChange}
      />

      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isLoading}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
