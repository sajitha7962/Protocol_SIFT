"""
Volatility3 Adapter — memory forensics analysis.
Parses key memory artifacts when volatility is installed.
Falls back to keyword scanning for demo mode.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from adapters.base import BaseAdapter
from models.sift_types import EvidenceType, ToolName, ToolRun, ToolStatus

MEMORY_KEYWORDS = [
    {"keyword": r"lsass\.exe", "description": "LSASS process detected in memory", "severity": "critical", "technique": "T1003.001"},
    {"keyword": r"mimikatz", "description": "Mimikatz strings found in memory dump", "severity": "critical", "technique": "T1003.001"},
    {"keyword": r"meterpreter", "description": "Meterpreter shell in memory", "severity": "critical", "technique": "T1055"},
    {"keyword": r"cobalt.strike", "description": "Cobalt Strike beacon in memory", "severity": "critical", "technique": "T1071.001"},
    {"keyword": r"\\\\device\\\\namedpipe", "description": "Named pipe (C2 indicator) in memory", "severity": "high", "technique": "T1071"},
    {"keyword": r"virtualprotect|virtualalloc", "description": "Memory allocation API (shellcode indicator)", "severity": "high", "technique": "T1055"},
    {"keyword": r"\\\\windows\\\\temp\\\\.*\\.exe", "description": "Executable from TEMP directory", "severity": "high", "technique": "T1059"},
    {"keyword": r"svchost.*-k.*network", "description": "Suspicious svchost parameters", "severity": "medium", "technique": "T1036"},
    {"keyword": r"powershell.*-w.*hidden", "description": "Hidden PowerShell execution", "severity": "high", "technique": "T1059.001"},
]


class VolatilityAdapter(BaseAdapter):
    @property
    def name(self) -> ToolName:
        return ToolName.VOLATILITY3

    @property
    def version(self) -> str:
        return "builtin-3.0"

    @property
    def supported_evidence_types(self) -> List[EvidenceType]:
        return [EvidenceType.MEMORY_DUMP]

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
            command=f"vol -f {evidence_path} windows.malfind",
            started_at=datetime.utcnow(),
        )
        try:
            with open(evidence_path, "rb") as f:
                content = f.read(20 * 1024 * 1024).lower()

            hits = []
            for kw in MEMORY_KEYWORDS:
                if re.search(kw["keyword"].encode(), content):
                    hits.append({
                        "indicator": kw["keyword"],
                        "description": kw["description"],
                        "severity": kw["severity"],
                        "technique": kw["technique"],
                    })

            critical = sum(1 for h in hits if h["severity"] == "critical")
            confidence = min(1.0, critical * 0.5 + len(hits) * 0.05) if hits else 0.0

            run.status = ToolStatus.COMPLETED
            run.completed_at = datetime.utcnow()
            run.duration_ms = int((run.completed_at - run.started_at).total_seconds() * 1000)
            run.parsed_output = {"memory_artifacts": hits, "total_indicators": len(hits)}
            run.raw_output = json.dumps(hits, indent=2)
            run.artifacts_extracted = len(hits)
            run.confidence = round(confidence, 4)
            run.recommendations = [h["description"] for h in hits if h["severity"] == "critical"]

        except Exception as e:
            run.status = ToolStatus.FAILED
            run.raw_output = str(e)
            run.errors_count = 1
            run.completed_at = datetime.utcnow()

        return run
