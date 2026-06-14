"""
Suricata Adapter — IDS/IPS rule-based detection on network logs.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from adapters.base import BaseAdapter
from models.sift_types import EvidenceType, ToolName, ToolRun, ToolStatus

SURICATA_RULES = [
    {"sid": 2010935, "msg": "ET MALWARE Possible Keylogger", "severity": "high", "pattern": r"keylog|keystroke|keyboard.*hook"},
    {"sid": 2019284, "msg": "ET POLICY Powershell HTTPDownload", "severity": "high", "pattern": r"powershell.*downloadstring|invoke-webrequest"},
    {"sid": 2024884, "msg": "ET TROJAN Dridex Banking Trojan", "severity": "critical", "pattern": r"dridex|bugat|feodo"},
    {"sid": 2027865, "msg": "ET MALWARE CobaltStrike Activity", "severity": "critical", "pattern": r"cobalt.strike|cs.beacon|malleable.c2"},
    {"sid": 2019003, "msg": "ET SCAN Nmap Detected", "severity": "medium", "pattern": r"nmap|masscan|port.*scan"},
    {"sid": 2008578, "msg": "ET EXPLOIT MS17-010 EternalBlue", "severity": "critical", "pattern": r"ms17-010|eternalblue|smb.*exploit"},
    {"sid": 2022860, "msg": "ET POLICY DNS Lookup .onion Domain", "severity": "high", "pattern": r"\.onion\b"},
    {"sid": 2030358, "msg": "ET MALWARE Log4Shell JNDI", "severity": "critical", "pattern": r"jndi:(ldap|rmi|dns)://|log4j"},
]


class SuricataAdapter(BaseAdapter):
    @property
    def name(self) -> ToolName:
        return ToolName.SURICATA

    @property
    def version(self) -> str:
        return "builtin-7.0"

    @property
    def supported_evidence_types(self) -> List[EvidenceType]:
        return [EvidenceType.PCAP, EvidenceType.FIREWALL_LOG, EvidenceType.LOG_FILE]

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
            command=f"suricata -r {evidence_path} -l /tmp/suricata",
            started_at=datetime.utcnow(),
        )
        try:
            with open(evidence_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            alerts = []
            for rule in SURICATA_RULES:
                if re.search(rule["pattern"], content, re.IGNORECASE):
                    alerts.append({
                        "sid": rule["sid"],
                        "message": rule["msg"],
                        "severity": rule["severity"],
                    })

            critical = sum(1 for a in alerts if a["severity"] == "critical")
            high = sum(1 for a in alerts if a["severity"] == "high")
            confidence = min(1.0, critical * 0.45 + high * 0.25) if alerts else 0.0

            run.status = ToolStatus.COMPLETED
            run.completed_at = datetime.utcnow()
            run.duration_ms = int((run.completed_at - run.started_at).total_seconds() * 1000)
            run.parsed_output = {"alerts": alerts, "total_alerts": len(alerts)}
            run.raw_output = json.dumps(alerts, indent=2)
            run.artifacts_extracted = len(alerts)
            run.confidence = round(confidence, 4)
            run.recommendations = [a["message"] for a in alerts if a["severity"] == "critical"]

        except Exception as e:
            run.status = ToolStatus.FAILED
            run.raw_output = str(e)
            run.errors_count = 1
            run.completed_at = datetime.utcnow()

        return run
