'use client';

import { useState } from 'react';
import { OKXWalletSummary } from '@/lib/okx-api-v2';
import { WalletAnalysisMetrics, ReconstructedTrade } from '@/types/wallet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarketCapAnalysis from './MarketCapAnalysis';
import TokenDiversityAnalysis from './TokenDiversityAnalysis';
import SkillAssessment from './SkillAssessment';
import RiskAnalysis from './RiskAnalysis';
import TimeSeriesAnalysis from './TimeSeriesAnalysis';

interface AnalysisDashboardProps {
  summary: OKXWalletSummary | undefined;
  metrics: WalletAnalysisMetrics | undefined;
  trades: ReconstructedTrade[];
  loading: boolean;
  error: string | null;
}

export default function AnalysisDashboard({
  summary,
  metrics,
  trades,
  loading,
  error,
}: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!summary || !metrics) {
    return (
      <div className="bg-secondary/20 border border-border rounded-lg p-4">
        <p className="text-muted-foreground text-sm">No analysis data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="mcap">Market Cap</TabsTrigger>
          <TabsTrigger value="diversity">Diversity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <TimeSeriesAnalysis summary={summary} metrics={metrics} />
        </TabsContent>

        <TabsContent value="skills" className="space-y-6 mt-6">
          <SkillAssessment metrics={metrics} trades={trades} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-6 mt-6">
          <RiskAnalysis metrics={metrics} trades={trades} />
        </TabsContent>

        <TabsContent value="mcap" className="space-y-6 mt-6">
          <MarketCapAnalysis summary={summary} trades={trades} />
        </TabsContent>

        <TabsContent value="diversity" className="space-y-6 mt-6">
          <TokenDiversityAnalysis summary={summary} trades={trades} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
