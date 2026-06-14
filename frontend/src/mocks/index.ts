import type { Case, Evidence, Finding, Correlation, ThreatIntel, TimelineEvent, Contradiction, ConfidenceScore, AgentActivity, AgentState, ForensicToolRun, GraphNode, GraphEdge, AuditLog, Report, User } from '../types';

// ── Users ─────────────────────────────────────────────────────
export const mockUsers: User[] = [
  { id: 'u1', name: 'Dr. Sarah Chen', email: 'schen@soc.gov', role: 'investigator', lastLogin: '2026-06-12T14:20:00Z' },
  { id: 'u2', name: 'Marcus Williams', email: 'mwilliams@soc.gov', role: 'analyst', lastLogin: '2026-06-12T13:00:00Z' },
  { id: 'u3', name: 'Priya Patel', email: 'ppatel@soc.gov', role: 'admin', lastLogin: '2026-06-12T12:00:00Z' },
];

// ── Cases ─────────────────────────────────────────────────────
export const mockCases: Case[] = [
  {
    id: 'case-001',
    title: 'Operation Black Helix',
    description: 'Suspected APT intrusion via supply chain compromise. Multiple endpoints affected across financial sector. Evidence of lateral movement and credential dumping detected.',
    status: 'active', severity: 'critical', createdBy: 'u1', assignedTo: ['u1','u2'],
    createdAt: '2026-06-10T08:00:00Z', updatedAt: '2026-06-12T14:30:00Z',
    evidenceCount: 12, findingsCount: 8, criticalCount: 3,
    overallConfidence: 82, threatScore: 91,
    tags: ['apt', 'supply-chain', 'financial', 'credential-dumping'],
  },
  {
    id: 'case-002',
    title: 'Ransomware Incident – ACME Corp',
    description: 'LockBit 3.0 ransomware deployment. Estimated 3,400 files encrypted. Initial access via phishing email with malicious macro attachment.',
    status: 'active', severity: 'critical', createdBy: 'u2', assignedTo: ['u2'],
    createdAt: '2026-06-11T10:30:00Z', updatedAt: '2026-06-12T16:00:00Z',
    evidenceCount: 7, findingsCount: 5, criticalCount: 2,
    overallConfidence: 74, threatScore: 88,
    tags: ['ransomware', 'lockbit', 'phishing', 'encryption'],
  },
  {
    id: 'case-003',
    title: 'Insider Threat – Data Exfiltration',
    description: 'Anomalous data transfer patterns detected from privileged account. 4.2GB transferred to external cloud storage. Investigation ongoing.',
    status: 'active', severity: 'high', createdBy: 'u1', assignedTo: ['u1','u3'],
    createdAt: '2026-06-08T15:00:00Z', updatedAt: '2026-06-12T11:00:00Z',
    evidenceCount: 5, findingsCount: 3, criticalCount: 1,
    overallConfidence: 67, threatScore: 74,
    tags: ['insider-threat', 'exfiltration', 'privileged-access'],
  },
  {
    id: 'case-004',
    title: 'Web Application Breach – Portal X',
    description: 'SQL injection attack leading to database dump. Customer PII potentially exposed. Attacker used Tor exit nodes.',
    status: 'completed', severity: 'high', createdBy: 'u3', assignedTo: ['u2','u3'],
    createdAt: '2026-06-05T09:00:00Z', updatedAt: '2026-06-10T17:00:00Z',
    evidenceCount: 9, findingsCount: 6, criticalCount: 2,
    overallConfidence: 94, threatScore: 85,
    tags: ['sqli', 'web-breach', 'pii', 'tor'],
  },
];

