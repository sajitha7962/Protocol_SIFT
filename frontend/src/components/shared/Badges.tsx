import { cn, severityBgClass } from '../../lib/utils';
import type { Severity } from '../../types';

interface SeverityBadgeProps { severity: Severity; className?: string; }
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span className={cn(severityBgClass(severity), className)}>
      {severity.toUpperCase()}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
  pulse?: boolean;
}
export function StatusBadge({ status, variant = 'neutral', pulse = false, className }: StatusBadgeProps) {
  const variantMap = {
    success: 'text-sift-green bg-sift-green/10 border-sift-green/25',
    warning: 'text-sift-warning bg-sift-warning/10 border-sift-warning/25',
    danger:  'text-sift-danger bg-sift-danger/10 border-sift-danger/25',
    info:    'text-sift-cyan bg-sift-cyan/10 border-sift-cyan/25',
    neutral: 'text-sift-muted bg-white/5 border-white/10',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-full border', variantMap[variant], className)}>
      {pulse && <span className={cn('w-1.5 h-1.5 rounded-full', { 'bg-sift-green animate-pulse2': variant === 'success', 'bg-sift-warning animate-pulse2': variant === 'warning', 'bg-sift-danger': variant === 'danger', 'bg-sift-cyan animate-pulse2': variant === 'info', 'bg-sift-muted': variant === 'neutral' })} />}
      {status}
    </span>
  );
}

interface ConfidenceBadgeProps { score: number; className?: string; }
export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  const color = score >= 85 ? 'text-sift-green border-sift-green/30 bg-sift-green/10'
    : score >= 65 ? 'text-sift-warning border-sift-warning/30 bg-sift-warning/10'
    : 'text-sift-danger border-sift-danger/30 bg-sift-danger/10';
  return (
    <span className={cn('text-xs font-mono font-semibold px-2 py-0.5 rounded-full border', color, className)}>
      {score}%
    </span>
  );
}
