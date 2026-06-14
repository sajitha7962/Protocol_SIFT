"""Sysmon XML log parser — returns NormalizedLog records."""
from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List

from models.normalized_log import NormalizedLog
from parsers.json_parser import _safe_dt

logger = logging.getLogger(__name__)

def parse_xml_event(event_element: ET.Element, investigation_id: str, evidence_id: str) -> NormalizedLog | None:
    # Handle namespaces
    ns = ""
    if event_element.tag.startswith("{"):
        ns = event_element.tag.split("}")[0] + "}"

    system = event_element.find(f"{ns}System")
    event_data_el = event_element.find(f"{ns}EventData")

    if system is None:
        return None

    # Helper to find tag text safely
    def get_system_text(tag_name: str) -> str:
        el = system.find(f"{ns}{tag_name}")
        return el.text.strip() if el is not None and el.text else ""

    event_id = get_system_text("EventID")
    host = get_system_text("Computer")
    
    # Get time
    time_created = system.find(f"{ns}TimeCreated")
    timestamp_str = ""
    if time_created is not None:
        timestamp_str = time_created.attrib.get("SystemTime", "")

    # Get data fields
    data_fields: Dict[str, Any] = {}
    if event_data_el is not None:
        for data in event_data_el.findall(f"{ns}Data"):
            name = data.attrib.get("Name")
            if name:
                data_fields[name] = data.text or ""

    user = data_fields.get("User") or data_fields.get("TargetUserName") or data_fields.get("SubjectUserName") or ""
    ip = data_fields.get("DestinationIp") or data_fields.get("SourceIp") or data_fields.get("IpAddress") or ""
    process = data_fields.get("Image") or data_fields.get("ParentImage") or data_fields.get("ProcessName") or ""
    
    # Fallback to EventData UtcTime if SystemTime not found
    if not timestamp_str:
        timestamp_str = data_fields.get("UtcTime", "")

    timestamp = _safe_dt(timestamp_str) if timestamp_str else datetime.now(timezone.utc)

    # Determine severity and event description
    severity = "info"
    if event_id in ("1", "11"):
        severity = "low"
    elif event_id in ("3", "10"):
        severity = "medium"

    event_type = f"Sysmon-{event_id}" if event_id else "Sysmon-Unknown"

    provider_name = ""
    provider_el = system.find(f"{ns}Provider")
    if provider_el is not None:
        provider_name = provider_el.attrib.get("Name", "")

    raw_data = {
        "event_id": event_id,
        "system_fields": {
            "Provider": provider_name,
            "EventID": event_id,
            "Computer": host,
            "Channel": get_system_text("Channel"),
        },
        "event_data": data_fields
    }

    return NormalizedLog(
        investigation_id=investigation_id,
        evidence_id=evidence_id,
        timestamp=timestamp,
        source="Sysmon",
        host=host,
        user=user,
        ip=ip,
        process=process,
        event_type=event_type,
        severity=severity,
        raw_data=raw_data
    )

def parse(
    content: str,
    investigation_id: str,
    evidence_id: str,
) -> List[NormalizedLog]:
    """Parse Sysmon XML content into NormalizedLog records."""
    logs: List[NormalizedLog] = []
    content = content.strip()
    if not content:
        return logs

    # Normalize XML content by wrapping list of Events if needed
    if not content.startswith("<Events>"):
        if content.count("<Event") > 1 and not content.startswith("<?xml"):
            content = f"<Events>{content}</Events>"
        elif not content.startswith("<?xml") and not content.startswith("<Event"):
            content = f"<Events>{content}</Events>"

    try:
        root = ET.fromstring(content)
        if root.tag.endswith("Events"):
            for event_el in root:
                if event_el.tag.endswith("Event"):
                    log = parse_xml_event(event_el, investigation_id, evidence_id)
                    if log:
                        logs.append(log)
        elif root.tag.endswith("Event"):
            log = parse_xml_event(root, investigation_id, evidence_id)
            if log:
                logs.append(log)
    except Exception as e:
        logger.error(f"Failed to parse Sysmon XML directly: {e}")
        # Fallback regex split-by-block strategy
        event_blocks = re.findall(r"<Event.*?>.*?</Event>", content, re.DOTALL)
        for block in event_blocks:
            try:
                el = ET.fromstring(block)
                log = parse_xml_event(el, investigation_id, evidence_id)
                if log:
                    logs.append(log)
            except Exception as ex:
                logger.error(f"Fallback parse failed for block: {ex}")

    return logs