// ── Evidence ──────────────────────────────────────────────────
export const mockEvidence: Evidence[] = [
  {
    id: 'ev-001', caseId: 'case-001',
    type: 'memory_dump', filename: 'WIN-SRV01_mem_20260612.raw', originalName: 'memory.raw',
    sha256: 'a3f8c2e1d4b7a9f0c3e6d8b2a5f7c1e4d6b8a0c2e5d7b9a1c3e6d8b0a2c4e6d8',
    md5: 'b4c8d2f6a0e4b8c2d6f0a4b8c2d6f0a4',
    sizeBytes: 8589934592, source: 'WIN-SRV01.domain.local',
    status: 'verified', uploadedAt: '2026-06-12T09:00:00Z', uploadedBy: 'u1',
    verifiedAt: '2026-06-12T09:05:00Z',
    custodyChain: [
      { timestamp: '2026-06-12T08:45:00Z', action: 'Acquisition', actor: 'Dr. Sarah Chen', hash: 'a3f8c2e1d4b7a9f0', notes: 'Live memory acquisition via WinPmem' },
      { timestamp: '2026-06-12T09:00:00Z', action: 'Upload', actor: 'Dr. Sarah Chen', hash: 'a3f8c2e1d4b7a9f0' },
      { timestamp: '2026-06-12T09:05:00Z', action: 'Verification', actor: 'SYSTEM', hash: 'a3f8c2e1d4b7a9f0' },
    ],
    linkedFindings: ['find-001','find-003'],
    metadata: { os: 'Windows Server 2022', kernel: '10.0.20348', architecture: 'x64', captureTime: '2026-06-12T08:45:00Z' },
  },
  {
    id: 'ev-002', caseId: 'case-001',
    type: 'log_file', filename: 'Security_EventLogs_20260612.evtx', originalName: 'Security.evtx',
    sha256: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    md5: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    sizeBytes: 245760000, source: 'WIN-DC01.domain.local',
    status: 'verified', uploadedAt: '2026-06-12T09:10:00Z', uploadedBy: 'u1',
    verifiedAt: '2026-06-12T09:12:00Z',
    custodyChain: [
      { timestamp: '2026-06-12T09:10:00Z', action: 'Upload', actor: 'Dr. Sarah Chen', hash: 'c1d2e3f4a5b6c7d8' },
      { timestamp: '2026-06-12T09:12:00Z', action: 'Verification', actor: 'SYSTEM', hash: 'c1d2e3f4a5b6c7d8' },
    ],
    linkedFindings: ['find-002','find-004'],
    metadata: { logSource: 'Windows Event Log', eventCount: '142,847', timeRange: '30 days', hostname: 'WIN-DC01' },
  },
  {
    id: 'ev-003', caseId: 'case-001',
    type: 'pcap', filename: 'network_capture_20260612.pcap', originalName: 'capture.pcap',
    sha256: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
    md5: 'f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
    sizeBytes: 524288000, source: 'CoreSwitch-01',
    status: 'verified', uploadedAt: '2026-06-12T09:20:00Z', uploadedBy: 'u2',
    verifiedAt: '2026-06-12T09:25:00Z',
    custodyChain: [
      { timestamp: '2026-06-12T09:20:00Z', action: 'Upload', actor: 'Marcus Williams', hash: 'd4e5f6a7b8c9d0e1' },
      { timestamp: '2026-06-12T09:25:00Z', action: 'Verification', actor: 'SYSTEM', hash: 'd4e5f6a7b8c9d0e1' },
    ],
    linkedFindings: ['find-005'],
    metadata: { captureInterface: 'eth0', packetCount: '2,847,293', protocols: 'TCP/UDP/ICMP', duration: '6 hours' },
  },
];

