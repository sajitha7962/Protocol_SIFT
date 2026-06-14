// ============================================================
// PROTOCOL SIFT – CORE TYPE DEFINITIONS
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type CaseStatus = 'active' | 'completed' | 'pending' | 'archived';
export type EvidenceType = 'disk_image' | 'memory_dump' | 'log_file' | 'pcap' | 'siem_export' | 'endpoint_telemetry' | 'cloud_logs' | 'json_package';
export type EvidenceStatus = 'verified' | 'pending' | 'corrupted' | 'analyzing';
export type FindingStatus = 'confirmed' | 'probable' | 'suspected' | 'ruled_out';
export type AgentStatus = 'idle' | 'analyzing' | 'correlating' | 'validating' | 'reporting' | 'paused' | 'error';
export type AgentStage = 'evidence_intake' | 'classification' | 'tool_selection' | 'artifact_extraction' | 'correlation' | 'threat_analysis' | 'validation' | 'contradiction_detection' | 'self_correction' | 'confidence_scoring' | 'report_generation';
export type ContradictionStatus = 'open' | 'resolved' | 'investigating';
export type ThreatIntelSource = 'virustotal' | 'alienvault_otx' | 'misp' | 'abuseipdb' | 'mitre_attack';
export type IOCType = 'ip' | 'domain' | 'hash' | 'url' | 'file';
export type ForensicTool = 'volatility3' | 'autopsy' | 'velociraptor' | 'yara' | 'sigma' | 'zeek' | 'suricata' | 'wireshark' | 'plaso' | 'timesketch' | 'chainsaw' | 'kape';
export type ToolStatus = 'idle' | 'running' | 'completed' | 'error';
export type NodeType = 'user' | 'host' | 'process' | 'file' | 'registry_key' | 'domain' | 'ip_address' | 'alert' | 'evidence';
export type AuditAction = 'case_created' | 'evidence_uploaded' | 'finding_added' | 'report_generated' | 'user_login' | 'user_logout' | 'config_changed';

// ── Core Entities ─────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'investigator' | 'viewer';
  avatar?: string;
  lastLogin: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  severity: Severity;
  createdBy: string;
  assignedTo: string[];
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  findingsCount: number;
  criticalCount: number;
  overallConfidence: number;
  threatScore: number;
  tags: string[];
}

export interface Evidence {
  id: string;
  caseId: string;
  type: EvidenceType;
  filename: string;
  originalName: string;
  sha256: string;
  md5: string;
  sizeBytes: number;
  source: string;
  status: EvidenceStatus;
  uploadedAt: string;
  uploadedBy: string;
  verifiedAt?: string;
  custodyChain: CustodyEvent[];
  linkedFindings: string[];
  metadata: Record<string, string | number | boolean>;
}

export interface CustodyEvent {
  timestamp: string;
  action: string;
  actor: string;
  hash: string;
  notes?: string;
}

export interface Finding {
  id: string;
  caseId: string;
  title: string;
  description: string;
  severity: Severity;
  status: FindingStatus;
  mitreTechnique?: string;
  mitreTactics: string[];
  evidenceRefs: string[];
  confidenceScore: number;
  timestamp: string;
  detectedAt: string;
  reasoning: ReasoningTrace;
  tags: string[];
}

export interface ReasoningTrace {
  observation: string;
  evidence: string;
  inference: string;
  validation: string;
  conclusion: string;
  validationSteps: ValidationStep[];
}

export interface ValidationStep {
  step: number;
  action: string;
  result: string;
  passed: boolean;
  timestamp: string;
}

export interface Correlation {
  id: string;
  caseId: string;
  findingAId: string;
  findingBId: string;
  evidenceIds: string[];
  strength: number;       // 0–1
  linkType: string;
  description: string;
  discoveredAt: string;
}

export interface ThreatIntel {
  id: string;
  iocType: IOCType;
  value: string;
  source: ThreatIntelSource;
  malicious: boolean;
  riskScore: number;
  threatActor?: string;
  campaign?: string;
  ttps: string[];
  tags: string[];
  lastSeen: string;
  reportedAt: string;
  description: string;
  references: string[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  description: string;
  url: string;
  examples: string[];
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  timestamp: string;
  eventType: string;
  title: string;
  description: string;
  severity: Severity;
  evidenceId?: string;
  findingId?: string;
  actor?: string;
  sourceHost?: string;
  destHost?: string;
  attackPhase?: string;
}

export interface Contradiction {
  id: string;
  caseId: string;
  severity: Severity;
  evidenceAId: string;
  evidenceBId: string;
  title: string;
  description: string;
  conflictType: string;
  status: ContradictionStatus;
  resolutionRecommendation?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface ConfidenceScore {
  id: string;
  findingId: string;
  score: number;            // 0–100
  evidenceQuantity: number; // 0–1 factor
  evidenceQuality: number;  // 0–1 factor
  sourceReliability: number;
  correlationStrength: number;
  validationResults: number;
  contradictionPenalty: number;
  trend: ConfidenceTrendPoint[];
  computedAt: string;
}

export interface ConfidenceTrendPoint {
  timestamp: string;
  score: number;
  reason: string;
}

export interface Report {
  id: string;
  caseId: string;
  title: string;
  executiveSummary: string;
  incidentOverview: string;
  sections: ReportSection[];
  generatedAt: string;
  generatedBy: string;
  version: number;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  ipAddress: string;
  details: string;
  status: 'success' | 'failure';
}

// ── Agent Types ───────────────────────────────────────────────

export interface AgentState {
  status: AgentStatus;
  currentStage: AgentStage;
  caseId?: string;
  stageProgress: number;       // 0–100
  overallProgress: number;     // 0–100
  startedAt?: string;
  lastUpdate: string;
  currentAction: string;
  stageHistory: StageHistoryItem[];
}

export interface StageHistoryItem {
  stage: AgentStage;
  startedAt: string;
  completedAt?: string;
  outcome?: string;
  duration?: number;
}

export interface AgentActivity {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'discovery';
  message: string;
  stage?: AgentStage;
  caseId?: string;
}

// ── Forensic Tool Types ───────────────────────────────────────

export interface ForensicToolRun {
  id: string;
  tool: ForensicTool;
  caseId: string;
  evidenceId: string;
  status: ToolStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  command: string;
  output: string;
  artifactsExtracted: number;
  errorsCount: number;
  findings: string[];
  recommendations: string[];
}

// ── Knowledge Graph Types ─────────────────────────────────────

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, string | number | boolean>;
  severity?: Severity;
  caseId: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight?: number;
}

// ── UI Types ──────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  caseId?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: string | number;
}

export interface FilterOption {
  key: string;
  label: string;
  value: string;
}

export interface SearchResult {
  type: 'case' | 'finding' | 'evidence' | 'threat';
  id: string;
  title: string;
  description: string;
  severity?: Severity;
}
