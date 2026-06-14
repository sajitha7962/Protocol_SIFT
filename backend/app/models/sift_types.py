"""
Protocol SIFT — Core Type Definitions
All Pydantic models shared across the backend.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class InvestigationStatus(str, Enum):
    CREATED = "CREATED"
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    CORRELATING = "CORRELATING"
    VALIDATING = "VALIDATING"
    REINVESTIGATING = "REINVESTIGATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class EvidenceType(str, Enum):
    DISK_IMAGE = "disk_image"
    MEMORY_DUMP = "memory_dump"
    LOG_FILE = "log_file"
    PCAP = "pcap"
    SIEM_EXPORT = "siem_export"
    ENDPOINT_TELEMETRY = "endpoint_telemetry"
    CLOUD_LOGS = "cloud_logs"
    JSON_PACKAGE = "json_package"
    WINDOWS_EVTX = "windows_evtx"
    FIREWALL_LOG = "firewall_log"


class EvidenceStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    CORRUPTED = "corrupted"
    ANALYZING = "analyzing"
    PROCESSED = "processed"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingStatus(str, Enum):
    CONFIRMED = "confirmed"
    PROBABLE = "probable"
    SUSPECTED = "suspected"
    RULED_OUT = "ruled_out"


class ToolName(str, Enum):
    SIGMA = "sigma"
    YARA = "yara"
    SURICATA = "suricata"
    ZEEK = "zeek"
    VOLATILITY3 = "volatility3"
    CHAINSAW = "chainsaw"
    BUILTIN_NORMALIZER = "builtin_normalizer"


class ToolStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class AgentRole(str, Enum):
    INVESTIGATOR = "Investigator"
    VERIFIER = "Verifier"
    SKEPTIC = "Skeptic"
    ORCHESTRATOR = "Orchestrator"


class UserRole(str, Enum):
    ADMIN = "admin"
    SOC_ANALYST = "soc_analyst"
    INCIDENT_RESPONDER = "incident_responder"
    VIEWER = "viewer"


# ── Chain of Custody ───────────────────────────────────────────────────────────

class CustodyEvent(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    action: str
    actor: str
    hash_snapshot: str
    notes: Optional[str] = None


# ── Evidence ───────────────────────────────────────────────────────────────────

class Evidence(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    case_id: UUID
    type: EvidenceType
    filename: str
    original_name: str
    sha256: str
    md5: str
    size_bytes: int
    source: str
    status: EvidenceStatus = EvidenceStatus.PENDING
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: str = "system"
    verified_at: Optional[datetime] = None
    custody_chain: List[CustodyEvent] = []
    linked_finding_ids: List[UUID] = []
    metadata: Dict[str, Any] = {}
    storage_path: Optional[str] = None


class EvidenceCreate(BaseModel):
    case_id: UUID
    type: EvidenceType
    filename: str
    source: str = "upload"
    metadata: Dict[str, Any] = {}


# ── Investigations ────────────────────────────────────────────────────────────

class Investigation(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: str
    status: InvestigationStatus = InvestigationStatus.CREATED
    severity: Severity = Severity.MEDIUM
    created_by: str = "system"
    assigned_to: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    evidence_ids: List[UUID] = []
    finding_ids: List[UUID] = []
    overall_confidence: float = 0.0
    threat_score: float = 0.0
    tags: List[str] = []


class InvestigationCreate(BaseModel):
    title: str
    description: str
    severity: Severity = Severity.MEDIUM
    created_by: str = "system"
    tags: List[str] = []


# ── Tool Execution ────────────────────────────────────────────────────────────

class ToolRun(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    tool: ToolName
    case_id: UUID
    evidence_id: UUID
    status: ToolStatus = ToolStatus.QUEUED
    version: str = "unknown"
    command: str = ""
    parameters: Dict[str, Any] = {}
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    raw_output: str = ""
    parsed_output: Dict[str, Any] = {}
    artifacts_extracted: int = 0
    errors_count: int = 0
    confidence: float = 0.0
    findings_generated: List[UUID] = []
    recommendations: List[str] = []


# ── Validation Steps ──────────────────────────────────────────────────────────

class ValidationStep(BaseModel):
    step: int
    action: str
    result: str
    passed: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── Reasoning Trace ───────────────────────────────────────────────────────────

class ReasoningTrace(BaseModel):
    observation: str = ""
    evidence: str = ""
    tool_output: str = ""
    inference: str = ""
    validation: str = ""
    confidence: float = 0.0
    conclusion: str = ""
    validation_steps: List[ValidationStep] = []


# ── Findings ──────────────────────────────────────────────────────────────────

class Finding(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    case_id: UUID
    title: str
    description: str
    severity: Severity = Severity.MEDIUM
    status: FindingStatus = FindingStatus.SUSPECTED
    mitre_technique: Optional[str] = None
    mitre_tactics: List[str] = []
    evidence_refs: List[UUID] = []
    tool_runs: List[UUID] = []
    confidence_score: float = 0.0
    supporting_evidence: List[str] = []
    contradicting_evidence: List[str] = []
    reasoning: ReasoningTrace = Field(default_factory=ReasoningTrace)
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []


# ── Confidence Model ──────────────────────────────────────────────────────────

class ConfidenceFactors(BaseModel):
    evidence_quality: float = 0.0      # 0-1: quality of raw evidence
    evidence_quantity: float = 0.0     # 0-1: number of corroborating sources
    source_reliability: float = 0.0    # 0-1: trustworthiness of evidence source
    tool_agreement: float = 0.0        # 0-1: agreement across multiple tools
    correlation_strength: float = 0.0  # 0-1: finding link strength
    validation_results: float = 0.0    # 0-1: verification pass rate
    contradiction_penalty: float = 0.0 # 0-1: deducted for conflicts


class ConfidenceResult(BaseModel):
    finding_id: UUID
    score: float
    factors: ConfidenceFactors
    supporting_evidence: List[str] = []
    contradicting_evidence: List[str] = []
    computed_at: datetime = Field(default_factory=datetime.utcnow)
    requires_reinvestigation: bool = False


# ── MITRE ATT&CK Mapping ──────────────────────────────────────────────────────

class MitreMapping(BaseModel):
    technique_id: str          # e.g. T1003.001
    technique_name: str
    tactic: str
    confidence: float = 0.0
    description: str = ""
    url: str = ""


# ── Agent Trace ───────────────────────────────────────────────────────────────

class AgentTrace(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    case_id: UUID
    agent: AgentRole
    action: str
    evidence_used: List[str] = []
    tool_outputs: List[str] = []
    result: str = ""
    reasoning: str = ""
    confidence_before: float = 0.0
    confidence_after: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    actor: str
    action: str
    tool: Optional[str] = None
    resource_type: str = ""
    resource_id: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ip_address: str = "127.0.0.1"
    details: str = ""
    status: str = "success"


# ── Timeline Event ────────────────────────────────────────────────────────────

class TimelineEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    case_id: UUID
    timestamp: datetime
    event_type: str
    title: str
    description: str
    severity: Severity = Severity.MEDIUM
    evidence_id: Optional[UUID] = None
    finding_id: Optional[UUID] = None
    actor: Optional[str] = None
    source_host: Optional[str] = None
    dest_host: Optional[str] = None
    attack_phase: Optional[str] = None


# ── Report ────────────────────────────────────────────────────────────────────

class ReportSection(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    content: str
    order: int = 0


class InvestigationReport(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    case_id: UUID
    title: str
    executive_summary: str
    incident_overview: str
    sections: List[ReportSection] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: str = "SIFT Agent v1.0"
    version: int = 1
    overall_confidence: float = 0.0


# ── WebSocket Messages ────────────────────────────────────────────────────────

class WSMessageType(str, Enum):
    AGENT_PROGRESS = "agent_progress"
    TOOL_EXECUTION = "tool_execution"
    FINDING_CREATED = "finding_created"
    TIMELINE_UPDATE = "timeline_update"
    GRAPH_UPDATE = "graph_update"
    CONTRADICTION_ALERT = "contradiction_alert"
    INVESTIGATION_STATUS = "investigation_status"
    LOG_LINE = "log_line"


class WSMessage(BaseModel):
    type: WSMessageType
    case_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    payload: Dict[str, Any] = {}
