'use client';

import React from 'react';
import { TraderMetrics, getTraderLabel } from '@/lib/analytics-engine';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface TraderScoreCardProps {
  metrics: TraderMetrics;
  walletAddress: string;
  compact?: boolean;
}

const ScoreGauge: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-56 h-56',
  };

  const textSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  // Color based on score
  let color = '#ef4444'; // red
  if (score >= 80) color = '#10b981'; // green
  else if (score >= 65) color = '#f59e0b'; // amber
  else if (score >= 50) color = '#f97316'; // orange

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="text-center">
        <div className={`font-bold ${textSizes[size]}`} style={{ color }}>
          {Math.round(score)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">/ 100</div>
      </div>
    </div>
  );
};

const MetricRow: React.FC<{
  label: string;
  value: number | string;
  unit?: string;
  score?: number;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, unit = '', score, trend }) => {
  let scoreColor = 'text-red-600 dark:text-red-400';
  if (typeof score === 'number') {
    if (score >= 75) scoreColor = 'text-green-600 dark:text-green-400';
    else if (score >= 60) scoreColor = 'text-amber-600 dark:text-amber-400';
    else if (score >= 40) scoreColor = 'text-orange-600 dark:text-orange-400';
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        {trend && (
          <>
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />}
          </>
        )}
        <span className={`font-semibold ${score !== undefined ? scoreColor : ''}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
          {unit && <span className="text-xs ml-1">{unit}</span>}
        </span>
      </div>
    </div>
  );
};

const ScoreCategory: React.FC<{
  title: string;
  score: number;
  metrics: { label: string; value: number | string; unit?: string }[];
}> = ({ title, score, metrics }) => {
  let bgColor = 'bg-red-50 dark:bg-red-950';
  let borderColor = 'border-red-200 dark:border-red-800';
  let badgeColor = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';

  if (score >= 75) {
    bgColor = 'bg-green-50 dark:bg-green-950';
    borderColor = 'border-green-200 dark:border-green-800';
    badgeColor = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
  } else if (score >= 60) {
    bgColor = 'bg-amber-50 dark:bg-amber-950';
    borderColor = 'border-amber-200 dark:border-amber-800';
    badgeColor = 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
  } else if (score >= 40) {
    bgColor = 'bg-orange-50 dark:bg-orange-950';
    borderColor = 'border-orange-200 dark:border-orange-800';
    badgeColor = 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        <Badge className={badgeColor}>{score}</Badge>
      </div>
      <div className="space-y-1">
        {metrics.map((metric, idx) => (
          <MetricRow key={idx} {...metric} />
        ))}
      </div>
    </div>
  );
};

export const TraderScoreCard: React.FC<TraderScoreCardProps> = ({ metrics, walletAddress, compact = false }) => {
  const copyWorthinessIcon =
    metrics.traderQualityScore >= 75 ? (
      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
    ) : metrics.traderQualityScore >= 55 ? (
      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    );

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{walletAddress}</p>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.traderQualityScore}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{metrics.recommendedCopyType}</p>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {getTraderLabel(metrics.traderQualityScore)}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      metrics.traderQualityScore >= 75
                        ? 'bg-green-500'
                        : metrics.traderQualityScore >= 60
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${metrics.traderQualityScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          {copyWorthinessIcon}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trader Quality Analysis</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">{walletAddress}</p>
          </div>
          {copyWorthinessIcon}
        </div>

        {/* Main Score */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">{metrics.traderQualityScore}</span>
              <span className="text-xl text-gray-400 dark:text-gray-500">/ 100</span>
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {getTraderLabel(metrics.traderQualityScore)}
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Badge
                  className={
                    metrics.isCopyWorthy
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }
                >
                  {metrics.isCopyWorthy ? '✓ Copy-Worthy' : '✗ Not Recommended'}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Recommended: <span className="font-semibold">{metrics.recommendedCopyType}</span>
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ScoreGauge score={metrics.traderQualityScore} size="md" />
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ScoreCategory
          title="📍 Entry Quality"
          score={metrics.entryQualityScore}
          metrics={[
            { label: 'Win Rate', value: metrics.entryAccuracy, unit: '%' },
            { label: 'Entry Timing', value: metrics.entryTiming },
          ]}
        />

        <ScoreCategory
          title="💰 Profitability"
          score={metrics.profitabilityScore}
          metrics={[
            { label: 'Win Rate', value: metrics.winRate, unit: '%' },
            { label: 'Avg P&L', value: metrics.averagePnL, unit: '$' },
            { label: 'Profit Factor', value: metrics.profitFactor },
          ]}
        />

        <ScoreCategory
          title="🎯 Exit Quality"
          score={metrics.exitQualityScore}
          metrics={[
            { label: 'Exit Timing', value: metrics.exitTiming },
            { label: 'Exit Accuracy', value: metrics.exitAccuracy, unit: '%' },
          ]}
        />

        <ScoreCategory
          title="🛡️ Risk Management"
          score={metrics.riskManagementScore}
          metrics={[
            { label: 'Rug Pull Avoidance', value: metrics.rugPullAvoidance, unit: '%' },
            { label: 'Position Sizing', value: metrics.positionSizing, unit: '%' },
            { label: 'Max Drawdown', value: metrics.maxDrawdown, unit: '%' },
          ]}
        />

        <ScoreCategory
          title="📈 Recent Trend"
          score={metrics.trendScore}
          metrics={[
            { label: 'Week Trend', value: metrics.weekTrend },
            { label: 'Recent 7d Win Rate', value: metrics.recentWinRate, unit: '%' },
          ]}
        />
      </div>

      {/* Recommendation */}
      <div
        className={`rounded-lg p-4 ${
          metrics.isCopyWorthy
            ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'
        }`}
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Recommendation</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {metrics.isCopyWorthy ? (
            <>
              This trader shows <strong>strong potential</strong> for copy trading. Consider copying their{' '}
              {metrics.recommendedCopyType === 'entries-and-exits' ? 'entries and exits' : 'entries'} based on their
              proven track record.
            </>
          ) : (
            <>
              This trader has <strong>mixed results</strong>. Monitor their performance before copying or copy only
              specific strategies after further analysis.
            </>
          )}
        </p>
      </div>
    </Card>
  );
};

export default TraderScoreCard;
