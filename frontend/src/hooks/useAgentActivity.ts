import { useEffect, useRef } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { AgentActivity } from '../types';

const ACTIVITY_POOL: Omit<AgentActivity, 'id' | 'timestamp'>[] = [
  { type: 'info',      message: 'Agent analyzing memory dump artifacts...', stage: 'artifact_extraction' },
  { type: 'success',   message: 'YARA scan completed – 3 rules matched', stage: 'artifact_extraction' },
  { type: 'discovery', message: 'New correlation discovered between ev-001 and ev-002', stage: 'correlation' },
  { type: 'info',      message: 'Threat intelligence lookup: 185.220.101.47 → AbuseIPDB', stage: 'threat_analysis' },
  { type: 'warning',   message: 'Contradiction detected: process discrepancy in memory vs logs', stage: 'contradiction_detection' },
  { type: 'info',      message: 'Confidence score updated: find-001 → 94%', stage: 'confidence_scoring' },
  { type: 'success',   message: 'Chainsaw: 142 Sigma rule matches in event logs', stage: 'artifact_extraction' },
  { type: 'info',      message: 'Running self-correction loop on finding find-004...', stage: 'self_correction' },
  { type: 'discovery', message: 'Lateral movement path confirmed: WS04 → SRV01 → FS02', stage: 'correlation' },
  { type: 'info',      message: 'Zeek analysis: 847 TLS connections to C2 IP', stage: 'artifact_extraction' },
  { type: 'success',   message: 'Evidence integrity re-verified: SHA256 matches for all sources', stage: 'evidence_intake' },
  { type: 'warning',   message: 'Low confidence finding – requesting additional evidence', stage: 'self_correction' },
  { type: 'info',      message: 'MITRE ATT&CK mapping: T1003.001 (LSASS Memory)', stage: 'threat_analysis' },
  { type: 'discovery', message: 'New IOC identified: update.microsoftsecurity-cdn.com', stage: 'threat_analysis' },
  { type: 'info',      message: 'Volatility3: malfind detected injected DLL at 0x0000567C1000', stage: 'artifact_extraction' },
];

let activityCounter = 100;

export function useAgentActivity(intervalMs = 4000) {
  const { addActivity, isSimulating, setSimulating } = useAgentStore();
  const { add: addNotification } = useNotificationStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSimulating) return;
    setSimulating(true);

    timerRef.current = setInterval(() => {
      const template = ACTIVITY_POOL[Math.floor(Math.random() * ACTIVITY_POOL.length)];
      const activity: AgentActivity = {
        ...template,
        id: `act-live-${activityCounter++}`,
        timestamp: new Date().toISOString(),
      };
      addActivity(activity);

      // Occasionally push a notification for important events
      if (template.type === 'discovery' || template.type === 'warning') {
        addNotification({
          type: template.type === 'discovery' ? 'info' : 'warning',
          title: template.type === 'discovery' ? 'New Discovery' : 'Agent Warning',
          message: template.message,
          caseId: 'case-001',
        });
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSimulating(false);
    };
  }, []);
}