// ── Findings ──────────────────────────────────────────────────
export const mockFindings: Finding[] = [
  {
    id: 'find-001', caseId: 'case-001',
    title: 'LSASS Memory Dumping – Credential Theft',
    description: 'Mimikatz executed in-memory via PowerShell reflection, targeting LSASS process to dump NTLM hashes and Kerberos tickets. PID 4892 confirmed as the injecting process.',
    severity: 'critical', status: 'confirmed',
    mitreTechnique: 'T1003.001', mitreTactics: ['Credential Access'],
    evidenceRefs: ['ev-001','ev-002'],
    confidenceScore: 94,
    timestamp: '2026-06-12T10:30:00Z', detectedAt: '2026-06-12T10:30:00Z',
    tags: ['credential-dumping', 'mimikatz', 'lsass'],
    reasoning: {
      observation: 'Process PID 4892 (powershell.exe) opened a handle to lsass.exe with PROCESS_VM_READ access.',
      evidence: 'Memory dump analysis (ev-001) confirms reflective DLL injection. Event ID 4656 in Security logs (ev-002) records the LSASS handle acquisition.',
      inference: 'Access pattern and DLL signatures match Mimikatz sekurlsa::logonpasswords execution.',
      validation: 'YARA rule MIMIKATZ_CRYPTO matched 3 memory regions. Cross-referenced with Sysmon event log showing identical process tree.',
      conclusion: 'High-confidence credential dumping via Mimikatz confirmed. NTLM hashes for 14 domain accounts likely extracted.',
      validationSteps: [
        { step: 1, action: 'YARA scan on memory dump', result: 'MIMIKATZ_CRYPTO matched', passed: true, timestamp: '2026-06-12T10:31:00Z' },
        { step: 2, action: 'Cross-reference event logs', result: 'Event 4656 confirmed LSASS handle', passed: true, timestamp: '2026-06-12T10:32:00Z' },
        { step: 3, action: 'Network correlation check', result: 'No external C2 at this point', passed: true, timestamp: '2026-06-12T10:33:00Z' },
      ],
    },
  },
  {
    id: 'find-002', caseId: 'case-001',
    title: 'Lateral Movement via Pass-the-Hash',
    description: 'Stolen NTLM hash used to authenticate to WIN-FS02 and WIN-BACKUP01 without plaintext credentials. Indicates attacker leveraged LSASS dump results.',
    severity: 'critical', status: 'confirmed',
    mitreTechnique: 'T1550.002', mitreTactics: ['Lateral Movement'],
    evidenceRefs: ['ev-002'],
    confidenceScore: 87,
    timestamp: '2026-06-12T10:45:00Z', detectedAt: '2026-06-12T10:45:00Z',
    tags: ['lateral-movement', 'pass-the-hash', 'authentication'],
    reasoning: {
      observation: 'Event ID 4624 (Logon Type 3) from WORKGROUP\\WIN-SRV01$ to WIN-FS02 with NTLM auth, immediately after LSASS dump.',
      evidence: 'Security event log (ev-002) shows 47 logon events from compromised account hash within 8 minutes.',
      inference: 'Sequential NTLM authentications to multiple hosts following credential theft pattern.',
      validation: 'Timeline correlation confirms events occur 12 minutes post-LSASS dump.',
      conclusion: 'Pass-the-Hash lateral movement confirmed with high confidence.',
      validationSteps: [
        { step: 1, action: 'Event log timeline analysis', result: '47 logon events in 8min window', passed: true, timestamp: '2026-06-12T10:46:00Z' },
        { step: 2, action: 'NTLM relay detection', result: 'No relay detected, direct PTH', passed: true, timestamp: '2026-06-12T10:47:00Z' },
      ],
    },
  },
  {
    id: 'find-003', caseId: 'case-001',
    title: 'Persistence via Registry Run Key',
    description: 'Malicious DLL registered as autorun in HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run under the alias "WindowsDefenderHelper".',
    severity: 'high', status: 'confirmed',
    mitreTechnique: 'T1547.001', mitreTactics: ['Persistence', 'Privilege Escalation'],
    evidenceRefs: ['ev-001'],
    confidenceScore: 91,
    timestamp: '2026-06-12T11:00:00Z', detectedAt: '2026-06-12T11:00:00Z',
    tags: ['persistence', 'registry', 'autorun'],
    reasoning: {
      observation: 'Volatility3 printkey output reveals unexpected DLL in HKLM Run key. DLL path resolves to %TEMP%\\sys64.dll.',
      evidence: 'Memory dump registry hive analysis (ev-001) confirms the key. DLL file not present on baseline.',
      inference: 'DLL masquerading as Windows Defender component to establish persistence.',
      validation: 'Hash of sys64.dll matches known Cobalt Strike beacon DLL on VirusTotal.',
      conclusion: 'Confirmed persistence mechanism via registry autorun.',
      validationSteps: [
        { step: 1, action: 'Registry hive parsing', result: 'Unexpected Run key found', passed: true, timestamp: '2026-06-12T11:01:00Z' },
        { step: 2, action: 'DLL hash lookup', result: 'VirusTotal: 54/72 AV hits', passed: true, timestamp: '2026-06-12T11:02:00Z' },
      ],
    },
  },
  {
    id: 'find-004', caseId: 'case-001',
    title: 'Data Staged for Exfiltration',
    description: 'Large compressed archives created in C:\\ProgramData\\Microsoft\\Crypto\\RSA\\ containing sensitive documents. Archive creation patterns consistent with pre-exfiltration staging.',
    severity: 'high', status: 'probable',
    mitreTechnique: 'T1560.001', mitreTactics: ['Collection'],
    evidenceRefs: ['ev-002'],
    confidenceScore: 73,
    timestamp: '2026-06-12T11:30:00Z', detectedAt: '2026-06-12T11:30:00Z',
    tags: ['staging', 'collection', 'compression'],
    reasoning: {
      observation: 'Event logs show 7-Zip creating multiple .7z archives in an unusual system directory.',
      evidence: 'Security events (ev-002) show 2.8GB compressed in 4 archives over 20 minutes.',
      inference: 'Data staging behavior consistent with pre-exfiltration preparation.',
      validation: 'Network capture needs analysis to confirm actual exfiltration occurred.',
      conclusion: 'Data staging confirmed, actual exfiltration pending network analysis.',
      validationSteps: [
        { step: 1, action: 'File creation event analysis', result: '7 archive creation events confirmed', passed: true, timestamp: '2026-06-12T11:31:00Z' },
        { step: 2, action: 'Network traffic correlation', result: 'Pending analysis', passed: false, timestamp: '2026-06-12T11:32:00Z' },
      ],
    },
  },
  {
    id: 'find-005', caseId: 'case-001',
    title: 'C2 Beaconing to Known Malicious IP',
    description: 'Periodic HTTPS connections (every 60 seconds) to 185.220.101.47 (known Tor exit node / C2 infrastructure). JA3 fingerprint matches Cobalt Strike default profile.',
    severity: 'critical', status: 'confirmed',
    mitreTechnique: 'T1071.001', mitreTactics: ['Command and Control'],
    evidenceRefs: ['ev-003'],
    confidenceScore: 96,
    timestamp: '2026-06-12T12:00:00Z', detectedAt: '2026-06-12T12:00:00Z',
    tags: ['c2', 'beaconing', 'cobalt-strike', 'tor'],
    reasoning: {
      observation: 'PCAP analysis reveals perfectly timed 60-second interval HTTPS requests to 185.220.101.47.',
      evidence: 'Network capture (ev-003) shows 847 connections over 14 hours. JA3: 72a7c4bb36.',
      inference: 'Beaconing behavior with Cobalt Strike JA3 fingerprint indicates active C2 channel.',
      validation: 'IP confirmed malicious on AbuseIPDB (score 100) and OTX with 12 associated threat reports.',
      conclusion: 'Active Cobalt Strike C2 channel confirmed with very high confidence.',
      validationSteps: [
        { step: 1, action: 'JA3 fingerprint analysis', result: 'Matches Cobalt Strike default', passed: true, timestamp: '2026-06-12T12:01:00Z' },
        { step: 2, action: 'IP reputation lookup', result: 'AbuseIPDB score: 100/100', passed: true, timestamp: '2026-06-12T12:02:00Z' },
        { step: 3, action: 'Beacon interval analysis', result: 'Consistent 60s interval confirmed', passed: true, timestamp: '2026-06-12T12:03:00Z' },
      ],
    },
  },
];

