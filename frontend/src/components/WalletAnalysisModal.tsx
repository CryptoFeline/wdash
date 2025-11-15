'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { OKXWalletData } from '@/lib/okx-api-v2';
import { ReconstructedTrade, WalletAnalysisMetrics } from '@/types/wallet';
import { formatUSD, formatPercentage } from '@/lib/export';
import MetricsCards from './analysis/MetricsCards';
import PerformanceTable from './analysis/PerformanceTable';
import MarketCapAnalysis from './analysis/MarketCapAnalysis';

interface WalletAnalysisModalProps {
  wallet: {
    address: string;
    chainId?: string;
    nickname?: string;
    avatarUrl?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  walletData?: OKXWalletData;
}

export default function WalletAnalysisModal({
  wallet,
  isOpen,
  onClose,
  walletData,
}: WalletAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<'trades' | 'entry' | 'exit' | 'market'>('trades');

  // Reconstruct trades from wallet data
  const { trades, metrics } = useMemo(() => {
    if (!walletData?.tokenList) {
      return { trades: [] as ReconstructedTrade[], metrics: null };
    }

    // Reconstruct trades from token list (FIFO matching would require detailed trade history)
    // For MVP, we use per-token aggregates as virtual trades
    const reconstructedTrades: ReconstructedTrade[] = walletData.tokenList
      .filter(token => {
        const totalTx = (token.totalTxBuy || 0) + (token.totalTxSell || 0);
        return totalTx > 0; // Only tokens that were traded
      })
      .map(token => {
        const entryPrice = parseFloat(token.buyAvgPrice || '0');
        const exitPrice = parseFloat(token.sellAvgPrice || '0');
        const quantity = parseFloat(token.balance || '0');
        
        const entryValue = parseFloat(token.buyVolume || '0');
        const exitValue = parseFloat(token.sellVolume || '0');
        
        const realizedPnl = parseFloat(token.realizedPnl || '0');
        const realizedRoi = parseFloat(token.totalPnlPercentage || '0');
        
        const holdingSeconds = token.holdingTime || 0;
        const holdingHours = holdingSeconds / 3600;
        const holdingDays = holdingSeconds / 86400;

        return {
          trade_id: token.tokenAddress,
          token_address: token.tokenAddress,
          token_symbol: token.tokenSymbol,
          token_name: token.tokenName,
          logoUrl: token.logoUrl,
          
          entry_timestamp: 0, // Would need detailed history
          exit_timestamp: token.latestTime || 0,
          entry_price: entryPrice,
          exit_price: exitPrice,
          quantity,
          
          entry_value: entryValue,
          exit_value: exitValue,
          realized_pnl: realizedPnl,
          realized_roi: realizedRoi,
          
          holding_seconds: holdingSeconds,
          holding_hours: holdingHours,
          holding_days: holdingDays,
          
          // These need price history data (Phase 2)
          max_price_during_hold: exitPrice,
          max_potential_roi: realizedRoi,
          time_to_peak_seconds: 0,
          time_to_peak_hours: 0,
          
          win: realizedPnl > 0,
          early_exit: false,
          
          mcap_bracket: 0, // Would need token metadata
          riskLevel: token.riskLevel || 1,
        };
      });

    // Calculate metrics
    const wins = reconstructedTrades.filter(t => t.win);
    const losses = reconstructedTrades.filter(t => !t.win);

    if (reconstructedTrades.length === 0) {
      return { trades: [], metrics: null };
    }

    const rois = reconstructedTrades.map(t => t.realized_roi).sort((a, b) => a - b);
    const holdingHours = reconstructedTrades.map(t => t.holding_hours).sort((a, b) => a - b);
    
    const winRois = wins.map(t => t.realized_roi).sort((a, b) => a - b);
    const winHoldingHours = wins.map(t => t.holding_hours).sort((a, b) => a - b);
    
    const lossHoldingHours = losses.map(t => t.holding_hours).sort((a, b) => a - b);

    const calcMedian = (arr: number[]) => arr[Math.floor(arr.length / 2)] || 0;

    const metrics: WalletAnalysisMetrics = {
      total_trades: reconstructedTrades.length,
      win_count: wins.length,
      loss_count: losses.length,
      win_rate: (wins.length / reconstructedTrades.length) * 100,
      
      total_realized_pnl: reconstructedTrades.reduce((sum, t) => sum + t.realized_pnl, 0),
      avg_realized_roi: rois.reduce((a, b) => a + b, 0) / rois.length,
      median_realized_roi: calcMedian(rois),
      
      total_realized_pnl_wins: wins.reduce((sum, t) => sum + t.realized_pnl, 0),
      total_realized_pnl_losses: losses.reduce((sum, t) => sum + t.realized_pnl, 0),
      
      avg_holding_hours: holdingHours.reduce((a, b) => a + b, 0) / holdingHours.length,
      median_holding_hours: calcMedian(holdingHours),
      avg_holding_hours_winners: winHoldingHours.length > 0 ? winHoldingHours.reduce((a, b) => a + b, 0) / winHoldingHours.length : 0,
      avg_holding_hours_losers: lossHoldingHours.length > 0 ? lossHoldingHours.reduce((a, b) => a + b, 0) / lossHoldingHours.length : 0,
      
      median_max_potential_roi: calcMedian(rois), // Would be different with price history
      
      entry_skill_score: 0, // Phase 2
      exit_skill_score: 0, // Phase 2
      overall_skill_score: Math.min(100, Math.max(0, (wins.length / reconstructedTrades.length) * 100 + 25)),
      
      copy_trade_rating: wins.length / reconstructedTrades.length >= 0.7 ? 'Excellent' : 
                        wins.length / reconstructedTrades.length >= 0.5 ? 'Good' : 
                        wins.length / reconstructedTrades.length >= 0.3 ? 'Fair' : 'Poor',
      
      market_cap_strategy: {
        favorite_bracket: parseInt(walletData.summary?.favoriteMcapType || '0'),
        success_by_bracket: [],
      },
    };

    return { trades: reconstructedTrades, metrics };
  }, [walletData]);

  const handleClose = () => {
    setActiveTab('trades');
    onClose();
  };

  if (!isOpen || !wallet) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-card border border-border rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-card/50">
            <div className="flex items-center gap-4">
              {walletData && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {wallet.nickname || 'Wallet Analysis'}
                    </h2>
                    <p className="text-sm text-muted-foreground font-mono">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {walletData && metrics ? (
              <div className="space-y-6 p-6">
                
                {/* Key Metrics Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Performance Summary</h3>
                  <MetricsCards metrics={metrics} />
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setActiveTab('trades')}
                      className={`px-4 py-3 font-medium transition-colors ${
                        activeTab === 'trades'
                          ? 'border-b-2 border-primary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Trade Log
                    </button>
                    <button
                      onClick={() => setActiveTab('entry')}
                      className={`px-4 py-3 font-medium transition-colors ${
                        activeTab === 'entry'
                          ? 'border-b-2 border-primary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Entry Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab('exit')}
                      className={`px-4 py-3 font-medium transition-colors ${
                        activeTab === 'exit'
                          ? 'border-b-2 border-primary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Exit Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab('market')}
                      className={`px-4 py-3 font-medium transition-colors ${
                        activeTab === 'market'
                          ? 'border-b-2 border-primary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Market Cap Strategy
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div>
                  {activeTab === 'trades' && (
                    <PerformanceTable trades={trades} />
                  )}
                  {activeTab === 'entry' && (
                    <div className="p-6 bg-secondary/20 rounded-lg text-center text-muted-foreground">
                      <p>Entry timing analysis requires price history data (coming in Phase 2)</p>
                    </div>
                  )}
                  {activeTab === 'exit' && (
                    <div className="p-6 bg-secondary/20 rounded-lg text-center text-muted-foreground">
                      <p>Exit analysis chart requires price history data (coming in Phase 2)</p>
                    </div>
                  )}
                  {activeTab === 'market' && (
                    <MarketCapAnalysis
                      summary={walletData.summary}
                      trades={trades}
                    />
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <p>Loading wallet analysis...</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
