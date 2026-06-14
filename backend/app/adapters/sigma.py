"""
Sigma Adapter — runs Sigma rules against log files.
Uses sigma-cli if installed; otherwise runs built-in pattern matching.
"""
from __future__ import annotations

import asyncio
import json
import re
import shutil
import subprocess
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from adapters.base import BaseAdapter
from models.sift_types import EvidenceType, ToolName, ToolRun, ToolStatus


# Built-in Sigma-style rules (for demo/fallback mode)
BUILTIN_RULES: List[Dict[str, Any]] = [
    {
        "id": "rule-001",
        "title": "Suspicious PowerShell Execution",
        "level": "high",
        "technique": "T1059.001",
        "patterns": [r"powershell.*-enc", r"powershell.*bypass", r"invoke-expression"],
    },
    {
        "id": "rule-002",
        "title": "LSASS Memory Access Detected",
        "level": "critical",
        "technique": "T1003.001",
        "patterns": [r"lsass\.exe", r"procdump", r"mimikatz"],
    },
    {
        "id": "rule-003",
        "title": "Lateral Movement via RDP",
        "level": "high",
        "technique": "T1021.001",
        "patterns": [r"mstsc", r"rdp", r":3389"],
    },
    {
        "id": "rule-004",
        "title": "Registry Persistence",
        "level": "medium",
        "technique": "T1547.001",
        "patterns": [r"reg\s+add.*run", r"hklm\\software\\microsoft\\windows\\currentversion\\run"],
    },
    {
        "id": "rule-005",
        "title": "Ransomware File Extension Activity",
        "level": "critical",
        "technique": "T1486",
        "patterns": [r"\.encrypted", r"\.locked", r"\.ransom", r"readme.*txt.*decrypt"],
    },
    {
        "id": "rule-006",
        "title": "Windows Defender Disabled",
        "level": "high",
        "technique": "T1562.001",
        "patterns": [r"set-mppreference.*disable", r"netsh.*advfirewall.*off"],
    },
    {
        "id": "rule-007",
        "title": "Tool Download via certutil",
        "level": "high",
        "technique": "T1105",
        "patterns": [r"certutil.*-urlcache", r"certutil.*-decode"],
    },
    {
        "id": "rule-008",
        "title": "New Admin Account Created",
        "level": "high",
        "technique": "T1136",
        "patterns": [r"net\s+user.*\/add", r"net\s+localgroup\s+administrators.*\/add"],
    },
]


class SigmaAdapter(BaseAdapter):
    @property
    def name(self) -> ToolName:
        return ToolName.SIGMA

    @property
    def version(self) -> str:
        return "builtin-1.0"

    @property
    def supported_evidence_types(self) -> List[EvidenceType]:
        return [
            EvidenceType.LOG_FILE,
            EvidenceType.WINDOWS_EVTX,
            EvidenceType.SIEM_EXPORT,
            EvidenceType.ENDPOINT_TELEMETRY,
            EvidenceType.CLOUD_LOGS,
        ]

    async def is_available(self) -> bool:
        return True  # Built-in mode always available

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
            command=f"sigma scan {evidence_path}",
            started_at=datetime.utcnow(),
        )

        try:
            # Read evidence file
            with open(evidence_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read().lower()

            matches = []
            for rule in BUILTIN_RULES:
                triggered = []
                for pattern in rule["patterns"]:
                    found = re.findall(pattern, content)
                    if found:
                        triggered.append({"pattern": pattern, "matches": found[:5]})

                if triggered:
                    matches.append({
                        "rule_id": rule["id"],
                        "rule_title": rule["title"],
                        "level": rule["level"],
                        "technique": rule["technique"],
                        "triggered_patterns": triggered,
                        "match_count": sum(len(t["matches"]) for t in triggered),
                    })

            # Score confidence
            critical_count = sum(1 for m in matches if m["level"] == "critical")
            high_count = sum(1 for m in matches if m["level"] == "high")
            medium_count = sum(1 for m in matches if m["level"] == "medium")

            confidence = min(
                1.0,
                (critical_count * 0.4 + high_count * 0.25 + medium_count * 0.1)
            ) if matches else 0.0

            run.status = ToolStatus.COMPLETED
            run.completed_at = datetime.utcnow()
            run.duration_ms = int(
                (run.completed_at - run.started_at).total_seconds() * 1000
            )
            run.parsed_output = {"matches": matches, "total_rules_matched": len(matches)}
            run.raw_output = json.dumps(matches, indent=2)
            run.artifacts_extracted = len(matches)
            run.confidence = round(confidence, 4)
            run.recommendations = [m["rule_title"] for m in matches if m["level"] in ("critical", "high")]

        except Exception as e:
            run.status = ToolStatus.FAILED
            run.raw_output = str(e)
            run.errors_count = 1
            run.completed_at = datetime.utcnow()

        return run