// ── Correlations ──────────────────────────────────────────────
export const mockCorrelations: Correlation[] = [
  { id: 'corr-001', caseId: 'case-001', findingAId: 'find-001', findingBId: 'find-002', evidenceIds: ['ev-001','ev-002'], strength: 0.94, linkType: 'causal', description: 'LSASS credential dump directly enabled Pass-the-Hash lateral movement', discoveredAt: '2026-06-12T11:00:00Z' },
  { id: 'corr-002', caseId: 'case-001', findingAId: 'find-002', findingBId: 'find-004', evidenceIds: ['ev-002'], strength: 0.78, linkType: 'temporal', description: 'Lateral movement to file server preceded data staging activity by 8 minutes', discoveredAt: '2026-06-12T11:15:00Z' },
  { id: 'corr-003', caseId: 'case-001', findingAId: 'find-003', findingBId: 'find-005', evidenceIds: ['ev-001','ev-003'], strength: 0.86, linkType: 'shared_artifact', description: 'Persistence DLL (sys64.dll) is same Cobalt Strike beacon establishing C2 channel', discoveredAt: '2026-06-12T12:15:00Z' },
  { id: 'corr-004', caseId: 'case-001', findingAId: 'find-004', findingBId: 'find-005', evidenceIds: ['ev-002','ev-003'], strength: 0.71, linkType: 'temporal', description: 'Data staging completed 4 minutes before C2 traffic volume spike', discoveredAt: '2026-06-12T12:30:00Z' },
];

// ── Threat Intel ──────────────────────────────────────────────
export const mockThreatIntel: ThreatIntel[] = [
  { id: 'ti-001', iocType: 'ip', value: '185.220.101.47', source: 'abuseipdb', malicious: true, riskScore: 100, threatActor: 'APT29 / Cozy Bear', campaign: 'Operation Ghost', ttps: ['T1071.001','T1573.002'], tags: ['c2','tor','apt'], lastSeen: '2026-06-12T14:00:00Z', reportedAt: '2026-06-10T00:00:00Z', description: 'Confirmed Cobalt Strike C2 server operated by APT29. Associated with multiple nation-state intrusions.', references: ['https://abuse.ch','https://otx.alienvault.com'] },
  { id: 'ti-002', iocType: 'hash', value: 'e3b0c44298fc1c149afbf4c8996fb924', source: 'virustotal', malicious: true, riskScore: 91, threatActor: 'Wizard Spider', campaign: 'LockBit 3.0', ttps: ['T1486','T1490'], tags: ['ransomware','lockbit'], lastSeen: '2026-06-11T00:00:00Z', reportedAt: '2026-06-09T00:00:00Z', description: 'LockBit 3.0 ransomware payload. 54/72 AV vendors detect as malicious.', references: ['https://virustotal.com'] },
  { id: 'ti-003', iocType: 'domain', value: 'update.microsoftsecurity-cdn.com', source: 'alienvault_otx', malicious: true, riskScore: 87, threatActor: 'APT29 / Cozy Bear', campaign: 'Operation Ghost', ttps: ['T1071.001','T1568'], tags: ['dga','c2','typosquat'], lastSeen: '2026-06-12T10:00:00Z', reportedAt: '2026-06-08T00:00:00Z', description: 'Typosquatting domain impersonating Microsoft update services. Used for second-stage payload delivery.', references: ['https://otx.alienvault.com'] },
  { id: 'ti-004', iocType: 'hash', value: 'a3f8c2e1d4b7a9f0c3e6d8b2a5f7c1e4', source: 'virustotal', malicious: true, riskScore: 95, threatActor: 'APT29 / Cozy Bear', campaign: 'Operation Ghost', ttps: ['T1059.001','T1055'], tags: ['cobalt-strike','beacon','dll'], lastSeen: '2026-06-12T09:00:00Z', reportedAt: '2026-06-11T00:00:00Z', description: 'Cobalt Strike beacon DLL (sys64.dll). Shellcode-based reflective loader with custom C2 profile.', references: ['https://virustotal.com','https://any.run'] },
];

