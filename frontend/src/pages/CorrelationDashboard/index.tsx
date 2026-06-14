import React, { useState } from 'react';
import { Network, Link2, Share2, HelpCircle } from 'lucide-react';
import { PageHeader, SectionHeader, ProgressBar } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge } from '../../components/shared/Badges';
import { mockCorrelations, mockFindings, mockEvidence } from '../../mocks';
import { formatDateTime } from '../../lib/utils';

export default function CorrelationDashboard() {
  const [selectedCorrelationId, setSelectedCorrelationId] = useState<string | null>(mockCorrelations[0]?.id || null);

  const getFindingTitle = (id: string) => {
    return mockFindings.find(f => f.id === id)?.title || id;
  };

  const getFindingSeverity = (id: string) => {
    return mockFindings.find(f => f.id === id)?.severity || 'info';
  };

  const getEvidenceFilename = (id: string) => {
    return mockEvidence.find(e => e.id === id)?.filename || id;
  };

  const selectedCorrelation = mockCorrelations.find(c => c.id === selectedCorrelationId);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Correlation Dashboard" 
        description="SIFT maps logical connections, temporal links, and causal flows discovered across different evidence sources" 
        icon={<Network size={20} />} 
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Correlation List */}
        <div className="xl:col-span-2 space-y-4">
          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Discovered Finding Connections</h3>
            <div className="space-y-3">
              {mockCorrelations.map(corr => {
                const isSelected = selectedCorrelationId === corr.id;
                return (
                  <div
                    key={corr.id}
                    onClick={() => setSelectedCorrelationId(corr.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-sift-cyan/40 bg-sift-cyan/05' 
                        : 'border-white/05 bg-transparent hover:border-white/15'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-sift-muted">Link ID: {corr.id}</span>
                        <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                          Type: {corr.linkType.replace(/_/g, ' ')}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-sift-muted">STRENGTH:</span>
                        <span className="text-xs font-mono text-sift-green font-bold">{(corr.strength * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex-1 min-w-0 bg-[#050814]/50 border border-white/05 rounded p-2.5">
                        <p className="text-[8px] font-mono text-sift-muted uppercase mb-0.5">Source Finding</p>
                        <p className="text-white truncate font-medium">{getFindingTitle(corr.findingAId)}</p>
                      </div>
                      <Link2 size={16} className="text-sift-cyan flex-shrink-0" />
                      <div className="flex-1 min-w-0 bg-[#050814]/50 border border-white/05 rounded p-2.5">
                        <p className="text-[8px] font-mono text-sift-muted uppercase mb-0.5">Target Finding</p>
                        <p className="text-white truncate font-medium">{getFindingTitle(corr.findingBId)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>

        {/* Info Drawer */}
        <div>
          {selectedCorrelation ? (
            <GlassPanel className="p-5 space-y-5 border border-sift-cyan/15">
              <div>
                <span className="text-[9px] font-mono text-sift-muted">Link ID: {selectedCorrelation.id}</span>
                <h4 className="text-sm font-bold text-white mt-1 uppercase font-mono tracking-wider text-sift-cyan">
                  {selectedCorrelation.linkType.replace(/_/g, ' ')} Pathway
                </h4>
                <p className="text-[11px] text-sift-muted mt-2 leading-relaxed">
                  {selectedCorrelation.description}
                </p>
              </div>

              {/* Strength Analysis */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span className="text-sift-muted">Correlation Strength:</span>
                  <span className="text-sift-green font-bold">{(selectedCorrelation.strength * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={selectedCorrelation.strength * 100} color="#4edea3" />
              </div>

              {/* Findings Context */}
              <div className="border-t border-white/08 pt-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Share2 size={13} className="text-sift-cyan" />
                  <span>Linked Finding Context</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="p-3 border border-white/05 rounded bg-white/[0.01]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-mono text-sift-muted">FINDING A</span>
                      <SeverityBadge severity={getFindingSeverity(selectedCorrelation.findingAId)} className="text-[8px]" />
                    </div>
                    <p className="text-white font-medium">{getFindingTitle(selectedCorrelation.findingAId)}</p>
                  </div>
                  <div className="p-3 border border-white/05 rounded bg-white/[0.01]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-mono text-sift-muted">FINDING B</span>
                      <SeverityBadge severity={getFindingSeverity(selectedCorrelation.findingBId)} className="text-[8px]" />
                    </div>
                    <p className="text-white font-medium">{getFindingTitle(selectedCorrelation.findingBId)}</p>
                  </div>
                </div>
              </div>

              {/* Supporting Evidence */}
              <div className="border-t border-white/08 pt-4 space-y-2">
                <span className="text-[10px] font-mono text-sift-muted uppercase">Supporting Evidence Files</span>
                <div className="space-y-1.5 font-mono text-[10px]">
                  {selectedCorrelation.evidenceIds.map(evId => (
                    <div key={evId} className="flex items-center gap-2 text-white/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-sift-cyan" />
                      <span className="truncate">{getEvidenceFilename(evId)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/05 text-[9px] font-mono text-sift-muted">
                Correlated: {formatDateTime(selectedCorrelation.discoveredAt)}
              </div>
            </GlassPanel>
          ) : (
            <div className="text-center text-sift-muted font-mono text-xs py-20">Select a correlation link to inspect.</div>
          )}
        </div>

      </div>
    </div>
  );
}
