import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Severity } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function truncateHash(hash: string, chars = 16): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export function severityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: '#ff5c7c',
    high:     '#ffb84d',
    medium:   '#4cd7f6',
    low:      '#4edea3',
    info:     '#adc6ff',
  };
  return map[severity];
}

export function severityBgClass(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: 'badge-critical',
    high:     'badge-high',
    medium:   'badge-medium',
    low:      'badge-low',
    info:     'badge-info',
  };
  return map[severity];
}

export function confidenceColor(score: number): string {
  if (score >= 85) return '#4edea3';
  if (score >= 65) return '#ffb84d';
  return '#ff5c7c';
}

export function agentStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    evidence_intake:         'Evidence Intake',
    classification:          'Classification',
    tool_selection:          'Tool Selection',
    artifact_extraction:     'Artifact Extraction',
    correlation:             'Correlation',
    threat_analysis:         'Threat Analysis',
    validation:              'Validation',
    contradiction_detection: 'Contradiction Detection',
    self_correction:         'Self Correction',
    confidence_scoring:      'Confidence Scoring',
    report_generation:       'Report Generation',
  };
  return labels[stage] ?? stage;
}