// ── Timeline Events ────────────────────────────────────────────
export const mockTimeline: TimelineEvent[] = [
  { id: 'tl-001', caseId: 'case-001', timestamp: '2026-06-10T14:32:00Z', eventType: 'initial_access', title: 'Spear-phishing Email Delivered', description: 'Malicious email with .docm attachment delivered to 3 targets. Subject: "Q2 Financial Projections - Urgent Review"', severity: 'high', attackPhase: 'Initial Access' },
  { id: 'tl-002', caseId: 'case-001', timestamp: '2026-06-10T14:47:00Z', eventType: 'execution', title: 'Macro Execution Triggered', description: 'VBA macro executed upon document open. PowerShell spawned via WINWORD.EXE.', severity: 'high', sourceHost: 'WIN-WS04', attackPhase: 'Execution' },
  { id: 'tl-003', caseId: 'case-001', timestamp: '2026-06-10T14:49:00Z', eventType: 'c2', title: 'First C2 Beacon Established', description: 'Cobalt Strike beacon connected to 185.220.101.47:443 using HTTPS.', severity: 'critical', sourceHost: 'WIN-WS04', destHost: '185.220.101.47', attackPhase: 'Command & Control' },
  { id: 'tl-004', caseId: 'case-001', timestamp: '2026-06-10T15:12:00Z', eventType: 'discovery', title: 'Internal Network Reconnaissance', description: 'Net commands executed for domain enumeration. BloodHound-like queries against AD LDAP.', severity: 'medium', sourceHost: 'WIN-WS04', attackPhase: 'Discovery' },
  { id: 'tl-005', caseId: 'case-001', timestamp: '2026-06-10T16:30:00Z', eventType: 'privilege_escalation', title: 'Local Admin Privileges Obtained', description: 'UAC bypass via fodhelper.exe exploitation. Process now running as NT AUTHORITY\\SYSTEM.', severity: 'critical', sourceHost: 'WIN-WS04', attackPhase: 'Privilege Escalation' },
  { id: 'tl-006', caseId: 'case-001', timestamp: '2026-06-12T08:45:00Z', eventType: 'credential_access', title: 'LSASS Memory Dump', description: 'Mimikatz executed in-memory. 14 domain account NTLM hashes extracted.', severity: 'critical', evidenceId: 'ev-001', findingId: 'find-001', sourceHost: 'WIN-SRV01', attackPhase: 'Credential Access' },
  { id: 'tl-007', caseId: 'case-001', timestamp: '2026-06-12T08:57:00Z', eventType: 'lateral_movement', title: 'Lateral Movement via PTH', description: 'Attacker authenticated to WIN-FS02 and WIN-BACKUP01 using stolen NTLM hashes.', severity: 'critical', evidenceId: 'ev-002', findingId: 'find-002', sourceHost: 'WIN-SRV01', destHost: 'WIN-FS02', attackPhase: 'Lateral Movement' },
  { id: 'tl-008', caseId: 'case-001', timestamp: '2026-06-12T09:30:00Z', eventType: 'collection', title: 'Data Staging Initiated', description: '2.8GB of sensitive documents compressed into 4 encrypted archives.', severity: 'high', evidenceId: 'ev-002', findingId: 'find-004', sourceHost: 'WIN-FS02', attackPhase: 'Collection' },
  { id: 'tl-009', caseId: 'case-001', timestamp: '2026-06-12T09:34:00Z', eventType: 'exfiltration', title: 'Data Exfiltration via C2 Channel', description: 'Compressed archives uploaded via Cobalt Strike C2 channel to 185.220.101.47.', severity: 'critical', evidenceId: 'ev-003', sourceHost: 'WIN-FS02', destHost: '185.220.101.47', attackPhase: 'Exfiltration' },
];

// ── Contradictions ─────────────────────────────────────────────
export const mockContradictions: Contradiction[] = [
  { id: 'con-001', caseId: 'case-001', severity: 'high', evidenceAId: 'ev-002', evidenceBId: 'ev-001', title: 'Log-Memory Process Discrepancy', description: 'Event logs (ev-002) indicate powershell.exe (PID 4892) executed at 08:45:12. Memory analysis (ev-001) shows no powershell.exe process in the active process list at capture time 08:45:30.', conflictType: 'process_presence', status: 'investigating', resolutionRecommendation: 'Analyze process exit events in event log. Powershell may have terminated before memory capture. Consider analyzing process creation/termination events (4688/4689).', detectedAt: '2026-06-12T11:00:00Z' },
  { id: 'con-002', caseId: 'case-001', severity: 'medium', evidenceAId: 'ev-001', evidenceBId: 'ev-003', title: 'C2 IP Present in Memory but Absent in PCAP', description: 'Memory dump (ev-001) reveals 185.220.101.47 in socket connection table during capture period. Network capture (ev-003) for the same 2-minute window shows no connections to this IP.', conflictType: 'network_presence', status: 'open', resolutionRecommendation: 'Verify PCAP capture interface is on correct network segment. Check for traffic encryption or protocol obfuscation. Consider reviewing firewall logs for dropped connections.', detectedAt: '2026-06-12T12:45:00Z' },
];

