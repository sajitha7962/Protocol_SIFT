import React from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { PageHeader, SectionHeader, ProgressBar } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge, ConfidenceBadge } from '../../components/shared/Badges';
import { useAgentStore } from '../../stores/agentStore';
import { mockFindings, mockConfidenceScores } from '../../mocks';
import { formatDateTime } from '../../lib/utils';

export default function SelfCorrectionLoop() {
  const { activities } = useAgentStore();
  const correctionLogs = activities.filter(a => a.stage === 'self_correction' || a.message.toLowerCase().includes('correct') || a.message.toLowerCase().includes('adjust'));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Self Correction Loop" 
        description="Autonomous verification and logical revision logs generated when SIFT recalculates claim matrices based on new evidence" 
        icon={<RotateCcw size={20} />} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Self Correction Logs & Operations */}
        <div className="lg:col-span-2 space-y-6">
          <GlassPanel className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Active Self-Correction Processes</h3>
            
            <div className="space-y-4">
              {mockConfidenceScores.filter(c => c.trend.length > 1).map(score => {
                const finding = mockFindings.find(f => f.id === score.findingId);
                if (!finding) return null;

                return (
                  <div key={score.id} className="border border-white/05 rounded-lg p-4 bg-white/[0.01] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/05 pb-2">
                      <div>
                        <span className="text-xs font-bold text-white block">{finding.title}</span>
                        <span className="text-[9px] font-mono text-sift-muted uppercase">FINDING ID: {score.findingId}</span>
                      </div>
                      <ConfidenceBadge score={score.score} />
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-mono text-sift-muted uppercase">Revision Trend Analysis</p>
                      <div className="space-y-2">
                        {score.trend.map((point, index) => (
                          <div key={index} className="flex items-center gap-3 text-xs">
                            <span className="w-16 font-mono text-[9px] text-sift-muted">{point.timestamp.split('T')[1].slice(0, 5)}</span>
                            <ChevronRight size={12} className="text-sift-muted" />
                            <span className="w-12 font-mono text-sift-cyan font-semibold">{point.score}%</span>
                            <span className="text-white/80">{point.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Audit Revisions</h3>
            <div className="space-y-3">
              {correctionLogs.map(log => (
                <div key={log.id} className="p-3 border border-sift-warning/20 bg-sift-warning/05 rounded-lg flex gap-3 text-xs">
                  <AlertTriangle size={14} className="text-sift-warning flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-white font-mono">{log.message}</p>
                    <p className="text-[9px] font-mono text-sift-muted">{formatDateTime(log.timestamp)}</p>
                  </div>
                </div>
              ))}
              {correctionLogs.length === 0 && (
                <p className="text-xs text-sift-muted text-center py-6 font-mono italic">No self-correction updates logged in this cycle.</p>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Engine Verification Flow */}
        <div className="space-y-6">
          <GlassPanel className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <RotateCcw size={16} className="text-sift-cyan" />
              <span>Correction Logic Rules</span>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-sift-muted">
              <div className="space-y-1">
                <p className="text-white font-semibold flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 size={12} className="text-sift-green" /> 1. Contradiction Penalty
                </p>
                <p className="text-[10px]">Reduces score by 5-15% for findings linked to contradictory or disputed evidence elements.</p>
              </div>
              <div className="space-y-1">
                <p className="text-white font-semibold flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 size={12} className="text-sift-green" /> 2. Missing Context Check
                </p>
                <p className="text-[10px]">Awaits second-source verification (such as correlating process memory dump with security event log traces).</p>
              </div>
              <div className="space-y-1">
                <p className="text-white font-semibold flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 size={12} className="text-sift-green" /> 3. Feedback Loop
                </p>
                <p className="text-[10px]">Runs Volatility/YARA plugins again if initial forensic scans output false-positive matches.</p>
              </div>
            </div>
          </GlassPanel>
        </div>

      </div>
    </div>
  );
}
