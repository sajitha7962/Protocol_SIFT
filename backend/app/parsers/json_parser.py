"""JSON / NDJSON log parser — returns NormalizedLog records."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List

from models.normalized_log import NormalizedLog


def _safe_dt(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val
    if isinstance(val, (int, float)):
        return datetime.fromtimestamp(val, tz=timezone.utc)
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def _severity_from_level(level: Any) -> str:
    mapping = {
        "critical": "critical", "high": "high",
        "medium": "medium", "low": "low", "info": "info",
        "error": "high", "warning": "medium", "warn": "medium",
        "notice": "low", "debug": "info",
        1: "critical", 2: "high", 3: "medium", 4: "low", 5: "info",
    }
    if isinstance(level, str):
        return mapping.get(level.lower(), "medium")
    return mapping.get(level, "medium")


def _extract_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Try common field name variants across different JSON log schemas."""
    def pick(*keys) -> str:
        for k in keys:
            v = record.get(k, "")
            if v:
                return str(v)
        return ""

    return {
        "timestamp": _safe_dt(
            record.get("timestamp") or record.get("time") or
            record.get("@timestamp") or record.get("EventTime") or
            datetime.now(timezone.utc)
        ),
        "source":  pick("source", "sensor", "log_source", "channel", "Channel"),
        "host":    pick("host", "hostname", "computer", "Computer", "src_host", "ComputerName"),
        "user":    pick("user", "username", "account", "SubjectUserName", "TargetUserName", "User"),
        "ip":      pick("ip", "src_ip", "source_ip", "remote_ip", "DestinationIp", "IpAddress"),
        "process": pick("process", "process_name", "Image", "ParentImage", "command", "CommandLine"),
        "event_type": pick("event_type", "EventType", "type", "category", "action", "EventID"),
        "severity": _severity_from_level(
            record.get("severity") or record.get("level") or
            record.get("Level") or record.get("priority") or "medium"
        ),
    }


def parse(
    content: str,
    investigation_id: str,
    evidence_id: str,
) -> List[NormalizedLog]:
    """
    Parse JSON or NDJSON content into NormalizedLog records.
    Accepts:
      - A JSON array:  [{"timestamp": ..., ...}, ...]
      - NDJSON lines:  {"timestamp": ...}\n{"timestamp": ...}\n...
      - A single dict: {"timestamp": ...}
    """
    records: List[Dict[str, Any]] = []

    content = content.strip()
    if content.startswith("["):
        try:
            records = json.loads(content)
        except json.JSONDecodeError:
            pass
    else:
        for line in content.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    records.append(obj)
            except json.JSONDecodeError:
                continue

    logs: List[NormalizedLog] = []
    for rec in records:
        if not isinstance(rec, dict):
            continue
        fields = _extract_fields(rec)
        logs.append(NormalizedLog(
            investigation_id=investigation_id,
            evidence_id=evidence_id,
            raw_data=rec,
            **fields,
        ))
    return logs