// ── Agent Activity Feed ────────────────────────────────────────
export const mockAgentActivities: AgentActivity[] = [
  { id: 'act-001', timestamp: '2026-06-12T14:30:00Z', type: 'info', message: 'Agent initialized for case-001: Operation Black Helix', stage: 'evidence_intake' },
  { id: 'act-002', timestamp: '2026-06-12T14:30:15Z', type: 'info', message: 'Ingesting 3 evidence sources...', stage: 'evidence_intake' },
  { id: 'act-003', timestamp: '2026-06-12T14:31:00Z', type: 'success', message: 'Evidence integrity verified: ev-001 (SHA256 matched)', stage: 'evidence_intake' },
  { id: 'act-004', timestamp: '2026-06-12T14:31:30Z', type: 'info', message: 'Classifying evidence types: memory_dump, log_file, pcap', stage: 'classification' },
  { id: 'act-005', timestamp: '2026-06-12T14:32:00Z', type: 'info', message: 'Tool selection: Volatility3 (memory), Chainsaw (logs), Zeek (pcap)', stage: 'tool_selection' },
  { id: 'act-006', timestamp: '2026-06-12T14:35:00Z', type: 'info', message: 'Volatility3 analyzing memory dump: pslist, pstree, malfind, cmdline', stage: 'artifact_extraction' },
  { id: 'act-007', timestamp: '2026-06-12T14:40:00Z', type: 'warning', message: 'YARA scan: MIMIKATZ_CRYPTO matched in 3 memory regions', stage: 'artifact_extraction' },
  { id: 'act-008', timestamp: '2026-06-12T14:42:00Z', type: 'discovery', message: 'New finding detected: LSASS credential dumping via Mimikatz (confidence: 94%)', stage: 'correlation' },
  { id: 'act-009', timestamp: '2026-06-12T14:45:00Z', type: 'discovery', message: 'Correlation discovered: LSASS dump → Pass-the-Hash (strength: 0.94)', stage: 'correlation' },
  { id: 'act-010', timestamp: '2026-06-12T14:50:00Z', type: 'warning', message: 'Contradiction detected: Process discrepancy between logs and memory', stage: 'contradiction_detection' },
  { id: 'act-011', timestamp: '2026-06-12T14:55:00Z', type: 'info', message: 'Threat intelligence enrichment: IP 185.220.101.47 → AbuseIPDB score 100', stage: 'threat_analysis' },
  { id: 'act-012', timestamp: '2026-06-12T15:00:00Z', type: 'info', message: 'Running self-correction loop: validating finding find-004...', stage: 'self_correction' },
  { id: 'act-013', timestamp: '2026-06-12T15:02:00Z', type: 'warning', message: 'Confidence score adjusted: find-004 reduced to 73% (network evidence pending)', stage: 'confidence_scoring' },
  { id: 'act-014', timestamp: '2026-06-12T15:10:00Z', type: 'success', message: 'All findings validated. Initiating report generation.', stage: 'report_generation' },
];

export const mockAgentState: AgentState = {
  status: 'analyzing',
  currentStage: 'correlation',
  caseId: 'case-001',
  stageProgress: 68,
  overallProgress: 72,
  startedAt: '2026-06-12T14:30:00Z',
  lastUpdate: '2026-06-12T14:50:00Z',
  currentAction: 'Correlating PCAP findings with memory artifacts...',
  stageHistory: [
    { stage: 'evidence_intake', startedAt: '2026-06-12T14:30:00Z', completedAt: '2026-06-12T14:32:00Z', outcome: 'All evidence verified', duration: 120000 },
    { stage: 'classification', startedAt: '2026-06-12T14:32:00Z', completedAt: '2026-06-12T14:33:00Z', outcome: '3 evidence types classified', duration: 60000 },
    { stage: 'tool_selection', startedAt: '2026-06-12T14:33:00Z', completedAt: '2026-06-12T14:34:00Z', outcome: '6 tools selected', duration: 60000 },
    { stage: 'artifact_extraction', startedAt: '2026-06-12T14:34:00Z', completedAt: '2026-06-12T14:44:00Z', outcome: '847 artifacts extracted', duration: 600000 },
    { stage: 'correlation', startedAt: '2026-06-12T14:44:00Z', outcome: 'In progress...', duration: undefined },
  ],
};

// ── Forensic Tools ─────────────────────────────────────────────
export const mockForensicTools: ForensicToolRun[] = [
  { id: 'tool-001', tool: 'volatility3', caseId: 'case-001', evidenceId: 'ev-001', status: 'completed', startedAt: '2026-06-12T14:35:00Z', completedAt: '2026-06-12T14:42:00Z', durationMs: 420000, command: 'vol.py -f WIN-SRV01_mem.raw windows.pslist windows.malfind windows.cmdline windows.netscan', output: 'Offset(P)\tName\tPID\tPPID\tThds\tHnds\nHit: powershell.exe PID 4892\nHit: MIMIKATZ_CRYPTO match at 0x0000234A8000', artifactsExtracted: 23, errorsCount: 0, findings: ['find-001','find-003'], recommendations: ['Run memdump on PID 4892 for deeper analysis', 'Check parent process cmd.exe (PID 1244)'] },
  { id: 'tool-002', tool: 'yara', caseId: 'case-001', evidenceId: 'ev-001', status: 'completed', startedAt: '2026-06-12T14:40:00Z', completedAt: '2026-06-12T14:43:00Z', durationMs: 180000, command: 'yara -r /rules/malware/ WIN-SRV01_mem.raw', output: 'MIMIKATZ_CRYPTO: 0x0000234A8000\nMIMIKATZ_CRYPTO: 0x0000234B4000\nCOBALT_STRIKE_BEACON: 0x0000567C1000', artifactsExtracted: 5, errorsCount: 0, findings: ['find-001','find-003'], recommendations: ['Extract matched regions for static analysis'] },
  { id: 'tool-003', tool: 'chainsaw', caseId: 'case-001', evidenceId: 'ev-002', status: 'completed', startedAt: '2026-06-12T14:34:00Z', completedAt: '2026-06-12T14:37:00Z', durationMs: 180000, command: 'chainsaw hunt Security_EventLogs.evtx --rules sigma_rules/ --mapping mapping.yml', output: '[HIGH] Mimikatz Execution\n[HIGH] Pass the Hash\n[MEDIUM] Suspicious PowerShell\n[LOW] Account Logon Anomaly', artifactsExtracted: 142, errorsCount: 2, findings: ['find-002','find-004'], recommendations: ['Review 4688 events for full process command line'] },
  { id: 'tool-004', tool: 'zeek', caseId: 'case-001', evidenceId: 'ev-003', status: 'running', startedAt: '2026-06-12T14:44:00Z', durationMs: undefined, command: 'zeek -r network_capture.pcap local.zeek', output: 'Analyzing... conn.log generated\nssl.log: 847 TLS connections to 185.220.101.47\ndns.log: Suspicious query to update.microsoftsecurity-cdn.com', artifactsExtracted: 0, errorsCount: 0, findings: [], recommendations: [] },
];

