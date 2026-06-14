import { cn, formatRelativeTime } from '../../lib/utils';
import type { AgentActivity } from '../../types';

const typeConfig = {
  info:      { dot: 'bg-sift-cyan',    icon: 'ℹ', text: 'text-sift-cyan' },
  success:   { dot: 'bg-sift-green',   icon: '✓', text: 'text-sift-green' },
  warning:   { dot: 'bg-sift-warning', icon: '⚠', text: 'text-sift-warning' },
  error:     { dot: 'bg-sift-danger',  icon: '✕', text: 'text-sift-danger' },
  discovery: { dot: 'bg-sift-primary', icon: '◆', text: 'text-sift-primary' },
};

interface ActivityFeedProps {
  activities: AgentActivity[];
  maxItems?: number;
  className?: string;
}

export function ActivityFeed({ activities, maxItems = 20, className }: ActivityFeedProps) {
  const items = activities.slice(0, maxItems);
  return (
    <div className={cn('space-y-0 overflow-hidden', className)}>
      {items.map((activity, idx) => {
        const cfg = typeConfig[activity.type];
        return (
          <div
            key={activity.id}
            className={cn(
              'flex items-start gap-3 py-2.5 px-3 border-b border-white/5 last:border-0 transition-all duration-300',
              idx === 0 && 'bg-white/[0.03] animate-fade-in'
            )}
          >
            <div className="flex flex-col items-center mt-1.5 gap-1 flex-shrink-0">
              <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot,
                idx === 0 && (activity.type === 'info' || activity.type === 'success') ? 'animate-pulse2' : ''
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 leading-snug">{activity.message}</p>
              <p className="text-[10px] font-mono text-sift-muted mt-0.5">
                {formatRelativeTime(activity.timestamp)}
                {activity.stage && <span className="ml-2 text-white/30">· {activity.stage.replace(/_/g, ' ')}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AgentStatusIndicator ──────────────────────────────────────
interface AgentStatusIndicatorProps {
  status: string;
  currentAction?: string;
  compact?: boolean;
}

export function AgentStatusIndicator({ status, currentAction, compact = false }: AgentStatusIndicatorProps) {
  const statusMap: Record<string, { label: string; dot: string; text: string }> = {
    analyzing:   { label: 'ANALYZING',   dot: 'online',  text: 'text-sift-green' },
    correlating: { label: 'CORRELATING', dot: 'online',  text: 'text-sift-cyan' },
    validating:  { label: 'VALIDATING',  dot: 'online',  text: 'text-sift-primary' },
    reporting:   { label: 'REPORTING',   dot: 'online',  text: 'text-sift-primary' },
    idle:        { label: 'IDLE',        dot: 'idle',    text: 'text-sift-muted' },
    paused:      { label: 'PAUSED',      dot: 'warning', text: 'text-sift-warning' },
    error:       { label: 'ERROR',       dot: 'offline', text: 'text-sift-danger' },
  };
  const cfg = statusMap[status] ?? statusMap.idle;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn('pulse-dot', cfg.dot)} />
        <span className={cn('text-xs font-mono font-semibold', cfg.text)}>{cfg.label}</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={cn('pulse-dot', cfg.dot)} />
        <div>
          <p className={cn('text-xs font-mono font-bold', cfg.text)}>AGENT · {cfg.label}</p>
          {currentAction && <p className="text-[10px] text-sift-muted truncate max-w-[180px]">{currentAction}</p>}
        </div>
      </div>
    </div>
  );
}
