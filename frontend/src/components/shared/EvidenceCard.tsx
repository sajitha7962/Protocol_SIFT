import React from 'react';
import { Database, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { StatusBadge } from './Badges';
import { formatBytes, formatDate } from '../../lib/utils';
import type { Evidence } from '../../types';

interface EvidenceCardProps {
  evidence: Evidence;
  onClick?: () => void;
  selected?: boolean;
}

export function EvidenceCard({ evidence, onClick, selected = false }: EvidenceCardProps) {
  const isVerified = evidence.status === 'verified';
  return (
    <GlassPanel
      onClick={onClick}
      hover
      className={`p-4 border ${selected ? 'border-sift-cyan/50 bg-sift-cyan/5' : 'border-white/10'}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isVerified ? 'bg-sift-green/10 text-sift-green' : 'bg-sift-warning/10 text-sift-warning'}`}>
          <Database size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate" title={evidence.filename}>
            {evidence.filename}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-sift-muted">
            <span>{evidence.type.replace(/_/g, ' ').toUpperCase()}</span>
            <span>·</span>
            <span>{formatBytes(evidence.sizeBytes)}</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-sift-muted">Src: {evidence.source}</span>
            <StatusBadge
              status={evidence.status.toUpperCase()}
              variant={isVerified ? 'success' : 'warning'}
              pulse={evidence.status === 'analyzing'}
              className="text-[9px] px-1.5 py-0"
            />
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
