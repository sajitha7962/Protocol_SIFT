import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUIStore } from '../stores/uiStore';
import { useAgentActivity } from '../hooks/useAgentActivity';
import { cn } from '../lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/':               'Dashboard',
  '/new-case':       'New Case Intake',
  '/evidence':       'Evidence Sources',
  '/agent-workflow': 'Agent Workflow',
  '/correlations':   'Correlation Dashboard',
  '/findings':       'Findings Explorer',
  '/contradictions': 'Contradiction Detector',
  '/timeline':       'Investigation Timeline',
  '/threat-intel':   'Threat Intelligence',
  '/knowledge-graph':'Knowledge Graph',
  '/integrity':      'Evidence Integrity',
  '/reasoning':      'Agent Reasoning Trace',
  '/self-correction':'Self Correction Loop',
  '/confidence':     'Confidence Scoring',
  '/forensic-tools': 'Forensic Tools',
  '/agent-monitor':  'Agent Monitor',
  '/audit-logs':     'Audit Logs',
  '/report':         'Final Report',
};

export function AppShell() {
  const { sidebarCollapsed, setActivePageTitle } = useUIStore();
  const location = useLocation();

  // Start real-time agent simulation
  useAgentActivity(5000);

  // Update page title on route change
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] ?? 'Protocol SIFT';
    setActivePageTitle(title);
    document.title = `${title} · Protocol SIFT`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-sift-bg">
      <Sidebar />
      <div
        className="transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '240px' }}
      >
        <Topbar />
        <main
          className={cn('min-h-screen pt-14 p-6')}
          id="main-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
