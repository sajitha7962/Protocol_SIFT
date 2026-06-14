import React, { useState } from 'react';
import { Activity, Wrench, Shield, Terminal, Play, Pause, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PageHeader, SectionHeader } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { StatusBadge } from '../../components/shared/Badges';
import { useAgentStore } from '../../stores/agentStore';
import { mockForensicTools } from '../../mocks';
import { formatDateTime } from '../../lib/utils';

export default function AgentMonitor() {
  const { state: agentState, setStatus } = useAgentStore();
  const [activeTab, setActiveTab] = useState<'monitor' | 'tools'>('monitor');
  const [selectedToolId, setSelectedToolId] = useState<string | null>(mockForensicTools[0]?.id || null);

  const selectedTool = mockForensicTools.find(t => t.id === selectedToolId);

  const toggleStatus = () => {
    if (agentState.status === 'paused') {
      setStatus('analyzing');
    } else {
      setStatus('paused');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Agent Monitor & Forensic Tools" 
        description="Monitor SIFT CPU/worker utilization and inspect raw shell executions of Volatility3, Chainsaw, and Zeek" 
        icon={<Activity size={20} />} 
      />

      {/* Tabs */}
      <div className="flex border-b border-white/08">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all ${
            activeTab === 'monitor' 
              ? 'border-sift-cyan text-white bg-sift-cyan/05' 
              : 'border-transparent text-sift-muted hover:text-white'
          }`}
        >
          COGNITIVE MONITOR
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all ${
            activeTab === 'tools' 
              ? 'border-sift-cyan text-white bg-sift-cyan/05' 
              : 'border-transparent text-sift-muted hover:text-white'
          }`}
        >
          FORENSIC SHELL RUNS
        </button>
      </div>

      {activeTab === 'monitor' ? (
        /* Monitor System Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <GlassPanel className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <SectionHeader title="Worker Resource Utilization" icon={<Activity size={16} />} />
                <button
                  onClick={toggleStatus}
                  className={`px-3 py-1.5 border rounded-lg text-[10px] font-mono transition-all ${
                    agentState.status === 'paused'
                      ? 'border-sift-green/30 bg-sift-green/10 text-sift-green hover:bg-sift-green/20'
                      : 'border-sift-warning/30 bg-sift-warning/10 text-sift-warning hover:bg-sift-warning/20'
                  }`}
                >
                  {agentState.status === 'paused' ? 'RESUME AGENT' : 'PAUSE AGENT'}
                </button>
              </div>

              {/* Resource grid logs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3 border border-white/05 rounded bg-[#050814]/50">
                  <p className="text-[9px] text-sift-muted uppercase">Thread Pools</p>
                  <p className="text-white text-sm font-bold mt-1">4 active / 8 max</p>
                  <span className="text-[8px] text-sift-green">CPU Load: 24%</span>
                </div>
                <div className="p-3 border border-white/05 rounded bg-[#050814]/50">
                  <p className="text-[9px] text-sift-muted uppercase">Memory Working Set</p>
                  <p className="text-white text-sm font-bold mt-1">1.84 GB</p>
                  <span className="text-[8px] text-sift-green">JVM Limit: 8.0 GB</span>
                </div>
                <div className="p-3 border border-white/05 rounded bg-[#050814]/50">
                  <p className="text-[9px] text-sift-muted uppercase">Queue Load</p>
                  <p className="text-white text-sm font-bold mt-1">0 pending tasks</p>
                  <span className="text-[8px] text-sift-muted">Latency: 2.3ms</span>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Execution Threads Queue</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/05 pb-2 text-[10px] text-sift-muted font-mono">
                  <span>THREAD ID / PROCESS</span>
                  <span>STATUS</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-mono text-white">t-volatility3-memdump</span>
                  <StatusBadge status="COMPLETED" variant="success" className="text-[9px]" />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-mono text-white">t-chainsaw-eventlogs</span>
                  <StatusBadge status="COMPLETED" variant="success" className="text-[9px]" />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-mono text-white">t-zeek-pcap-capture</span>
                  <StatusBadge status="RUNNING" variant="info" pulse className="text-[9px]" />
                </div>
              </div>
            </GlassPanel>
          </div>

          <div>
            <GlassPanel className="p-5 space-y-4 border border-sift-cyan/15">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Shield size={14} className="text-sift-cyan" />
                <span>Agent Status Summary</span>
              </div>
              <div className="space-y-3 text-xs leading-relaxed text-sift-muted">
                <div>
                  <span className="text-[9px] font-mono uppercase block">Status</span>
                  <span className="text-white font-bold text-sm">{agentState.status.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase block">Active Operation</span>
                  <span className="text-white font-mono text-[10px] break-all">{agentState.currentAction}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase block">Total Executed Commands</span>
                  <span className="text-white font-mono text-[10px]">12 successful / 0 failed</span>
                </div>
              </div>
            </GlassPanel>
          </div>

        </div>
      ) : (
        /* Forensic Shell Runs Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Tool run lists */}
          <div className="lg:col-span-2 space-y-4">
            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Command History</h3>
              <div className="space-y-3">
                {mockForensicTools.map(tool => {
                  const isSelected = selectedToolId === tool.id;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => setSelectedToolId(tool.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-sift-cyan/40 bg-sift-cyan/05' 
                          : 'border-white/05 bg-transparent hover:border-white/15'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-sift-muted">Run ID: {tool.id}</span>
                          <h4 className="text-xs font-bold text-white font-mono uppercase">
                            Tool: {tool.tool.toUpperCase()}
                          </h4>
                        </div>
                        <StatusBadge 
                          status={tool.status.toUpperCase()} 
                          variant={tool.status === 'completed' ? 'success' : tool.status === 'running' ? 'info' : 'danger'} 
                          className="text-[9px]"
                        />
                      </div>
                      <div className="bg-[#050814]/70 border border-white/05 rounded p-2.5 font-mono text-[10px] text-sift-muted select-all">
                        {tool.command}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
          </div>

          {/* Details Column */}
          <div>
            {selectedTool ? (
              <GlassPanel className="p-5 space-y-5 border border-sift-cyan/15">
                <div>
                  <span className="text-[9px] font-mono text-sift-muted">Run ID: {selectedTool.id}</span>
                  <h4 className="text-sm font-bold text-white mt-1 uppercase font-mono tracking-wider text-sift-cyan">
                    {selectedTool.tool} EXECUTION
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 border border-white/05 rounded bg-white/[0.01]">
                      <p className="text-sift-muted">EXTRACTED</p>
                      <p className="text-white font-bold mt-0.5">{selectedTool.artifactsExtracted} artifacts</p>
                    </div>
                    <div className="p-2 border border-white/05 rounded bg-white/[0.01]">
                      <p className="text-sift-muted">ERRORS</p>
                      <p className="text-sift-danger font-bold mt-0.5">{selectedTool.errorsCount}</p>
                    </div>
                  </div>
                  {selectedTool.durationMs && (
                    <div className="text-[10px] font-mono text-sift-muted">
                      Execution duration: <span className="text-white">{(selectedTool.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </div>

                {/* Outputs stream */}
                <div className="space-y-2 border-t border-white/08 pt-4">
                  <span className="text-[10px] font-mono text-sift-muted uppercase">Terminal Stdout</span>
                  <div className="terminal text-[9px] max-h-48 overflow-y-auto font-mono whitespace-pre bg-[#050814]/90 p-3 border border-white/08 rounded text-sift-green select-all">
                    {selectedTool.output}
                  </div>
                </div>

                {/* Recommendations */}
                {selectedTool.recommendations.length > 0 && (
                  <div className="border-t border-white/08 pt-4 space-y-2 text-xs">
                    <span className="text-[10px] font-mono text-sift-muted uppercase">Tool Recommendations</span>
                    <div className="space-y-1 text-white/80 leading-relaxed italic text-[11px]">
                      {selectedTool.recommendations.map((rec, i) => (
                        <p key={i}>• {rec}</p>
                      ))}
                    </div>
                  </div>
                )}
              </GlassPanel>
            ) : (
              <div className="text-center text-sift-muted font-mono text-xs py-20">Select a tool execution to inspect.</div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
