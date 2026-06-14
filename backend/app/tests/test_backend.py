"""
Protocol SIFT Backend — Integration Test Suite
Tests the complete E2E pipeline: Upload → Normalize → Findings → Report
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

import pytest
import pytest_asyncio

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).parent.parent))


# ── Unit Tests: Types ──────────────────────────────────────────────────────────

def test_investigation_create():
    from models.sift_types import InvestigationCreate, Severity
    data = InvestigationCreate(title="Test Case", description="Test", severity=Severity.HIGH)
    assert data.title == "Test Case"


def test_evidence_type_enum():
    from models.sift_types import EvidenceType
    assert EvidenceType.LOG_FILE.value == "log_file"
    assert EvidenceType.MEMORY_DUMP.value == "memory_dump"


def test_finding_model():
    from models.sift_types import Finding, Severity, FindingStatus
    f = Finding(
        case_id=uuid4(),
        title="Test Finding",
        description="A test finding",
        severity=Severity.CRITICAL,
        status=FindingStatus.CONFIRMED,
    )
    assert f.confidence_score == 0.0
    assert f.severity == Severity.CRITICAL


# ── Unit Tests: Confidence Engine ─────────────────────────────────────────────

def test_confidence_engine_basic():
    from services.confidence_engine import confidence_engine
    from models.sift_types import Finding, Severity
    finding = Finding(
        case_id=uuid4(),
        title="Test",
        description="desc",
        severity=Severity.HIGH,
        evidence_refs=[uuid4(), uuid4()],
        supporting_evidence=["a", "b", "c"],
        mitre_tactics=["Execution", "Persistence"],
    )
    result = confidence_engine.score(
        finding=finding,
        tool_run_count=3,
        tools_agreeing=2,
        validation_passed=3,
        validation_total=4,
        contradiction_count=0,
    )
    assert 0.0 <= result.score <= 1.0
    assert result.finding_id == finding.id


def test_confidence_requires_reinvestigation():
    from services.confidence_engine import confidence_engine
    from models.sift_types import Finding, Severity
    finding = Finding(
        case_id=uuid4(),
        title="Weak",
        description="",
        severity=Severity.LOW,
    )
    result = confidence_engine.score(finding, tool_run_count=1)
    # Low evidence = low confidence = should reinvestigate
    assert result.requires_reinvestigation is True


# ── Unit Tests: MITRE Mapper ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mitre_mapper_powershell():
    from services.mitre_mapper import mitre_mapper
    mappings = await mitre_mapper.map("powershell -enc base64string iex bypass")
    assert any(m.technique_id == "T1059.001" for m in mappings)


@pytest.mark.asyncio
async def test_mitre_mapper_ransomware():
    from services.mitre_mapper import mitre_mapper
    mappings = await mitre_mapper.map("files are encrypted ransom bitcoin")
    assert any(m.technique_id == "T1486" for m in mappings)


@pytest.mark.asyncio
async def test_mitre_mapper_empty():
    from services.mitre_mapper import mitre_mapper
    mappings = await mitre_mapper.map("nothing suspicious here")
    assert isinstance(mappings, list)


# ── Unit Tests: Tool Adapters ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_sigma_adapter_log_file():
    from adapters.sigma import SigmaAdapter
    from models.sift_types import EvidenceType

    adapter = SigmaAdapter()
    assert await adapter.is_available()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
        f.write("2024-01-15 10:30:00 powershell.exe -enc SQBFAFg= -ExecutionPolicy bypass\n")
        f.write("2024-01-15 10:31:00 lsass.exe memory dump initiated procdump\n")
        f.write("2024-01-15 10:32:00 net user hacker /add && net localgroup administrators hacker /add\n")
        fname = f.name

    try:
        run = await adapter.analyze(fname, EvidenceType.LOG_FILE, str(uuid4()), str(uuid4()))
        assert run.status.value == "completed"
        assert run.artifacts_extracted > 0
        assert run.confidence > 0.0
        assert "matches" in run.parsed_output
    finally:
        os.unlink(fname)


@pytest.mark.asyncio
async def test_yara_adapter():
    from adapters.yara import YaraAdapter
    from models.sift_types import EvidenceType

    adapter = YaraAdapter()

    with tempfile.NamedTemporaryFile(mode="wb", suffix=".bin", delete=False) as f:
        f.write(b"mimikatz sekurlsa::logonpasswords lsadump::sam")
        fname = f.name

    try:
        run = await adapter.analyze(fname, EvidenceType.MEMORY_DUMP, str(uuid4()), str(uuid4()))
        assert run.status.value == "completed"
        assert run.artifacts_extracted > 0
    finally:
        os.unlink(fname)


@pytest.mark.asyncio
async def test_chainsaw_adapter():
    from adapters.chainsaw import ChainsawAdapter
    from models.sift_types import EvidenceType

    adapter = ChainsawAdapter()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
        f.write("EventID 4625 logon failure\n")
        f.write("EventID 4720 user account created\n")
        f.write("EventID 1102 audit log cleared\n")
        fname = f.name

    try:
        run = await adapter.analyze(fname, EvidenceType.LOG_FILE, str(uuid4()), str(uuid4()))
        assert run.status.value == "completed"
        assert run.artifacts_extracted > 0
    finally:
        os.unlink(fname)


@pytest.mark.asyncio
async def test_suricata_adapter():
    from adapters.suricata import SuricataAdapter
    from models.sift_types import EvidenceType

    adapter = SuricataAdapter()

    with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
        f.write("POST /webshell.php HTTP/1.1\n")
        f.write("ms17-010 eternalblue exploit detected\n")
        f.write("dns query .onion domain\n")
        fname = f.name

    try:
        run = await adapter.analyze(fname, EvidenceType.LOG_FILE, str(uuid4()), str(uuid4()))
        assert run.status.value == "completed"
        assert run.artifacts_extracted > 0
    finally:
        os.unlink(fname)


# ── Integration Test: E2E Pipeline (no real Redis/Neo4j) ──────────────────────

@pytest.mark.asyncio
async def test_pipeline_e2e_fallback():
    """
    Full pipeline test using the sequential fallback (no LangGraph required).
    Uses a real temp log file with IOCs.
    """
    from adapters.sigma import SigmaAdapter
    from agents.pipeline import run_pipeline, InvestigationState
    from models.sift_types import EvidenceType

    adapter = SigmaAdapter()
    case_id = str(uuid4())
    evidence_id = str(uuid4())

    with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
        f.write("powershell.exe -enc SQBFAFg= -ExecutionPolicy bypass\n")
        f.write("mimikatz sekurlsa::logonpasswords\n")
        f.write("net user backdoor /add\n")
        f.write("reg add HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run /v svc /t REG_SZ /d malware.exe\n")
        fname = f.name

    try:
        run = await adapter.analyze(fname, EvidenceType.LOG_FILE, case_id, evidence_id)

        initial_state: InvestigationState = {
            "case_id": case_id,
            "evidence_id": evidence_id,
            "evidence_type": EvidenceType.LOG_FILE.value,
            "tool_runs": [run.model_dump(mode="json")],
            "entities": [],
            "findings": [],
            "agent_traces": [],
            "contradictions": [],
            "reinvestigation_count": 0,
            "final_confidence": 0.0,
            "status": "running",
            "log_lines": [],
        }

        # Monkeypatch LLM call to avoid API key requirement
        import agents.pipeline as pipeline_module
        original_investigator = pipeline_module.investigator_node

        async def mock_investigator(state):
            state["findings"] = [
                {
                    "id": str(uuid4()),
                    "case_id": case_id,
                    "title": "PowerShell Execution",
                    "description": "Obfuscated PowerShell detected",
                    "severity": "high",
                    "status": "suspected",
                    "mitre_technique": "T1059.001",
                    "mitre_tactics": ["Execution"],
                    "evidence_refs": [evidence_id],
                    "tool_runs": [],
                    "confidence_score": 0.75,
                    "supporting_evidence": ["Sigma rule match"],
                    "contradicting_evidence": [],
                    "reasoning": {"observation": "", "confidence": 0.75, "conclusion": ""},
                    "detected_at": "2024-01-15T10:30:00",
                    "tags": [],
                }
            ]
            state["agent_traces"].append({"agent": "Investigator", "action": "mock_analysis"})
            return state

        pipeline_module.investigator_node = mock_investigator

        final = await run_pipeline(initial_state)

        pipeline_module.investigator_node = original_investigator

        assert len(final["findings"]) > 0
        assert final["final_confidence"] >= 0.0
        assert isinstance(final["contradictions"], list)
        assert any("Investigator" in str(t) for t in final["agent_traces"])
        print(f"\n✅ E2E Pipeline: {len(final['findings'])} findings, "
              f"confidence={final['final_confidence']:.1%}")

    finally:
        os.unlink(fname)


# ── FastAPI App Test ───────────────────────────────────────────────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from unittest.mock import patch, AsyncMock

    # Mock external services
    with patch("database.neo4j.verify_connectivity", return_value=True), \
         patch("database.redis.verify_connectivity", return_value=True), \
         patch("database.neo4j.initialize_schema", new_callable=AsyncMock):
        from main import app
        return TestClient(app)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Protocol SIFT"


def test_tool_status(client):
    response = client.get("/api/v1/tools/status")
    assert response.status_code == 200
    data = response.json()
    assert "registered" in data
    assert data["available_count"] >= 0


def test_mitre_techniques_list(client):
    response = client.get("/api/v1/mitre/techniques")
    assert response.status_code == 200
    data = response.json()
    assert len(data["techniques"]) > 0
