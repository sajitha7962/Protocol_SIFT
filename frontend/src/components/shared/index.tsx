import React from 'react';
import { cn } from '../../lib/utils';

// ── MetricCard ────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'cyan' | 'green' | 'red' | 'warning' | 'primary';
  trend?: { value: number; label: string };
  className?: string;
  sublabel?: string;
}

export function MetricCard({ label, value, icon, accent = 'cyan', trend, className, sublabel }: MetricCardProps) {
  const accentMap = {
    cyan:    { text: 'text-sift-cyan',    bg: 'bg-sift-cyan/10',    border: 'border-sift-cyan/20' },
    green:   { text: 'text-sift-green',   bg: 'bg-sift-green/10',   border: 'border-sift-green/20' },
    red:     { text: 'text-sift-danger',  bg: 'bg-sift-danger/10',  border: 'border-sift-danger/20' },
    warning: { text: 'text-sift-warning', bg: 'bg-sift-warning/10', border: 'border-sift-warning/20' },
    primary: { text: 'text-sift-primary', bg: 'bg-sift-primary/10', border: 'border-sift-primary/20' },
  };
  const colors = accentMap[accent];

  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono uppercase tracking-widest text-sift-muted mb-2">{label}</p>
          <p className={cn('text-3xl font-bold tabular-nums', colors.text)}>{value}</p>
          {sublabel && <p className="text-xs text-sift-muted mt-1">{sublabel}</p>}
          {trend && (
            <p className={cn('text-xs font-mono mt-2', trend.value >= 0 ? 'text-sift-green' : 'text-sift-danger')}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg border', colors.bg, colors.border, colors.text)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, icon, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-sift-cyan">{icon}</span>}
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {description && <p className="text-xs text-sift-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, description, action, badge, icon }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-lg bg-sift-cyan/10 border border-sift-cyan/20 text-sift-cyan">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-sm text-sift-muted mt-1">{description}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sift-muted mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-sift-muted max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── LoadingSkeleton ───────────────────────────────────────────
export function LoadingSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────
interface ProgressBarProps { value: number; color?: string; className?: string; showLabel?: boolean; }
export function ProgressBar({ value, color = '#4cd7f6', className, showLabel = false }: ProgressBarProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="progress-bar flex-1">
        <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
      </div>
      {showLabel && <span className="text-xs font-mono text-sift-muted w-8 text-right">{value}%</span>}
    </div>
  );
}

// ── SearchInput ────────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sift-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="sift-input pl-9"
      />
    </div>
  );
}
