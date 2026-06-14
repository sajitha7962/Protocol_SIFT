import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Database, Key } from 'lucide-react';
import { PageHeader, SectionHeader } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { StatusBadge } from '../../components/shared/Badges';
import { mockEvidence } from '../../mocks';
import { formatBytes, formatDateTime, truncateHash } from '../../lib/utils';
import type { Evidence } from '../../types';

export default function EvidenceIntegrity() {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(mockEvidence[0]?.id || null);

  const selectedEvidence = mockEvidence.find(e => e.id === selectedEvidenceId);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Evidence Integrity & Custody" 
        description="Verify cryptographic hash signatures (SHA-256/MD5) and audit immutable Chain of Custody logs" 
        icon={<ShieldCheck size={20} />} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Cryptographic Ledger */}
        <div className="lg:col-span-2 space-y-4">
          <GlassPanel className="p-5">
            <SectionHeader title="Evidence Hash Verification Ledger" icon={<ShieldCheck size={16} />} />
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/08 bg-white/[0.01]">
                    <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">File Name</th>
                    <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">SHA-256 Hash Ledger</th>
                    <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Size</th>
                    <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Integrity State</th>
                  </tr>
                </thead>
                <tbody>
                  {mockEvidence.map(ev => {
                    const isSelected = ev.id === selectedEvidenceId;
                    return (
                      <tr 
                        key={ev.id}
                        onClick={() => setSelectedEvidenceId(ev.id)}
                        className={`border-b border-white/05 cursor-pointer hover:bg-white/02 transition-colors ${
                          isSelected ? 'bg-sift-cyan/05 border-l-2 border-l-sift-cyan' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-white max-w-[180px] truncate">{ev.filename}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-sift-green select-all">{truncateHash(ev.sha256, 12)}</td>
                        <td className="px-4 py-3 font-mono text-sift-muted">{formatBytes(ev.sizeBytes)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge 
                            status={ev.status.toUpperCase()} 
                            variant={ev.status === 'verified' ? 'success' : 'warning'} 
                            className="text-[8px]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Custody Chain details */}
        <div>
          {selectedEvidence ? (
            <GlassPanel className="p-5 space-y-5 border border-sift-cyan/15">
              <div>
                <span className="text-[9px] font-mono text-sift-muted">File ID: {selectedEvidence.id}</span>
                <h4 className="text-sm font-bold text-white mt-1 truncate font-mono">{selectedEvidence.filename}</h4>
                <div className="flex items-center gap-1.5 mt-2">
                  <Database size={12} className="text-sift-cyan" />
                  <span className="text-xs text-white/80 font-mono text-[10px]">{selectedEvidence.type.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
              </div>

              {/* Hash Registry details */}
              <div className="space-y-2 border-t border-white/08 pt-4">
                <span className="text-[10px] font-mono text-sift-muted uppercase">Verification Hashes</span>
                <div className="space-y-2 text-[10px] font-mono">
                  <div className="p-2 border border-white/05 rounded bg-white/[0.01]">
                    <p className="text-[8px] text-sift-muted">SHA-256</p>
                    <p className="text-sift-green font-semibold break-all mt-0.5 select-all">{selectedEvidence.sha256}</p>
                  </div>
                  <div className="p-2 border border-white/05 rounded bg-white/[0.01]">
                    <p className="text-[8px] text-sift-muted">MD5</p>
                    <p className="text-sift-muted break-all mt-0.5 select-all">{selectedEvidence.md5}</p>
                  </div>
                </div>
              </div>

              {/* Custody Event Logs */}
              <div className="border-t border-white/08 pt-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Key size={13} className="text-sift-cyan" />
                  <span>Chain of Custody Ledger</span>
                </div>
                
                <div className="space-y-3">
                  {selectedEvidence.custodyChain.map((event, idx) => (
                    <div key={idx} className="flex gap-2.5 text-xs">
                      <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sift-cyan" />
                        {idx < selectedEvidence.custodyChain.length - 1 && <div className="w-0.5 flex-1 bg-white/10 my-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-sift-muted">{formatDateTime(event.timestamp)}</p>
                        <p className="text-white font-medium mt-0.5">{event.action} – {event.actor}</p>
                        {event.notes && <p className="text-sift-muted text-[10px] italic mt-0.5 leading-relaxed">{event.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          ) : (
            <div className="text-center text-sift-muted font-mono text-xs py-20">Select an evidence item to audit custody.</div>
          )}
        </div>

      </div>
    </div>
  );
}
