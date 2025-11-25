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
  winRateMin: number;
  winRateMax: number;
  mevMax: number; // Max same-block buy/sell ratio (MEV filter)
  sellRatioMin: number; // Min sell ratio (sell_count/buy_count * 100) - filters serial buyers
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
  holdTimeMax: 10080, // 7 days in minutes (was 168 hours)
  rugPullMax: 10,
  winRateMin: 0,
  winRateMax: 100,
  mevMax: 5, // Default: exclude wallets with >5% same-block transactions
  sellRatioMin: 30, // Default: exclude wallets selling <30% of buys (serial buyers)
};

const DEFAULT_ADVANCED_FILTERS: AdvancedFilterValues = {
  pnlMin: 50,
  pnlMax: 100000,
  roiMin: 0,
  roiMax: 100000000,
  tokensMin: 0,
  tokensMax: 1000,
  holdTimeMin: 0,
  holdTimeMax: 10080, // 7 days in minutes
  rugPullMax: 10,
  winRateMin: 0,
  winRateMax: 100,
  mevMax: 5,
  sellRatioMin: 30,
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
            Filter wallets by rug exposure, MEV activity, win rate, PnL, and more
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* === SECTION 1: RISK FILTERS (First Wave Elimination) === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Risk Filters (First Wave)
            </h3>
            
            {/* Rug Pull Filter - MOVED TO TOP */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-red-500">
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

            {/* MEV Filter - NEW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-orange-500">
                  Max Same-Block TX % (MEV)
                </label>
                <span className="text-xs text-muted-foreground">
                  {filters.mevMax}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[filters.mevMax]}
                  onValueChange={([value]) => updateFilter('mevMax', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={filters.mevMax}
                  onChange={(e) => updateFilter('mevMax', parseFloat(e.target.value))}
                  className="w-24"
                  placeholder="Max %"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Excludes wallets that buy/sell in the same block (MEV bots)
              </p>
            </div>

            {/* Sell Ratio Filter - NEW - Filters serial buyers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-purple-500">
                  Min Sell Ratio % (Serial Buyers)
                </label>
                <span className="text-xs text-muted-foreground">
                  {filters.sellRatioMin}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[filters.sellRatioMin]}
                  onValueChange={([value]) => updateFilter('sellRatioMin', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={filters.sellRatioMin}
                  onChange={(e) => updateFilter('sellRatioMin', parseFloat(e.target.value))}
                  className="w-24"
                  placeholder="Min %"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Excludes wallets that don't sell enough (serial buyers: buy many tokens, sell few)
              </p>
            </div>
          </div>

          {/* === SECTION 2: PERFORMANCE FILTERS === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Performance Filters
            </h3>

            {/* Win Rate Filter */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Win Rate (%)</label>
                <span className="text-xs text-muted-foreground">
                  {filters.winRateMin.toFixed(1)}% - {filters.winRateMax.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={filters.winRateMin}
                  onChange={(e) => updateFilter('winRateMin', parseFloat(e.target.value))}
                  className="w-24"
                  placeholder="Min %"
                />
                <Slider
                  value={[filters.winRateMin, filters.winRateMax]}
                  onValueChange={([min, max]) => {
                    updateFilter('winRateMin', min);
                    updateFilter('winRateMax', max);
                  }}
                  min={0}
                  max={100}
                  step={0.1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={filters.winRateMax}
                  onChange={(e) => updateFilter('winRateMax', parseFloat(e.target.value))}
                  className="w-24"
                  placeholder="Max %"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Filter by wallet win rate (% of trades that were profitable)
              </p>
            </div>

            {/* PnL Filter */}
            <div className="space-y-2 mb-4">
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
          </div>

          {/* === SECTION 3: ACTIVITY FILTERS === */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Activity Filters
            </h3>

            {/* Unique Tokens Filter */}
            <div className="space-y-2 mb-4">
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

            {/* Hold Time Filter - Updated to minutes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Avg Hold Time (minutes)</label>
                <span className="text-xs text-muted-foreground">
                  {filters.holdTimeMin < 60 ? `${filters.holdTimeMin}m` : `${(filters.holdTimeMin / 60).toFixed(1)}h`} - {filters.holdTimeMax < 60 ? `${filters.holdTimeMax}m` : filters.holdTimeMax < 1440 ? `${(filters.holdTimeMax / 60).toFixed(1)}h` : `${(filters.holdTimeMax / 1440).toFixed(1)}d`}
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
                  max={10080}
                  step={5}
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
              <p className="text-xs text-muted-foreground">
                Filter by average hold time (1440 min = 1 day, 10080 min = 7 days)
              </p>
            </div>
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
