import React, { useState } from 'react';
import { ShieldAlert, ExternalLink, ShieldCheck } from 'lucide-react';
import { PageHeader, SearchInput } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge, StatusBadge, ConfidenceBadge } from '../../components/shared/Badges';
import { mockThreatIntel } from '../../mocks';
import { formatDateTime } from '../../lib/utils';

export default function ThreatIntelligence() {
  const [search, setSearch] = useState('');

  const filtered = mockThreatIntel.filter(ti => 
    ti.value.toLowerCase().includes(search.toLowerCase()) || 
    (ti.threatActor && ti.threatActor.toLowerCase().includes(search.toLowerCase())) ||
    (ti.campaign && ti.campaign.toLowerCase().includes(search.toLowerCase())) ||
    ti.source.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Threat Intelligence Context" 
        description="Enriched indicators of compromise (IoC) with risk ratings mapped against dynamic reputation databases" 
        icon={<ShieldAlert size={20} />} 
      />

      <div className="flex items-center gap-3">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Search indicators, threat actors, campaigns..." 
          className="flex-1 min-w-48 max-w-sm" 
        />
      </div>

      <div className="grid grid-cols-1 gap-5">
        {filtered.map(ti => {
          return (
            <GlassPanel key={ti.id} className="p-5 border border-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/08 pb-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono bg-sift-cyan/10 text-sift-cyan px-2 py-0.5 rounded border border-sift-cyan/20">
                      TYPE: {ti.iocType.toUpperCase()}
                    </span>
                    <span className="text-xs text-white font-mono font-bold select-all">{ti.value}</span>
                  </div>
                  <p className="text-[10px] font-mono text-sift-muted mt-1">
                    Feed source: <span className="text-white font-bold">{ti.source.toUpperCase()}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-sift-muted">RISK SCORE:</span>
                  <ConfidenceBadge score={ti.riskScore} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* Threat actor and profile */}
                <div className="space-y-2">
                  <h5 className="font-mono text-[10px] text-sift-muted uppercase tracking-wider">Threat Actor Profile</h5>
                  <div className="space-y-1">
                    <p className="text-white font-semibold">{ti.threatActor || 'UNKNOWN ACTOR'}</p>
                    {ti.campaign && <p className="text-sift-cyan">Campaign: {ti.campaign}</p>}
                    <p className="text-sift-muted mt-1 leading-relaxed">{ti.description}</p>
                  </div>
                </div>

                {/* Tactics / Techniques */}
                <div className="space-y-2">
                  <h5 className="font-mono text-[10px] text-sift-muted uppercase tracking-wider">MITRE ATT&CK Mapping</h5>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    {ti.ttps.map(t => (
                      <span key={t} className="bg-white/5 text-white/80 px-2 py-0.5 rounded border border-white/10">
                        {t}
                      </span>
                    ))}
                    {ti.ttps.length === 0 && <span className="text-sift-muted">No explicit mappings</span>}
                  </div>
                  <div className="pt-2">
                    <h6 className="font-mono text-[9px] text-sift-muted uppercase mb-1">Tags</h6>
                    <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                      {ti.tags.map(tag => (
                        <span key={tag} className="text-sift-cyan uppercase">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* References and Logs */}
                <div className="p-3.5 rounded bg-[#050814]/50 border border-white/05 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h5 className="font-mono text-[10px] text-sift-muted uppercase tracking-wider">External References</h5>
                    <div className="space-y-1">
                      {ti.references.map(ref => (
                        <a 
                          key={ref} 
                          href={ref} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-1.5 text-sift-cyan hover:underline text-[10px] font-mono"
                        >
                          <ExternalLink size={10} />
                          {ref.replace('https://', '')}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="text-[9px] font-mono text-sift-muted pt-4 border-t border-white/05 flex justify-between">
                    <span>Last seen: {new Date(ti.lastSeen).toLocaleDateString()}</span>
                    <span>Reported: {new Date(ti.reportedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