// ── Knowledge Graph ─────────────────────────────────────────────
export const mockGraphNodes: GraphNode[] = [
  { id: 'n-win-ws04', type: 'host', label: 'WIN-WS04', properties: { os: 'Windows 11', ip: '192.168.1.104', compromised: true }, severity: 'critical', caseId: 'case-001' },
  { id: 'n-win-srv01', type: 'host', label: 'WIN-SRV01', properties: { os: 'Windows Server 2022', ip: '192.168.1.10', compromised: true }, severity: 'critical', caseId: 'case-001' },
  { id: 'n-win-fs02', type: 'host', label: 'WIN-FS02', properties: { os: 'Windows Server 2019', ip: '192.168.1.12', compromised: true }, severity: 'high', caseId: 'case-001' },
  { id: 'n-ps-4892', type: 'process', label: 'powershell.exe', properties: { pid: 4892, ppid: 1244, cmdline: '-enc JABzAD0ATgBlAHcA...', malicious: true }, severity: 'critical', caseId: 'case-001' },
  { id: 'n-sys64', type: 'file', label: 'sys64.dll', properties: { path: '%TEMP%\\sys64.dll', sha256: 'a3f8c2e1d4b7a9f0', malicious: true }, severity: 'critical', caseId: 'case-001' },
  { id: 'n-ip-c2', type: 'ip_address', label: '185.220.101.47', properties: { abuseScore: 100, country: 'NL', malicious: true }, severity: 'critical', caseId: 'case-001' },
  { id: 'n-domain-c2', type: 'domain', label: 'update.microsoftsecurity-cdn.com', properties: { malicious: true, type: 'typosquat' }, severity: 'high', caseId: 'case-001' },
  { id: 'n-user-admin', type: 'user', label: 'jsmith (Domain Admin)', properties: { account: 'CORP\\jsmith', compromised: true }, severity: 'high', caseId: 'case-001' },
  { id: 'n-alert-001', type: 'alert', label: 'SIEM Alert: Mimikatz', properties: { ruleId: 'SIGMA-001', severity: 'critical' }, severity: 'critical', caseId: 'case-001' },
  { id: 'n-reg-key', type: 'registry_key', label: 'HKLM\\Run\\WindowsDefenderHelper', properties: { value: '%TEMP%\\sys64.dll', malicious: true }, severity: 'high', caseId: 'case-001' },
];

export const mockGraphEdges: GraphEdge[] = [
  { id: 'e-001', source: 'n-win-ws04', target: 'n-ps-4892', label: 'spawned', weight: 1 },
  { id: 'e-002', source: 'n-ps-4892', target: 'n-sys64', label: 'loaded', weight: 1 },
  { id: 'e-003', source: 'n-sys64', target: 'n-ip-c2', label: 'connected to', weight: 1 },
  { id: 'e-004', source: 'n-ps-4892', target: 'n-win-srv01', label: 'moved to', weight: 0.9 },
  { id: 'e-005', source: 'n-win-srv01', target: 'n-win-fs02', label: 'lateral movement', weight: 0.9 },
  { id: 'e-006', source: 'n-user-admin', target: 'n-win-srv01', label: 'logged into', weight: 0.8 },
  { id: 'e-007', source: 'n-sys64', target: 'n-reg-key', label: 'created', weight: 1 },
  { id: 'e-008', source: 'n-ip-c2', target: 'n-domain-c2', label: 'resolves', weight: 0.7 },
  { id: 'e-009', source: 'n-alert-001', target: 'n-ps-4892', label: 'references', weight: 0.9 },
];

