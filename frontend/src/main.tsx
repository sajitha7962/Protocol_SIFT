import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';

// Existing Pages
import Dashboard from './pages/Dashboard';
import NewCaseIntake from './pages/NewCaseIntake';
import EvidenceSources from './pages/EvidenceSources';

// Phase 1 Pages
import InvestigationWorkspace from './pages/InvestigationWorkspace';
import AgentWorkflow from './pages/AgentWorkflow';
import InvestigationTimeline from './pages/InvestigationTimeline';

// Phase 2 Pages
import FindingsExplorer from './pages/FindingsExplorer';
import ContradictionDetector from './pages/ContradictionDetector';
import AgentReasoningTrace from './pages/AgentReasoningTrace';
import ConfidenceScoring from './pages/ConfidenceScoring';

// Phase 3 Pages
import KnowledgeGraph from './pages/KnowledgeGraph';
import ThreatIntelligence from './pages/ThreatIntelligence';
import SelfCorrectionLoop from './pages/SelfCorrectionLoop';
import AgentMonitor from './pages/AgentMonitor';

// Phase 4 Pages
import AuditLogs from './pages/AuditLogs';
import EvidenceIntegrity from './pages/EvidenceIntegrity';
import FinalReport from './pages/FinalReport';

import './index.css';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Failed to find the root element "#app"');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {/* Core Dashboard */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-case" element={<NewCaseIntake />} />
          <Route path="/evidence" element={<EvidenceSources />} />
          
          {/* Phase 1 */}
          <Route path="/investigation/:id" element={<InvestigationWorkspace />} />
          <Route path="/agent-workflow" element={<AgentWorkflow />} />
          <Route path="/timeline" element={<InvestigationTimeline />} />
          
          {/* Phase 2 */}
          <Route path="/findings" element={<FindingsExplorer />} />
          <Route path="/contradictions" element={<ContradictionDetector />} />
          <Route path="/reasoning" element={<AgentReasoningTrace />} />
          <Route path="/confidence" element={<ConfidenceScoring />} />
          
          {/* Phase 3 */}
          <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
          <Route path="/threat-intel" element={<ThreatIntelligence />} />
          <Route path="/self-correction" element={<SelfCorrectionLoop />} />
          <Route path="/agent-monitor" element={<AgentMonitor />} />
          
          {/* Phase 4 */}
          <Route path="/forensic-tools" element={<AgentMonitor />} /> {/* Re-routed tool console to monitor/tool execution */}
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/integrity" element={<EvidenceIntegrity />} />
          <Route path="/report" element={<FinalReport />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
