import React from 'react';
import { SeverityBadge } from './Badges';
import { GlassPanel } from './GlassPanel';
import { ShieldAlert, Terminal, Network, Key, ArrowRight } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import type { TimelineEvent } from '../../types';

interface TimelineEventCardProps {
  event: TimelineEvent;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TimelineEventCard({ event, isFirst = false, isLast = false }: TimelineEventCardProps) {
  const getIcon = () => {
    switch (event.eventType) {
      case 'initial_access': return <Network className="text-sift-cyan" size={14} />;
      case 'execution': return <Terminal className="text-sift-warning" size={14} />;
      case 'privilege_escalation': return <Key className="text-sift-danger" size={14} />;
      default: return <ShieldAlert className="text-sift-primary" size={14} />;
    }
  };

  return (
    <div className="flex gap-4 relative">
      {/* Visual Timeline Line connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-3 h-3 rounded-full border border-white/20 flex items-center justify-center bg-sift-bg z-10`}>
          <div className={`w-1.5 h-1.5 rounded-full ${event.severity === 'critical' ? 'bg-sift-danger' : event.severity === 'high' ? 'bg-sift-warning' : 'bg-sift-cyan'}`} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-white/10 my-1" />}
      </div>

      <div className="flex-1 pb-6">
        <GlassPanel className="p-4 border border-white/08 hover:border-white/15 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-mono text-sift-muted">
              {formatDateTime(event.timestamp)}
            </span>
            <div className="flex items-center gap-2">
              {event.attackPhase && (
                <span className="text-[9px] font-mono uppercase bg-white/5 text-sift-muted px-1.5 py-0.5 rounded border border-white/10">
                  {event.attackPhase}
                </span>
              )}
              <SeverityBadge severity={event.severity} className="text-[9px] px-2 py-0" />
            </div>
          </div>

          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
            {getIcon()}
            {event.title}
          </h4>
          <p className="text-[11px] text-sift-muted mt-1 leading-relaxed">{event.description}</p>

          {(event.sourceHost || event.destHost) && (
            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/05 text-[10px] font-mono text-sift-muted">
              {event.sourceHost && (
                <>
                  <span className="text-white">{event.sourceHost}</span>
                </>
              )}
              {event.destHost && (
                <>
                  <ArrowRight size={10} className="text-sift-muted" />
                  <span className="text-white">{event.destHost}</span>
                </>
              )}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
