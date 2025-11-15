'use client';

import { WalletAnalysisMetrics, ReconstructedTrade } from '@/types/wallet';

interface SkillAssessmentProps {
  metrics: WalletAnalysisMetrics | undefined;
  trades: ReconstructedTrade[];
}

export default function SkillAssessment({ metrics, trades }: SkillAssessmentProps) {
  if (!metrics) return null;

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-chart-4';
    if (score >= 50) return 'text-chart-3';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Good';
    return 'Needs Improvement';
  };

  const getSkillDescription = (label: string, score: number) => {
    if (label === 'Entry Skill') {
      if (score >= 75) return 'You consistently find excellent entry points early in the trend';
      if (score >= 50) return 'Your entries are decent but could catch trends earlier';
      return 'Your entries could be improved by identifying trends sooner';
    }
    if (label === 'Exit Skill') {
      if (score >= 75) return 'You have excellent exit timing, selling near peaks';
      if (score >= 50) return 'Your exit timing is reasonable but leaves some gains on the table';
      return 'You exit too early or too late - consider refining your exit strategy';
    }
    if (label === 'Overall Skill') {
      if (score >= 75) return 'You demonstrate strong trading skills overall';
      if (score >= 50) return 'You have decent trading skills with room for improvement';
      return 'Your trading needs refinement in both entry and exit strategies';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Skill Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Entry Skill', score: metrics.entry_skill_score },
          { label: 'Exit Skill', score: metrics.exit_skill_score },
          { label: 'Overall Skill', score: metrics.overall_skill_score },
        ].map((skill) => (
          <div key={skill.label} className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-2">{skill.label}</p>
            <div className="flex items-baseline gap-1 mb-3">
              <p className={`text-3xl font-bold ${getScoreColor(skill.score)}`}>{skill.score}</p>
              <p className="text-sm text-muted-foreground">/100</p>
            </div>
            <p className={`text-xs font-semibold ${getScoreColor(skill.score)}`}>
              {getScoreLabel(skill.score)}
            </p>
          </div>
        ))}
      </div>

      {/* Detailed Insights */}
      <div className="space-y-3">
        {[
          { label: 'Entry Skill', score: metrics.entry_skill_score },
          { label: 'Exit Skill', score: metrics.exit_skill_score },
          { label: 'Overall Skill', score: metrics.overall_skill_score },
        ].map((skill) => (
          <div key={skill.label} className="bg-secondary/20 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground">{skill.label}</h4>
              <span className={`text-sm font-bold ${getScoreColor(skill.score)}`}>{skill.score}/100</span>
            </div>
            <p className="text-sm text-muted-foreground">{getSkillDescription(skill.label, skill.score)}</p>
          </div>
        ))}
      </div>

      {/* Copy Trade Rating */}
      <div className="bg-primary/10 border border-primary rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Copy Trade Rating</h3>
        <p className="text-2xl font-bold text-primary mb-2">{metrics.copy_trade_rating}</p>
        <p className="text-sm text-muted-foreground">
          Based on your entry skill, exit timing, win rate, and ROI performance, you are rated as a{' '}
          <strong className="text-foreground">{metrics.copy_trade_rating}</strong> candidate for copy trading.
        </p>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-foreground">{metrics.win_rate.toFixed(1)}%</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Median ROI</p>
          <p className={`text-2xl font-bold ${metrics.median_realized_roi >= 0 ? 'text-chart-4' : 'text-destructive'}`}>
            {metrics.median_realized_roi >= 0 ? '+' : ''}{metrics.median_realized_roi.toFixed(2)}%
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Avg Hold Time</p>
          <p className="text-2xl font-bold text-foreground">{metrics.avg_holding_hours.toFixed(1)}h</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
          <p className="text-2xl font-bold text-foreground">{metrics.total_trades}</p>
        </div>
      </div>
    </div>
  );
}
