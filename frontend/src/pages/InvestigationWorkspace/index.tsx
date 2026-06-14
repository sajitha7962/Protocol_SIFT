import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Folder, Database, Clock, Eye, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { PageHeader, MetricCard, SectionHeader } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge, ConfidenceBadge } from '../../components/shared/Badges';
import { EvidenceCard } from '../../components/shared/EvidenceCard';
import { TimelineEventCard } from '../../components/shared/TimelineEventCard';
import { AgentStatusCard } from '../../components/shared/AgentStatusCard';
import { ActivityFeed } from '../../components/shared/ActivityFeed';
import { useCaseStore } from '../../stores/caseStore';
import { useAgentStore } from '../../stores/agentStore';
import { mockEvidence, mockTimeline, mockFindings, mockContradictions, mockUsers } from '../../mocks';
import { formatDateTime } from '../../lib/utils';

export default function InvestigationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { cases, selectCase } = useCaseStore();
  const { state: agentState, activities } = useAgentStore();
  
  // Find case
  const currentCase = cases.find(c => c.id === id) || cases[0];
  
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  // Filter relevant entities for this case
  const caseEvidence = mockEvidence.filter(e => e.caseId === currentCase.id);
  const caseTimeline = mockTimeline.filter(t => t.caseId === currentCase.id);
  const caseFindings = mockFindings.filter(f => f.caseId === currentCase.id);
  const caseContradictions = mockContradictions.filter(c => c.caseId === currentCase.id);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 border border-white/10 hover:border-sift-cyan/40 bg-white/5 rounded-lg text-sift-muted hover:text-white transition-all">
          <ArrowLeft size={16} />
        </Link>
        <PageHeader 
          title={currentCase.title} 
          description={currentCase.description} 
          icon={<Folder size={20} />} 
          badge={<SeverityBadge severity={currentCase.severity as any} />}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Case Severity" value={currentCase.severity.toUpperCase()} icon={<Shield size={18} />} accent="red" />
        <MetricCard label="Confidence Score" value={`${(currentCase as any).overall_confidence}%`} icon={<ConfidenceBadge score={(currentCase as any).overall_confidence} />} accent="green" />
        <MetricCard label="Findings Count" value={caseFindings.length} icon={<Eye size={18} />} accent="cyan" />
        <MetricCard label="Unresolved Contradictions" value={caseContradictions.filter(c => c.status !== 'resolved').length} icon={<AlertTriangle size={18} />} accent="warning" />
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Evidence & Contradictions */}
        <div className="space-y-6">
          {/* Evidence Repository */}
          <GlassPanel className="p-5 space-y-4">
            <SectionHeader 
              title="Evidence Repository" 
              description={`${caseEvidence.length} items collected`} 
              icon={<Database size={16} />}
              action={<Link to="/evidence" className="text-[10px] font-mono text-sift-cyan hover:underline">BROWSE ALL</Link>}
            />
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {caseEvidence.map(ev => (
                <EvidenceCard 
                  key={ev.id} 
                  evidence={ev} 
                  selected={selectedEvidenceId === ev.id}
                  onClick={() => setSelectedEvidenceId(selectedEvidenceId === ev.id ? null : ev.id)}
                />
              ))}
            </div>
          </GlassPanel>

          {/* Evidence Contradictions */}
          <GlassPanel className="p-5 space-y-4">
            <SectionHeader 
              title="Contradictions Detected" 
              description="Conflicting forensic traces" 
              icon={<AlertTriangle size={16} />}
              action={<Link to="/contradictions" className="text-[10px] font-mono text-sift-cyan hover:underline">EXPLORE</Link>}
            />
            <div className="space-y-3">
              {caseContradictions.map(con => (
                <div key={con.id} className="border border-white/05 rounded-lg p-3 bg-white/[0.01] hover:bg-white/[0.03] transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sift-warning font-mono uppercase">{con.conflictType.replace(/_/g, ' ')}</span>
                    <SeverityBadge severity={con.severity as any} className="text-[8px]" />
                  </div>
                  <h5 className="text-xs font-semibold text-white">{con.title}</h5>
                  <p className="text-[10px] text-sift-muted leading-relaxed">{con.description}</p>
                </div>
              ))}
              {caseContradictions.length === 0 && (
                <p className="text-xs text-sift-muted font-mono italic text-center py-4">No contradictions detected in evidence.</p>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Center Column: Findings & Timeline */}
        <div className="space-y-6">
          {/* Key Findings */}
          <GlassPanel className="p-5 space-y-4">
            <SectionHeader 
              title="Key Investigation Findings" 
              description="Confirmed threat traces" 
              icon={<Eye size={16} />}
              action={<Link to="/findings" className="text-[10px] font-mono text-sift-cyan hover:underline">EXPAND ALL</Link>}
            />
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {caseFindings.map(find => (
                <div key={find.id} className="border border-white/08 rounded-lg p-3 bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-sift-muted">ID: {find.id}</span>
                    <SeverityBadge severity={find.severity} className="text-[8px]" />
                  </div>
                  <h5 className="text-xs font-bold text-white">{find.title}</h5>
                  <p className="text-[10px] text-sift-muted leading-relaxed">{find.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/05 text-[9px] font-mono">
                    <span className="text-sift-green">Confidence: {find.confidenceScore}%</span>
                    {find.mitreTechnique && <span className="text-sift-cyan">{find.mitreTechnique}</span>}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Timeline */}
          <GlassPanel className="p-5 space-y-4">
            <SectionHeader 
              title="Investigation Timeline" 
              description="Chronological event reconstruction" 
              icon={<Clock size={16} />}
              action={<Link to="/timeline" className="text-[10px] font-mono text-sift-cyan hover:underline">FULL VIEW</Link>}
            />
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {caseTimeline.slice(0, 4).map((evt, idx) => (
                <TimelineEventCard 
                  key={evt.id} 
                  event={evt} 
                  isFirst={idx === 0} 
                  isLast={idx === 3 || idx === caseTimeline.length - 1} 
                />
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: AI Co-Pilot Monitor */}
        <div className="space-y-6">
          {/* Agent status */}
          <AgentStatusCard state={agentState} />

          {/* Active cognitive agent logs */}
          <GlassPanel className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/08">
              <div>
                <h3 className="text-xs font-semibold text-white">Live Copilot Activity Feed</h3>
                <p className="text-[9px] text-sift-muted font-mono">{activities.length} total traces</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="pulse-dot online" />
                <span className="text-[9px] font-mono text-sift-green">LIVE FEED</span>
              </div>
            </div>
            <ActivityFeed activities={activities} maxItems={8} className="max-h-[350px] overflow-y-auto" />
          </GlassPanel>
        </div>

      </div>
    </div>
  );
}
