import React from 'react';
import { GitBranch, CheckCircle2, Circle, Clock, Terminal } from 'lucide-react';
import { PageHeader, SectionHeader, ProgressBar } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { useAgentStore } from '../../stores/agentStore';
import { agentStageLabel, formatDateTime } from '../../lib/utils';
import type { AgentStage } from '../../types';

const STAGES: AgentStage[] = [
  'evidence_intake', 'classification', 'tool_selection', 'artifact_extraction',
  'correlation', 'threat_analysis', 'validation', 'contradiction_detection',
  'self_correction', 'confidence_scoring', 'report_generation',
];

const STAGE_DESCRIPTIONS: Record<AgentStage, string> = {
  evidence_intake: 'Ingesting evidence files, verifying cryptographic hash match, and ensuring secure Chain of Custody.',
  classification: 'Categorizing evidence types (e.g. disk images, log files, network capture, memory dumps) and metadata collection.',
  tool_selection: 'Selecting appropriate tools (Volatility3, Chainsaw, Zeek, YARA) matching the evidence types.',
  artifact_extraction: 'Running selected plugins on the forensic evidence to extract indicators, process listings, registry hives, etc.',
  correlation: 'Cross-referencing observations across different evidence sources (e.g. connecting a PowerShell process to local Auth logs).',
  threat_analysis: 'Enriching findings using threat intelligence feeds and mapping indicators to MITRE ATT&CK techniques.',
  validation: 'Verifying findings against baseline states and rulesets (such as YARA or Sigma signatures).',
  contradiction_detection: 'Detecting conflicts between evidence (e.g., verifying if a process logged in events matches memory lists).',
  self_correction: 'Evaluating confidence thresholds, performing self-correction, or requesting additional verification actions.',
  confidence_scoring: 'Calculating overall confidence scores based on evidence quantity, reliability factor, and contradiction penalty.',
  report_generation: 'Compiling structured Executive Summaries, Timelines, Findings, and Remediations for compliance review.',
};

export default function AgentWorkflow() {
  const { state: agentState } = useAgentStore();
  const currentStageIdx = STAGES.indexOf(agentState.currentStage);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Agent Investigation Pipeline" 
        description="Detailed execution workflow for SIFT's autonomous cybersecurity analysis engine" 
        icon={<GitBranch size={20} />} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Vertical Pipeline Graph */}
        <div className="lg:col-span-2 space-y-4">
          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Pipeline Stages</h3>
            <div className="space-y-3">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIdx;
                const isActive = idx === currentStageIdx;
                const isPending = idx > currentStageIdx;
                
                const historyItem = agentState.stageHistory.find(h => h.stage === stage);

                return (
                  <div 
                    key={stage} 
                    className={`border rounded-lg p-4 transition-all duration-200 ${
                      isActive 
                        ? 'border-sift-cyan/40 bg-sift-cyan/05 shadow-md shadow-sift-cyan/05' 
                        : isCompleted 
                        ? 'border-sift-green/20 bg-sift-green/02' 
                        : 'border-white/05 bg-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isCompleted ? (
                          <CheckCircle2 size={16} className="text-sift-green" />
                        ) : isActive ? (
                          <GitBranch size={16} className="text-sift-cyan animate-pulse" />
                        ) : (
                          <Circle size={16} className="text-sift-muted" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className={`text-xs font-bold font-mono ${isActive ? 'text-sift-cyan' : isCompleted ? 'text-sift-green' : 'text-white'}`}>
                            {idx + 1}. {agentStageLabel(stage).toUpperCase()}
                          </h4>
                          <span className="text-[10px] font-mono text-sift-muted">
                            {isActive ? 'IN PROGRESS' : isCompleted ? 'SUCCESS' : 'PENDING'}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-sift-muted mt-1 leading-relaxed">
                          {STAGE_DESCRIPTIONS[stage]}
                        </p>

                        {isActive && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] mb-1 font-mono">
                              <span className="text-sift-muted">Stage progress:</span>
                              <span className="text-sift-cyan">{agentState.stageProgress}%</span>
                            </div>
                            <ProgressBar value={agentState.stageProgress} />
                          </div>
                        )}

                        {historyItem && (
                          <div className="mt-2.5 pt-2 border-t border-white/05 flex items-center justify-between text-[10px] font-mono text-sift-muted">
                            {historyItem.outcome && <span>Outcome: <span className="text-white">{historyItem.outcome}</span></span>}
                            {historyItem.duration && <span>Duration: <span className="text-white">{(historyItem.duration / 1000).toFixed(1)}s</span></span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Execution Metadata & Console Output */}
        <div className="space-y-6">
          <GlassPanel className="p-5 space-y-4">
            <SectionHeader title="Pipeline Controller" icon={<GitBranch size={16} />} />
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-2.5 border border-white/05 rounded bg-white/[0.01]">
                  <p className="text-sift-muted">AGENT STATE</p>
                  <p className="text-sift-cyan font-bold mt-0.5">{agentState.status.toUpperCase()}</p>
                </div>
                <div className="p-2.5 border border-white/05 rounded bg-white/[0.01]">
                  <p className="text-sift-muted">GLOBAL PROGRESS</p>
                  <p className="text-sift-green font-bold mt-0.5">{agentState.overallProgress}%</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-sift-muted">LAST UPDATE</p>
                <p className="text-white font-mono">{formatDateTime(agentState.lastUpdate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-sift-muted">STARTED AT</p>
                <p className="text-white font-mono">{agentState.startedAt ? formatDateTime(agentState.startedAt) : 'N/A'}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Terminal size={14} className="text-sift-green" />
              <span>Pipeline Logs</span>
            </div>
            <div className="terminal text-[10px] h-96 overflow-y-auto space-y-1">
              <p className="text-sift-muted">[{new Date().toISOString().split('T')[1].slice(0, 8)}] SIFT Orchestrator starting stage monitor...</p>
              {agentState.stageHistory.map(h => (
                <p key={h.stage} className="text-sift-green">
                  [{h.startedAt.split('T')[1].slice(0, 8)}] Stage [{agentStageLabel(h.stage)}] initiated. {h.outcome ? `Outcome: ${h.outcome}` : ''}
                </p>
              ))}
              <p className="text-sift-cyan animate-pulse">
                [{new Date().toISOString().split('T')[1].slice(0, 8)}] Stage [{agentStageLabel(agentState.currentStage)}] execution in progress...
              </p>
            </div>
          </GlassPanel>
        </div>

      </div>
    </div>
  );
}
