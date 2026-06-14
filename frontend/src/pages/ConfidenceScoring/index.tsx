import React from 'react';
import { Target, CheckCircle2, AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { PageHeader, MetricCard, ProgressBar } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge, ConfidenceBadge } from '../../components/shared/Badges';
import { mockConfidenceScores, mockFindings } from '../../mocks';
import { formatDateTime } from '../../lib/utils';

export default function ConfidenceScoring() {
  const scoreData = mockConfidenceScores[0] || {
    score: 94,
    evidenceQuantity: 0.90,
    evidenceQuality: 0.95,
    sourceReliability: 0.98,
    correlationStrength: 0.94,
    validationResults: 1.0,
    contradictionPenalty: 0,
    trend: [],
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Confidence Scoring Breakdowns" 
        description="SIFT mathematically evaluates confidence metrics across evidence layers to verify the integrity of findings" 
        icon={<Target size={20} />} 
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Weighted Confidence Score" value={`${scoreData.score}%`} icon={<Target size={18} />} accent="green" />
        <MetricCard label="Evidence Verification factor" value="95%" icon={<CheckCircle2 size={18} />} accent="cyan" />
        <MetricCard label="Correlation Match Weight" value="94%" icon={<TrendingUp size={18} />} accent="primary" />
        <MetricCard label="Contradiction Penalties" value={`${scoreData.contradictionPenalty}%`} icon={<AlertTriangle size={18} />} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Mathematical Weight Components */}
        <div className="lg:col-span-2 space-y-6">
          <GlassPanel className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Mathematical Computation Profile</h3>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-sift-muted">Evidence Quantity Factor (weight: 15%):</span>
                  <span className="text-white">{(scoreData.evidenceQuantity * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={scoreData.evidenceQuantity * 100} color="#adc6ff" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-sift-muted">Evidence Quality Factor (weight: 20%):</span>
                  <span className="text-white">{(scoreData.evidenceQuality * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={scoreData.evidenceQuality * 100} color="#4cd7f6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-sift-muted">Source Reliability Factor (weight: 20%):</span>
                  <span className="text-white">{(scoreData.sourceReliability * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={scoreData.sourceReliability * 100} color="#4edea3" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-sift-muted">Correlation Strength Factor (weight: 25%):</span>
                  <span className="text-white">{(scoreData.correlationStrength * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={scoreData.correlationStrength * 100} color="#ffb84d" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-sift-muted">Validation Verification Factor (weight: 20%):</span>
                  <span className="text-white">{(scoreData.validationResults * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={scoreData.validationResults * 100} color="#4cd7f6" />
              </div>
            </div>
          </GlassPanel>

          {/* Finding list with scores */}
          <GlassPanel className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Confidence Scores by Finding</h3>
            <div className="space-y-3">
              {mockFindings.map(find => (
                <div key={find.id} className="border border-white/05 rounded-lg p-3 bg-white/[0.01] flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{find.title}</p>
                    <p className="text-[10px] text-sift-muted font-mono uppercase">MITRE: {find.mitreTechnique || 'N/A'}</p>
                  </div>
                  <ConfidenceBadge score={find.confidenceScore} />
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Score Trends and Log History */}
        <div className="space-y-6">
          <GlassPanel className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <TrendingUp size={16} className="text-sift-green" />
              <span>Score Log History</span>
            </div>
            
            <div className="space-y-4">
              {scoreData.trend.map((point, idx) => (
                <div key={idx} className="flex gap-3 relative pb-4 last:pb-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-sift-cyan" />
                    {idx < scoreData.trend.length - 1 && <div className="w-0.5 flex-1 bg-white/10 my-1" />}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="text-[10px] font-mono text-sift-muted">{formatDateTime(point.timestamp)}</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-white font-medium">{point.reason}</span>
                      <span className="text-sift-green font-mono font-bold">{point.score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

      </div>
    </div>
  );
}
