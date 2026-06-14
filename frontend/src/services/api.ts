const BASE_URL = 'http://127.0.0.1:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${options?.method ?? 'GET'} ${path} failed [${res.status}]: ${err}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Investigation {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  created_by: string;
  assigned_to: string[];
  created_at: string;
  updated_at: string;
  evidence_ids: string[];
  finding_ids: string[];
  overall_confidence: number;
  threat_score: number;
  tags: string[];
}

export interface Evidence {
  id: string;
  case_id: string;
  type: string;
  filename: string;
  original_name: string;
  sha256: string;
  md5: string;
  size_bytes: number;
  source: string;
  status: string;
  uploaded_at: string;
  uploaded_by: string;
  verified_at: string | null;
  custody_chain: CustodyEvent[];
  linked_finding_ids: string[];
  metadata: Record<string, unknown>;
  storage_path: string | null;
}

export interface CustodyEvent {
  timestamp: string;
  action: string;
  actor: string;
  hash_snapshot: string;
  notes?: string;
}

export interface ReasoningTrace {
  observation: string;
  evidence: string;
  tool_output: string;
  inference: string;
  validation: string;
  confidence: number;
  conclusion: string;
  validation_steps: ValidationStep[];
}

export interface ValidationStep {
  step: number;
  action: string;
  result: string;
  passed: boolean;
  timestamp?: string;
}

export interface Finding {
  id: string;
  case_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  mitre_technique: string | null;
  mitre_tactics: string[];
  evidence_refs: string[];
  tool_runs: string[];
  confidence_score: number;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  reasoning: ReasoningTrace;
  detected_at: string;
  tags: string[];
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  timestamp: string;
  event_type: string;
  title: string;
  description: string;
  severity: string;
  evidence_id: string | null;
  finding_id: string | null;
  actor: string | null;
  source_host: string | null;
  dest_host: string | null;
  attack_phase: string | null;
  investigation_id: string;
}

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ToolStatus {
  registered: Record<string, { version: string; supported_types: string[] }>;
  available_count: number;
  available: string[];
}

export interface HealthStatus {
  status: string;
  version: string;
  websocket_connections: number;
}

// ─── Investigations ───────────────────────────────────────────────────────────
export const investigationsApi = {
  list: () => request<Investigation[]>('/api/v1/investigations/'),
  get: (caseId: string) => request<Investigation>(`/api/v1/investigations/${caseId}`),
  create: (data: { title: string; description: string; severity: string; tags?: string[]; created_by?: string }) =>
    request<Investigation>('/api/v1/investigations/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (caseId: string) => request<void>(`/api/v1/investigations/${caseId}`, { method: 'DELETE' }),
  updateStatus: (caseId: string, status: string) =>
    request<Investigation>(`/api/v1/investigations/${caseId}/status?new_status=${status}`, { method: 'PATCH' }),
};

// ─── Evidence ────────────────────────────────────────────────────────────────
export const evidenceApi = {
  listForCase: (caseId: string) => request<Evidence[]>(`/api/v1/evidence/case/${caseId}`),
  get: (evidenceId: string) => request<Evidence>(`/api/v1/evidence/${evidenceId}`),
  upload: (caseId: string, evidenceType: string, file: File) => {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('evidence_type', evidenceType);
    formData.append('file', file);
    return fetch(`${BASE_URL}/api/v1/evidence/upload`, { method: 'POST', body: formData })
      .then((r) => r.json() as Promise<Evidence>);
  },
  verify: (evidenceId: string) =>
    request<Record<string, unknown>>(`/api/v1/evidence/${evidenceId}/verify`, { method: 'POST' }),
  getCustody: (evidenceId: string) =>
    request<Record<string, unknown>>(`/api/v1/evidence/${evidenceId}/custody`),
};

// ─── Findings ────────────────────────────────────────────────────────────────
export const findingsApi = {
  listForCase: (caseId: string) => request<Finding[]>(`/api/v1/findings/case/${caseId}`),
  get: (findingId: string) => request<Finding>(`/api/v1/findings/${findingId}`),
  updateStatus: (findingId: string, status: string) =>
    request<Finding>(`/api/v1/findings/${findingId}/status?new_status=${status}`, { method: 'PATCH' }),
  summary: (caseId: string) =>
    request<Record<string, unknown>>(`/api/v1/findings/case/${caseId}/summary`),
};

// ─── Timeline / Pipeline ─────────────────────────────────────────────────────
export const pipelineApi = {
  timeline: (caseId: string) => request<TimelineEvent[]>(`/api/v1/pipeline/${caseId}/timeline`),
  status: (caseId: string) => request<Record<string, unknown>>(`/api/v1/pipeline/${caseId}/status`),
  entities: (caseId: string) =>
    request<Record<string, unknown>[]>(`/api/v1/pipeline/${caseId}/entities`),
  normalizedLogs: (caseId: string) =>
    request<Record<string, unknown>[]>(`/api/v1/pipeline/${caseId}/normalized-logs`),
};

// ─── Knowledge Graph ─────────────────────────────────────────────────────────
export const graphApi = {
  getGraph: (caseId: string) => request<GraphData>(`/api/v1/graph/case/${caseId}`),
  getAttackPath: (caseId: string, maxHops = 5) =>
    request<Record<string, unknown>>(`/api/v1/graph/case/${caseId}/attack-path?max_hops=${maxHops}`),
  getClusters: (caseId: string) =>
    request<Record<string, unknown>>(`/api/v1/graph/case/${caseId}/clusters`),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  generate: (caseId: string) =>
    request<Record<string, unknown>>(`/api/v1/reports/case/${caseId}/generate`, { method: 'POST' }),
  get: (caseId: string) =>
    request<Record<string, unknown>>(`/api/v1/reports/case/${caseId}`),
  getContradictions: (caseId: string) =>
    request<{ case_id: string; contradictions: unknown[] }>(`/api/v1/reports/case/${caseId}/contradictions`),
  getAgentTraces: (caseId: string) =>
    request<Record<string, unknown>>(`/api/v1/reports/case/${caseId}/agent-traces`),
};

// ─── Tools / Health ───────────────────────────────────────────────────────────
export const toolsApi = {
  status: () => request<ToolStatus>('/api/v1/tools/status'),
  health: () => request<HealthStatus>('/health'),
  healthMongoDB: () => request<Record<string, unknown>>('/health/mongodb'),
};

// ─── MITRE ───────────────────────────────────────────────────────────────────
export const mitreApi = {
  techniques: () => request<Record<string, unknown>>('/api/v1/mitre/techniques'),
  map: (body: Record<string, string>) =>
    request<Record<string, unknown>>('/api/v1/mitre/map', { method: 'POST', body: JSON.stringify(body) }),
};
