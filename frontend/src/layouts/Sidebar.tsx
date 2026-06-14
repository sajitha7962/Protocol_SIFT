import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';
import { useCaseStore } from '../stores/caseStore';
import { AgentStatusIndicator } from '../components/shared/ActivityFeed';
import {
  LayoutDashboard, FolderPlus, Database, GitBranch,
  Network, Search, AlertTriangle, Clock, Shield,
  Share2, CheckCircle, RotateCcw, BarChart3,
  Wrench, Activity, ScrollText, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV = [
  {
    title: 'Investigation',
    items: [
      { label: 'Dashboard',        path: '/',                 icon: LayoutDashboard },
      { label: 'New Case Intake',  path: '/new-case',         icon: FolderPlus },
      { label: 'Evidence Sources', path: '/evidence',         icon: Database },
      { label: 'Agent Workflow',   path: '/agent-workflow',   icon: GitBranch },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { label: 'Correlation',       path: '/correlations',   icon: Network },
      { label: 'Findings',          path: '/findings',       icon: Search },
      { label: 'Contradictions',    path: '/contradictions', icon: AlertTriangle },
      { label: 'Timeline',          path: '/timeline',       icon: Clock },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'Threat Intel',      path: '/threat-intel',   icon: Shield },
      { label: 'Knowledge Graph',   path: '/knowledge-graph',icon: Share2 },
    ],
  },
  {
    title: 'Validation',
    items: [
      { label: 'Evidence Integrity',path: '/integrity',      icon: CheckCircle },
      { label: 'Reasoning Trace',   path: '/reasoning',      icon: GitBranch },
      { label: 'Self Correction',   path: '/self-correction',icon: RotateCcw },
      { label: 'Confidence Score',  path: '/confidence',     icon: BarChart3 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Forensic Tools',    path: '/forensic-tools', icon: Wrench },
      { label: 'Agent Monitor',     path: '/agent-monitor',  icon: Activity },
      { label: 'Audit Logs',        path: '/audit-logs',     icon: ScrollText },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { label: 'Final Report',      path: '/report',         icon: FileText },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { state: agentState } = useAgentStore();
  const { getSelectedCase } = useCaseStore();
  const selectedCase = getSelectedCase();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300 ease-in-out',
        'border-r border-white/[0.08]',
        'bg-[#090e1c]/95 backdrop-blur-xl',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-white/[0.08]', sidebarCollapsed && 'justify-center')}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-sift-primary/40 to-sift-cyan/20 border border-sift-cyan/30 flex items-center justify-center">
          <span className="text-sift-cyan font-bold text-sm">S</span>
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">Protocol SIFT</p>
            <p className="text-[10px] font-mono text-sift-muted mt-0.5">DFIR PLATFORM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        {NAV.map((section) => (
          <div key={section.title} className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 px-3 mb-1.5">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'nav-item',
                    isActive && 'active',
                    sidebarCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate text-[13px]">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom widgets */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-t border-white/[0.08] space-y-2">
          {/* Agent status */}
          <AgentStatusIndicator
            status={agentState.status}
            currentAction={agentState.currentAction}
          />
          {/* Active case */}
          {selectedCase && (
            <div className="glass rounded-lg px-3 py-2">
              <p className="text-[10px] font-mono text-sift-muted uppercase tracking-wide">Active Case</p>
              <p className="text-xs text-white font-medium truncate mt-0.5">{selectedCase.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="progress-bar flex-1 h-1">
                  <div className="progress-fill h-1" style={{ width: `${selectedCase.overall_confidence}%`, background: '#4cd7f6' }} />
                </div>
                <span className="text-[9px] font-mono font-bold text-sift-green">{selectedCase.overall_confidence}% CONF</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-white/15 bg-[#0e1322] flex items-center justify-center text-sift-muted hover:text-white hover:border-sift-cyan/40 transition-colors z-10"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
