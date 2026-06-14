import React from 'react';
import { Shield, Play, Pause, Square } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { ProgressBar } from './index';
import { AgentStatusIndicator } from './ActivityFeed';
import { agentStageLabel } from '../../lib/utils';
import type { AgentState } from '../../types';

interface AgentStatusCardProps {
  state: AgentState;
  onPauseToggle?: () => void;
  onStop?: () => void;
}

export function AgentStatusCard({ state, onPauseToggle, onStop }: AgentStatusCardProps) {
  const isRunning = state.status !== 'idle' && state.status !== 'paused' && state.status !== 'error';

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between gap-4 border-b border-white/08 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sift-cyan/10 text-sift-cyan border border-sift-cyan/20">
            <Shield size={18} className={isRunning ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Investigation Co-Pilot</h4>
            <p className="text-[10px] font-mono text-sift-muted mt-0.5">SIFT COGNITIVE INVESTIGATOR</p>
          </div>
        </div>
        <AgentStatusIndicator status={state.status} compact />
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-sift-muted font-mono">Current Stage:</span>
            <span className="text-sift-cyan font-semibold">{agentStageLabel(state.currentStage)}</span>
          </div>
          <ProgressBar value={state.stageProgress} showLabel />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-sift-muted font-mono">Overall Execution:</span>
            <span className="text-sift-green font-semibold">{state.overallProgress}%</span>
          </div>
          <ProgressBar value={state.overallProgress} color="#4edea3" showLabel />
        </div>

        <div className="bg-[#050814]/70 border border-white/05 rounded-lg p-3">
          <p className="text-[9px] font-mono text-sift-muted uppercase tracking-wider mb-1">Active Operation</p>
          <p className="text-xs text-white font-mono leading-relaxed truncate-2-lines">{state.currentAction}</p>
        </div>

        {(onPauseToggle || onStop) && (
          <div className="flex items-center gap-2 pt-2">
            {onPauseToggle && (
              <button
                onClick={onPauseToggle}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-white/10 hover:border-sift-cyan/30 bg-white/5 hover:bg-sift-cyan/5 rounded-lg text-[11px] font-mono text-white transition-all"
              >
                {state.status === 'paused' ? (
                  <>
                    <Play size={12} className="text-sift-green fill-sift-green/10" /> RESUME
                  </>
                ) : (
                  <>
                    <Pause size={12} className="text-sift-warning fill-sift-warning/10" /> PAUSE
                  </>
                )}
              </button>
            )}
            {onStop && (
              <button
                onClick={onStop}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-white/10 hover:border-sift-danger/30 bg-white/5 hover:bg-sift-danger/5 rounded-lg text-[11px] font-mono text-white transition-all"
              >
                <Square size={12} className="text-sift-danger fill-sift-danger/10" /> SHUTDOWN
              </button>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
