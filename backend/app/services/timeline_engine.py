"""Timeline Engine — Builds and persists the chronological incident timeline in MongoDB."""
from __future__ import annotations

import logging
from typing import List
from uuid import UUID, uuid4

from models.normalized_log import NormalizedLog
from models.sift_types import Finding, Severity, TimelineEvent
from database.mongodb import col_timelines

logger = logging.getLogger(__name__)

class TimelineEngine:
    """Aggregates logs and findings into a single chronological timeline."""

    async def build_and_store_timeline(
        self,
        case_id: str,
        logs: List[NormalizedLog],
        findings: List[Finding],
    ) -> List[TimelineEvent]:
        """
        Merge logs and findings, map them to TimelineEvents,
        clear old timeline, and persist the new timeline to MongoDB.
        """
        timeline_events: List[TimelineEvent] = []

        # 1. Map findings to timeline events
        for finding in findings:
            attack_phase = finding.mitre_tactics[0] if finding.mitre_tactics else "Detection"
            event = TimelineEvent(
                case_id=UUID(case_id),
                timestamp=finding.detected_at,
                event_type="Finding",
                title=f"Security Finding: {finding.title}",
                description=finding.description,
                severity=finding.severity,
                finding_id=finding.id,
                attack_phase=attack_phase,
                actor=finding.supporting_evidence[0] if finding.supporting_evidence else None,
            )
            timeline_events.append(event)

        # 2. Map normalized logs to timeline events
        for log in logs:
            # Categorize attack phase based on event metadata
            attack_phase = "Forensics"
            if "Sysmon-1" in log.event_type:
                attack_phase = "Execution"
            elif "Sysmon-3" in log.event_type or log.ip:
                attack_phase = "Command and Control"
            elif "Sysmon-11" in log.event_type:
                attack_phase = "Persistence"
            elif "4625" in log.event_type or "Sysmon-4625" in log.event_type:
                attack_phase = "Credential Access"
            elif "4624" in log.event_type or "Sysmon-4624" in log.event_type:
                attack_phase = "Lateral Movement"
                
            # Build description
            description_parts = []
            if log.user:
                description_parts.append(f"User: {log.user}")
            if log.process:
                description_parts.append(f"Process: {log.process}")
            if log.ip:
                description_parts.append(f"Remote IP: {log.ip}")
            
            raw_details = str(log.raw_data.get("event_data", {}).get("CommandLine") or "")
            if raw_details:
                description_parts.append(f"Cmd: {raw_details}")
                
            desc = " | ".join(description_parts) if description_parts else f"Raw Event from {log.source}"

            severity_val = Severity.MEDIUM
            if log.severity in ("info", "low", "medium", "high", "critical"):
                severity_val = Severity(log.severity)

            event = TimelineEvent(
                case_id=UUID(case_id),
                timestamp=log.timestamp,
                event_type=log.event_type,
                title=f"{log.source} Activity ({log.event_type})",
                description=desc,
                severity=severity_val,
                evidence_id=UUID(log.evidence_id),
                actor=log.user or None,
                source_host=log.host or None,
                dest_host=log.ip or None,
                attack_phase=attack_phase,
            )
            timeline_events.append(event)

        # Sort all events chronologically
        timeline_events.sort(key=lambda ev: ev.timestamp)

        # 3. Clear existing timeline and store the new timeline
        await col_timelines().delete_many({"investigation_id": str(case_id)})

        if timeline_events:
            docs = []
            for ev in timeline_events:
                doc = ev.model_dump(mode="json")
                doc["investigation_id"] = str(case_id)  # For index compatibility
                docs.append(doc)
            
            await col_timelines().insert_many(docs)

        logger.info(f"Timeline stored for case {case_id} with {len(timeline_events)} events")
        return timeline_events

timeline_engine = TimelineEngine()
