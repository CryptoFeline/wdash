'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Filter, X } from 'lucide-react';

export interface AdvancedFilterValues {
  pnlMin: number;
  pnlMax: number;
  roiMin: number;
  roiMax: number;
  tokensMin: number;
  tokensMax: number;
  holdTimeMin: number;
  holdTimeMax: number;
  rugPullMax: number;
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterValues;
  onFiltersChange: (filters: AdvancedFilterValues) => void;
}

const DEFAULT_FILTERS: AdvancedFilterValues = {
  pnlMin: 50,
  pnlMax: 100000, // 100,000% (some wallets have massive gains)
  roiMin: 0,
  roiMax: 100000000, // 100M (realized profit can be huge)
  tokensMin: 0,
  tokensMax: 1000,
  holdTimeMin: 0,
  holdTimeMax: 168, // 7 days in hours
  rugPullMax: 10,
};

const DEFAULT_ADVANCED_FILTERS: AdvancedFilterValues = {
  pnlMin: 50,
  pnlMax: 100000,
  roiMin: 0,
  roiMax: 100000000,
  tokensMin: 0,
  tokensMax: 1000,
  holdTimeMin: 0,
  holdTimeMax: 168,
  rugPullMax: 10,
};

export function AdvancedFilters({
  filters,
  onFiltersChange,
}: AdvancedFiltersProps) {
  const handleReset = () => {
    onFiltersChange(DEFAULT_ADVANCED_FILTERS);
  };

  const updateFilter = (key: keyof AdvancedFilterValues, value: number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Filter wallets by PnL, ROI, tokens traded, hold time, and rug pull exposure
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* PnL Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">PnL %</label>
              <span className="text-xs text-muted-foreground">
                {filters.pnlMin}% - {filters.pnlMax}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={filters.pnlMin}
                onChange={(e) => updateFilter('pnlMin', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Min"
              />
              <Slider
                value={[filters.pnlMin, filters.pnlMax]}
                onValueChange={([min, max]) => {
                  updateFilter('pnlMin', min);
                  updateFilter('pnlMax', max);
                }}
                min={-100}
                max={100000}
                step={100}
                className="flex-1"
              />
              <Input
                type="number"
                value={filters.pnlMax}
                onChange={(e) => updateFilter('pnlMax', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Profit $ Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Profit 7d ($)</label>
              <span className="text-xs text-muted-foreground">
                ${filters.roiMin.toLocaleString()} - ${filters.roiMax.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={filters.roiMin}
                onChange={(e) => updateFilter('roiMin', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Min"
              />
              <Slider
                value={[filters.roiMin, filters.roiMax]}
                onValueChange={([min, max]) => {
                  updateFilter('roiMin', min);
                  updateFilter('roiMax', max);
                }}
                min={0}
                max={100000000}
                step={100000}
                className="flex-1"
              />
              <Input
                type="number"
                value={filters.roiMax}
                onChange={(e) => updateFilter('roiMax', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Unique Tokens Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Unique Tokens Traded</label>
              <span className="text-xs text-muted-foreground">
                {filters.tokensMin} - {filters.tokensMax}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={filters.tokensMin}
                onChange={(e) => updateFilter('tokensMin', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Min"
              />
              <Slider
                value={[filters.tokensMin, filters.tokensMax]}
                onValueChange={([min, max]) => {
                  updateFilter('tokensMin', min);
                  updateFilter('tokensMax', max);
                }}
                min={0}
                max={1000}
                step={10}
                className="flex-1"
              />
              <Input
                type="number"
                value={filters.tokensMax}
                onChange={(e) => updateFilter('tokensMax', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Hold Time Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Avg Hold Time (hours)</label>
              <span className="text-xs text-muted-foreground">
                {filters.holdTimeMin}h - {filters.holdTimeMax}h
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={filters.holdTimeMin}
                onChange={(e) => updateFilter('holdTimeMin', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Min"
              />
              <Slider
                value={[filters.holdTimeMin, filters.holdTimeMax]}
                onValueChange={([min, max]) => {
                  updateFilter('holdTimeMin', min);
                  updateFilter('holdTimeMax', max);
                }}
                min={0}
                max={168}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={filters.holdTimeMax}
                onChange={(e) => updateFilter('holdTimeMax', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Rug Pull Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Max Rug Pull Exposure %
              </label>
              <span className="text-xs text-muted-foreground">
                {filters.rugPullMax}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[filters.rugPullMax]}
                onValueChange={([value]) => updateFilter('rugPullMax', value)}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <Input
                type="number"
                value={filters.rugPullMax}
                onChange={(e) => updateFilter('rugPullMax', parseFloat(e.target.value))}
                className="w-24"
                placeholder="Max %"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Excludes wallets with liquidity pulled from more than this % of trades
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Reset Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
