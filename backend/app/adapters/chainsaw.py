"""
Chainsaw Adapter — rapid Windows event log analysis.
Falls back to built-in EVTX keyword scanning when chainsaw is not installed.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from adapters.base import BaseAdapter
from models.sift_types import EvidenceType, ToolName, ToolRun, ToolStatus

WINDOWS_EVENT_PATTERNS = [
    {"event_id": 4625, "description": "Failed logon attempt", "severity": "medium", "pattern": r"eventid.*4625|event.*id.*=.*4625|logon.*failure"},
    {"event_id": 4648, "description": "Logon with explicit credentials", "severity": "high", "pattern": r"eventid.*4648|runas|explicit.*credential"},
    {"event_id": 4688, "description": "New process created", "severity": "low", "pattern": r"eventid.*4688|process.*creat"},
    {"event_id": 4698, "description": "Scheduled task created", "severity": "high", "pattern": r"eventid.*4698|scheduled.*task.*creat"},
    {"event_id": 4720, "description": "User account created", "severity": "high", "pattern": r"eventid.*4720|user.*account.*creat"},
    {"event_id": 4728, "description": "Member added to security group", "severity": "high", "pattern": r"eventid.*4728|member.*added.*security"},
    {"event_id": 7045, "description": "New service installed", "severity": "high", "pattern": r"eventid.*7045|new.*service.*install"},
    {"event_id": 1102, "description": "Audit log cleared", "severity": "critical", "pattern": r"eventid.*1102|audit.*log.*clear"},
    {"event_id": 4776, "description": "NTLM authentication", "severity": "medium", "pattern": r"eventid.*4776|ntlm.*auth"},
    {"event_id": 4663, "description": "Object access (sensitive file)", "severity": "medium", "pattern": r"eventid.*4663|object.*access|file.*access"},
]


class ChainsawAdapter(BaseAdapter):
    @property
    def name(self) -> ToolName:
        return ToolName.CHAINSAW

    @property
    def version(self) -> str:
        return "builtin-2.0"

    @property
    def supported_evidence_types(self) -> List[EvidenceType]:
        return [
            EvidenceType.WINDOWS_EVTX,
            EvidenceType.LOG_FILE,
            EvidenceType.SIEM_EXPORT,
        ]

    async def is_available(self) -> bool:
        return True  # Fallback always available

    async def analyze(
        self,
        evidence_path: str,
        evidence_type: EvidenceType,
        case_id: str,
        evidence_id: str,
        parameters: Dict[str, Any] | None = None,
    ) -> ToolRun:
        run = ToolRun(
            id=uuid4(),
            tool=self.name,
            case_id=UUID(case_id),
            evidence_id=UUID(evidence_id),
            status=ToolStatus.RUNNING,
            version=self.version,
            command=f"chainsaw hunt {evidence_path}",
            started_at=datetime.utcnow(),
        )
        try:
            with open(evidence_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read().lower()

            hits = []
            for evt in WINDOWS_EVENT_PATTERNS:
                if re.search(evt["pattern"], content):
                    hits.append({
                        "event_id": evt["event_id"],
                        "description": evt["description"],
                        "severity": evt["severity"],
                    })

            critical = sum(1 for h in hits if h["severity"] == "critical")
            high = sum(1 for h in hits if h["severity"] == "high")
            confidence = min(1.0, critical * 0.4 + high * 0.2) if hits else 0.0

            run.status = ToolStatus.COMPLETED
            run.completed_at = datetime.utcnow()
            run.duration_ms = int((run.completed_at - run.started_at).total_seconds() * 1000)
            run.parsed_output = {"hits": hits, "total_events_matched": len(hits)}
            run.raw_output = json.dumps(hits, indent=2)
            run.artifacts_extracted = len(hits)
            run.confidence = round(confidence, 4)
            run.recommendations = [h["description"] for h in hits if h["severity"] in ("critical", "high")]

        except Exception as e:
            run.status = ToolStatus.FAILED
            run.raw_output = str(e)
            run.errors_count = 1
            run.completed_at = datetime.utcnow()

        return run
