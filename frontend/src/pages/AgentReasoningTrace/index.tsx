import React from 'react';
import { GitBranch, Shield, Cpu, Play } from 'lucide-react';
import { PageHeader } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { useAgentStore } from '../../stores/agentStore';
import { mockFindings } from '../../mocks';

export default function AgentReasoningTrace() {
  const { activities, state: agentState } = useAgentStore();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Agent Reasoning Trace" 
        description="Detailed execution log of SIFT's internal cognitive investigator logic, hypothesis generation, and verification loops" 
        icon={<GitBranch size={20} />} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Reasoning and Hypothesis Flow */}
        <div className="lg:col-span-2 space-y-6">
          <GlassPanel className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Cpu size={16} className="text-sift-cyan" />
              <span>Active Investigation Hypotheses</span>
            </div>
            
            <div className="space-y-4">
              {mockFindings.map((finding, idx) => (
                <div key={finding.id} className="border border-white/05 rounded-lg p-4 bg-white/[0.01] space-y-3">
                  <div className="flex items-center justify-between border-b border-white/05 pb-2">
                    <span className="text-xs font-bold text-white font-mono">{idx + 1}. {finding.title}</span>
                    <span className="text-[10px] font-mono text-sift-green bg-sift-green/10 px-2 py-0.5 rounded border border-sift-green/20">
                      CONFIDENCE: {finding.confidenceScore}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-sift-cyan uppercase">Observation Context</p>
                      <p className="text-sift-muted">{finding.reasoning.observation}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-sift-cyan uppercase">Logical Deduction</p>
                      <p className="text-sift-muted">{finding.reasoning.inference}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#050814]/50 border border-white/05 font-mono text-[10px] text-sift-green">
                    <p className="text-sift-muted text-[8px] uppercase mb-0.5">Verification Conclusion</p>
                    <p>✔ {finding.reasoning.conclusion}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Reasoning Terminal Logs */}
        <div className="space-y-6">
          <GlassPanel className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Shield size={16} className="text-sift-green" />
              <span>Cognitive Processing Stack</span>
            </div>
            <div className="space-y-2 text-xs font-mono text-sift-muted">
              <div className="flex justify-between border-b border-white/05 pb-1">
                <span>Core Engine:</span>
                <span className="text-white">SIFT-IR-Agent v1.0.4</span>
              </div>
              <div className="flex justify-between border-b border-white/05 pb-1">
                <span>Model State:</span>
                <span className="text-white">Active (Continuous)</span>
              </div>
              <div className="flex justify-between border-b border-white/05 pb-1">
                <span>Task Queue:</span>
                <span className="text-white">Processing correlations</span>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Cpu size={14} className="text-sift-cyan" />
              <span>Internal Thought Shell</span>
            </div>
            <div className="terminal text-[10px] h-[450px] overflow-y-auto space-y-2">
              <p className="text-sift-muted">[{new Date().toISOString().split('T')[1].slice(0, 8)}] Initializing SIFT thought-trace monitor...</p>
              {activities.map(act => (
                <div key={act.id} className="space-y-0.5">
                  <p className="text-sift-muted">
                    [{act.timestamp.split('T')[1].slice(0, 8)}] <span className="text-sift-cyan">[{act.stage?.toUpperCase() || 'CORE'}]</span>
                  </p>
                  <p className={act.type === 'error' ? 'text-sift-danger' : act.type === 'warning' ? 'text-sift-warning' : 'text-sift-green'}>
                    &gt; {act.message}
                  </p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

      </div>
    </div>
  );
}
