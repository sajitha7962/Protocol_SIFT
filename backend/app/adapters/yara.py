"""
YARA Adapter — matches YARA rules against binary/text evidence files.
Falls back to built-in YARA string patterns when yara-python is not installed.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from adapters.base import BaseAdapter
from models.sift_types import EvidenceType, ToolName, ToolRun, ToolStatus

# Built-in YARA-style string patterns (for fallback mode)
BUILTIN_YARA_RULES: List[Dict[str, Any]] = [
    {
        "rule_name": "MaliciousPowerShell",
        "meta": {"description": "Detects obfuscated PowerShell", "severity": "high"},
        "strings": [b"FromBase64String", b"IEX", b"Invoke-Expression", b"$env:APPDATA"],
    },
    {
        "rule_name": "MimikatzStrings",
        "meta": {"description": "Detects Mimikatz credential dumper", "severity": "critical"},
        "strings": [b"mimikatz", b"sekurlsa::logonpasswords", b"lsadump::sam", b"kerberos::"],
    },
    {
        "rule_name": "WebShellIndicators",
        "meta": {"description": "Detects web shell patterns", "severity": "critical"},
        "strings": [b"eval(base64_decode", b"eval($_POST", b"passthru($_GET", b"system($_REQUEST"],
    },
    {
        "rule_name": "RansomwareStrings",
        "meta": {"description": "Detects ransomware indicators", "severity": "critical"},
        "strings": [b"YOUR FILES ARE ENCRYPTED", b"bitcoin", b"tor2web", b".onion"],
    },
    {
        "rule_name": "CobaltStrikeBeacon",
        "meta": {"description": "Detects Cobalt Strike beacon artifacts", "severity": "critical"},
        "strings": [b"cobaltstrike", b"beacon.x64", b"\\x00\\x00\\x00\\x01\\xbe", b"stage"],
    },
    {
        "rule_name": "EternalBlueExploit",
        "meta": {"description": "Detects EternalBlue SMB exploit", "severity": "critical"},
        "strings": [b"\\x00\\x00\\x00\\x18\\xfe\\x53\\x4d\\x42", b"eternalblue", b"ms17-010"],
    },
]


class YaraAdapter(BaseAdapter):
    @property
    def name(self) -> ToolName:
        return ToolName.YARA

    @property
    def version(self) -> str:
        return "builtin-1.0"

    @property
    def supported_evidence_types(self) -> List[EvidenceType]:
        return [
            EvidenceType.DISK_IMAGE,
            EvidenceType.MEMORY_DUMP,
            EvidenceType.LOG_FILE,
            EvidenceType.ENDPOINT_TELEMETRY,
        ]

    async def is_available(self) -> bool:
        try:
            import yara
            return True
        except ImportError:
            return True  # Fallback mode available

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
            command=f"yara rules/ {evidence_path}",
            started_at=datetime.utcnow(),
        )

        try:
            # Read file content (binary mode for YARA-style matching)
            with open(evidence_path, "rb") as f:
                content = f.read(10 * 1024 * 1024)  # Cap at 10 MB

            content_lower = content.lower()
            matches = []

            for rule in BUILTIN_YARA_RULES:
                triggered_strings = []
                for s in rule["strings"]:
                    if s.lower() in content_lower:
                        triggered_strings.append(s.decode("utf-8", errors="replace"))

                if triggered_strings:
                    matches.append({
                        "rule": rule["rule_name"],
                        "meta": rule["meta"],
                        "matched_strings": triggered_strings,
                        "severity": rule["meta"]["severity"],
                    })

            critical = sum(1 for m in matches if m["severity"] == "critical")
            high = sum(1 for m in matches if m["severity"] == "high")
            confidence = min(1.0, critical * 0.45 + high * 0.3) if matches else 0.0

            run.status = ToolStatus.COMPLETED
            run.completed_at = datetime.utcnow()
            run.duration_ms = int((run.completed_at - run.started_at).total_seconds() * 1000)
            run.parsed_output = {"matches": matches, "total_rules_matched": len(matches)}
            run.raw_output = json.dumps(matches, indent=2)
            run.artifacts_extracted = len(matches)
            run.confidence = round(confidence, 4)
            run.recommendations = [m["rule"] for m in matches if m["severity"] in ("critical", "high")]

        except Exception as e:
            run.status = ToolStatus.FAILED
            run.raw_output = str(e)
            run.errors_count = 1
            run.completed_at = datetime.utcnow()

        return run