// ── Confidence Scores ──────────────────────────────────────────
export const mockConfidenceScores: ConfidenceScore[] = [
  { id: 'cs-001', findingId: 'find-001', score: 94, evidenceQuantity: 0.90, evidenceQuality: 0.95, sourceReliability: 0.98, correlationStrength: 0.94, validationResults: 1.0, contradictionPenalty: 0, trend: [ { timestamp: '2026-06-12T10:30:00Z', score: 70, reason: 'Initial detection' }, { timestamp: '2026-06-12T10:35:00Z', score: 85, reason: 'YARA match confirmed' }, { timestamp: '2026-06-12T10:42:00Z', score: 94, reason: 'Event log cross-validation passed' } ], computedAt: '2026-06-12T10:42:00Z' },
  { id: 'cs-002', findingId: 'find-004', score: 73, evidenceQuantity: 0.60, evidenceQuality: 0.75, sourceReliability: 0.80, correlationStrength: 0.70, validationResults: 0.50, contradictionPenalty: -0.05, trend: [ { timestamp: '2026-06-12T11:30:00Z', score: 85, reason: 'Event log detection' }, { timestamp: '2026-06-12T11:35:00Z', score: 73, reason: 'Network validation failed - evidence pending' } ], computedAt: '2026-06-12T11:35:00Z' },
];

// ── Audit Logs ─────────────────────────────────────────────────
export const mockAuditLogs: AuditLog[] = [
  { id: 'al-001', userId: 'u1', userName: 'Dr. Sarah Chen', action: 'case_created', resourceType: 'Case', resourceId: 'case-001', timestamp: '2026-06-10T08:00:00Z', ipAddress: '10.0.1.45', details: 'Created case: Operation Black Helix', status: 'success' },
  { id: 'al-002', userId: 'u1', userName: 'Dr. Sarah Chen', action: 'evidence_uploaded', resourceType: 'Evidence', resourceId: 'ev-001', timestamp: '2026-06-12T09:00:00Z', ipAddress: '10.0.1.45', details: 'Uploaded: WIN-SRV01_mem_20260612.raw (8.0 GB)', status: 'success' },
  { id: 'al-003', userId: 'u2', userName: 'Marcus Williams', action: 'evidence_uploaded', resourceType: 'Evidence', resourceId: 'ev-003', timestamp: '2026-06-12T09:20:00Z', ipAddress: '10.0.1.67', details: 'Uploaded: network_capture_20260612.pcap (500 MB)', status: 'success' },
  { id: 'al-004', userId: 'u3', userName: 'Priya Patel', action: 'user_login', resourceType: 'Session', resourceId: 'session-patel-001', timestamp: '2026-06-12T12:00:00Z', ipAddress: '10.0.1.92', details: 'Login from internal network', status: 'success' },
  { id: 'al-005', userId: 'u1', userName: 'Dr. Sarah Chen', action: 'report_generated', resourceType: 'Report', resourceId: 'rep-001', timestamp: '2026-06-12T15:30:00Z', ipAddress: '10.0.1.45', details: 'Generated final report for case-001', status: 'success' },
];

// ── Report ─────────────────────────────────────────────────────
export const mockReport: Report = {
  id: 'rep-001', caseId: 'case-001', title: 'Incident Response Report – Operation Black Helix', version: 1,
  executiveSummary: 'Protocol SIFT has completed the autonomous analysis of case-001. The investigation confirms a sophisticated APT intrusion attributed to APT29 (Cozy Bear). The attacker gained initial access via spear-phishing, established persistence via a Cobalt Strike beacon, dumped domain credentials, performed lateral movement to sensitive servers, staged approximately 2.8GB of sensitive documents, and exfiltrated the data via an encrypted C2 channel. 8 findings with high confidence have been identified across 3 evidence sources.',
  incidentOverview: 'The incident began on June 10, 2026 at 14:32 UTC with delivery of a malicious macro document. The attack progressed through the full MITRE ATT&CK kill chain over approximately 44 hours.',
  generatedAt: '2026-06-12T15:30:00Z',
  generatedBy: 'SIFT Agent v1.0 + Dr. Sarah Chen',
  sections: [
    { id: 'sec-001', title: 'Investigation Timeline', content: 'Detailed 9-event chronological reconstruction from initial access to exfiltration...', order: 1 },
    { id: 'sec-002', title: 'Evidence Summary', content: '3 evidence sources analyzed: 1 memory dump, 1 event log archive, 1 network capture...', order: 2 },
    { id: 'sec-003', title: 'Findings', content: '5 confirmed findings spanning Credential Access, Lateral Movement, Persistence, Collection, and C2...', order: 3 },
    { id: 'sec-004', title: 'Correlations', content: '4 cross-evidence correlations identified, demonstrating cohesive attack chain...', order: 4 },
    { id: 'sec-005', title: 'Contradictions', content: '2 evidence contradictions detected. 1 under investigation, 1 open...', order: 5 },
    { id: 'sec-006', title: 'Recommendations', content: '1. Immediately isolate WIN-WS04, WIN-SRV01, WIN-FS02. 2. Reset all domain admin passwords. 3. Block 185.220.101.47 and update.microsoftsecurity-cdn.com at perimeter firewall. 4. Conduct full disk forensics on compromised hosts.', order: 6 },
  ],
};
