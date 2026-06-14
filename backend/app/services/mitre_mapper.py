"""
MITRE ATT&CK Mapper — maps observable indicators to ATT&CK techniques.
Uses a Redis cache to avoid repeated lookups.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

from database.redis import set_json, get_json
from core.config import get_settings
from models.sift_types import MitreMapping

settings = get_settings()

# ── Static technique mapping table ────────────────────────────────────────────
# Expandable: add more patterns / techniques here.

_TECHNIQUE_MAP: List[Dict] = [
    {
        "technique_id": "T1059.001",
        "technique_name": "PowerShell",
        "tactic": "Execution",
        "patterns": [r"powershell", r"\.ps1", r"invoke-expression", r"iex\("],
    },
    {
        "technique_id": "T1059.003",
        "technique_name": "Windows Command Shell",
        "tactic": "Execution",
        "patterns": [r"cmd\.exe", r"command\.com", r"/c\s+\w+"],
    },
    {
        "technique_id": "T1003.001",
        "technique_name": "LSASS Memory Dump",
        "tactic": "Credential Access",
        "patterns": [r"lsass", r"mimikatz", r"sekurlsa", r"procdump"],
    },
    {
        "technique_id": "T1055",
        "technique_name": "Process Injection",
        "tactic": "Defense Evasion",
        "patterns": [r"virtualalloc", r"writeprocessmemory", r"createremotethread", r"inject"],
    },
    {
        "technique_id": "T1071.001",
        "technique_name": "Web Protocols C2",
        "tactic": "Command and Control",
        "patterns": [r"beacon", r"c2", r"http.*443", r"cobalt", r"metasploit"],
    },
    {
        "technique_id": "T1078",
        "technique_name": "Valid Accounts",
        "tactic": "Defense Evasion",
        "patterns": [r"admin.*login", r"pass.*spray", r"brute.*force", r"failed.*logon"],
    },
    {
        "technique_id": "T1021.001",
        "technique_name": "Remote Desktop Protocol",
        "tactic": "Lateral Movement",
        "patterns": [r"rdp", r"3389", r"mstsc", r"remote.*desktop"],
    },
    {
        "technique_id": "T1105",
        "technique_name": "Ingress Tool Transfer",
        "tactic": "Command and Control",
        "patterns": [r"wget", r"curl.*download", r"certutil.*url", r"bitsadmin.*transfer"],
    },
    {
        "technique_id": "T1486",
        "technique_name": "Data Encrypted for Impact (Ransomware)",
        "tactic": "Impact",
        "patterns": [r"encrypt", r"ransom", r"\.locked", r"\.encrypted", r"readme\.txt"],
    },
    {
        "technique_id": "T1190",
        "technique_name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "patterns": [r"sql.*injection", r"rce", r"log4j", r"cve-2021-44228", r"exploit"],
    },
    {
        "technique_id": "T1562.001",
        "technique_name": "Disable or Modify Tools",
        "tactic": "Defense Evasion",
        "patterns": [r"disable.*defender", r"set-mppreference", r"netsh.*firewall.*off"],
    },
    {
        "technique_id": "T1136",
        "technique_name": "Create Account",
        "tactic": "Persistence",
        "patterns": [r"net user.*add", r"useradd", r"new-localuser", r"new.*account"],
    },
    {
        "technique_id": "T1547.001",
        "technique_name": "Registry Run Keys / Startup Folder",
        "tactic": "Persistence",
        "patterns": [r"hklm.*run", r"hkcu.*run", r"startup.*folder", r"reg add.*run"],
    },
    {
        "technique_id": "T1112",
        "technique_name": "Modify Registry",
        "tactic": "Defense Evasion",
        "patterns": [r"reg\.exe", r"regedit", r"regsvr32", r"registry.*modify"],
    },
]


class MitreMapper:
    """Maps raw text / indicators to MITRE ATT&CK techniques with caching."""

    CACHE_KEY_PREFIX = "sift:mitre:"

    async def map(self, text: str) -> List[MitreMapping]:
        """
        Match text against known technique patterns.
        Returns a sorted list of MitreMapping objects (highest confidence first).
        """
        text_lower = text.lower()
        matches: List[MitreMapping] = []

        for entry in _TECHNIQUE_MAP:
            matched_patterns = 0
            total_patterns = len(entry["patterns"])
            for pattern in entry["patterns"]:
                if re.search(pattern, text_lower):
                    matched_patterns += 1

            if matched_patterns > 0:
                confidence = round(matched_patterns / total_patterns, 2)
                mapping = MitreMapping(
                    technique_id=entry["technique_id"],
                    technique_name=entry["technique_name"],
                    tactic=entry["tactic"],
                    confidence=confidence,
                    url=f"https://attack.mitre.org/techniques/{entry['technique_id'].replace('.', '/')}",
                )
                matches.append(mapping)

        return sorted(matches, key=lambda m: m.confidence, reverse=True)

    async def map_cached(self, text: str) -> List[MitreMapping]:
        """Map with Redis caching (keyed by SHA-256 of input text)."""
        import hashlib
        cache_key = self.CACHE_KEY_PREFIX + hashlib.sha256(text.encode()).hexdigest()[:16]
        cached = await get_json(cache_key)
        if cached:
            return [MitreMapping(**item) for item in cached]

        results = await self.map(text)
        await set_json(
            cache_key,
            [r.model_dump() for r in results],
            ttl=settings.MITRE_CACHE_TTL_SECONDS,
        )
        return results

    async def get_technique(self, technique_id: str) -> Optional[MitreMapping]:
        """Look up a specific technique by ID."""
        for entry in _TECHNIQUE_MAP:
            if entry["technique_id"] == technique_id:
                return MitreMapping(
                    technique_id=entry["technique_id"],
                    technique_name=entry["technique_name"],
                    tactic=entry["tactic"],
                    confidence=1.0,
                    url=f"https://attack.mitre.org/techniques/{entry['technique_id'].replace('.', '/')}",
                )
        return None

    def list_all_techniques(self) -> List[Dict]:
        return [
            {
                "technique_id": e["technique_id"],
                "technique_name": e["technique_name"],
                "tactic": e["tactic"],
            }
            for e in _TECHNIQUE_MAP
        ]


mitre_mapper = MitreMapper()
