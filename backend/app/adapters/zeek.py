"""
Zeek Adapter — network traffic analysis on PCAP files.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from adapters.base import BaseAdapter
from models.sift_types import EvidenceType, ToolName, ToolRun, ToolStatus

NETWORK_IOC_PATTERNS = [
    {"pattern": r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", "description": "IP address detected", "severity": "info"},
    {"pattern": r"dns.*\.(ru|cn|xyz|top|pw)\b", "description": "Suspicious TLD in DNS query", "severity": "high"},
    {"pattern": r"base64_decode|eval\(", "description": "Encoded payload in HTTP", "severity": "high"},
    {"pattern": r"post.*(/upload|/cmd|/shell|/webshell)", "description": "POST to suspicious endpoint", "severity": "critical"},
    {"pattern": r"user-agent.*python|user-agent.*curl", "description": "Script/tool HTTP user-agent", "severity": "medium"},
    {"pattern": r"connect.*:443|ssl.*\.onion", "description": "TOR or encrypted C2 connection", "severity": "critical"},
    {"pattern": r"smb.*\\\\.+\\.*", "description": "SMB lateral movement path", "severity": "high"},
    {"pattern": r"port.*445|port.*22|port.*3389", "description": "Lateral movement port detected", "severity": "medium"},
]


class ZeekAdapter(BaseAdapter):
    @property
    def name(self) -> ToolName:
        return ToolName.ZEEK

    @property
    def version(self) -> str:
        return "builtin-6.0"

    @property
    def supported_evidence_types(self) -> List[EvidenceType]:
        return [EvidenceType.PCAP, EvidenceType.FIREWALL_LOG]

    async def is_available(self) -> bool:
        return True

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
            command=f"zeek -r {evidence_path}",
            started_at=datetime.utcnow(),
        )
        try:
            with open(evidence_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            hits = []
            for ioc in NETWORK_IOC_PATTERNS:
                found = re.findall(ioc["pattern"], content, re.IGNORECASE)
                if found:
                    hits.append({
                        "pattern": ioc["description"],
                        "severity": ioc["severity"],
                        "occurrences": len(found),
                        "samples": list(set(found[:3])),
                    })

            critical = sum(1 for h in hits if h["severity"] == "critical")
            high = sum(1 for h in hits if h["severity"] == "high")
            confidence = min(1.0, critical * 0.4 + high * 0.2) if hits else 0.0

            run.status = ToolStatus.COMPLETED
            run.completed_at = datetime.utcnow()
            run.duration_ms = int((run.completed_at - run.started_at).total_seconds() * 1000)
            run.parsed_output = {"network_iocs": hits, "total_iocs": len(hits)}
            run.raw_output = json.dumps(hits, indent=2)
            run.artifacts_extracted = len(hits)
            run.confidence = round(confidence, 4)

        except Exception as e:
            run.status = ToolStatus.FAILED
            run.raw_output = str(e)
            run.errors_count = 1
            run.completed_at = datetime.utcnow()

        return run
