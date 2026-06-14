"""
Asynchronous investigation pipeline processing tasks.
"""
from __future__ import annotations

import logging
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID, uuid4

from core.config import get_settings
from database.redis import set_json, get_json
from database.mongodb import col_agent_traces, col_reports
from models.sift_types import (
    EvidenceStatus, InvestigationStatus, WSMessageType, AgentRole, AgentTrace,
    Finding, Severity, InvestigationReport, ReportSection
)

logger = logging.getLogger(__name__)
settings = get_settings()


async def _update_task_state(task_id: str, status: str, case_id: str, message: str) -> None:
    key = f"sift:task:{task_id}"
    await set_json(key, {
        "task_id": task_id,
        "status": status,
        "case_id": case_id,
        "message": message,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, ttl=86400)

    # Also broadcast via WebSocket
    try:
        from websocket.manager import ws_manager
        await ws_manager.broadcast(case_id, {
            "type": WSMessageType.INVESTIGATION_STATUS.value,
            "case_id": case_id,
            "payload": {"task_id": task_id, "status": status, "message": message},
        })
    except Exception:
        pass


async def _do_generate_report(case_id: str) -> Dict[str, Any]:
    from services.findings_store import findings_store

    findings = await findings_store.list_for_case(UUID(case_id))

    critical = [f for f in findings if f.severity.value == "critical"]
    high = [f for f in findings if f.severity.value == "high"]
    medium = [f for f in findings if f.severity.value == "medium"]
    low = [f for f in findings if f.severity.value == "low"]

    exec_summary = (
        f"Protocol SIFT identified {len(findings)} security findings in this investigation. "
        f"{len(critical)} critical and {len(high)} high severity findings require immediate attention."
    )

    sections = [
        ReportSection(
            title="Critical Findings",
            content="\n".join(
                f"- **{f.title}** (Confidence: {f.confidence_score:.0%}): {f.description}"
                for f in critical
            ) or "No critical findings.",
            order=1,
        ),
        ReportSection(
            title="High Severity Findings",
            content="\n".join(
                f"- **{f.title}**: {f.description}"
                for f in high
            ) or "No high severity findings.",
            order=2,
        ),
        ReportSection(
            title="Medium & Low Severity Findings",
            content="\n".join(
                f"- **{f.title}** ({f.severity.value}): {f.description}"
                for f in (medium + low)
            ) or "No medium/low severity findings.",
            order=3,
        ),
        ReportSection(
            title="MITRE ATT&CK Coverage",
            content="\n".join(
                f"- {f.title}: {f.mitre_technique} ({', '.join(f.mitre_tactics)})"
                for f in findings if f.mitre_technique
            ) or "No MITRE mappings.",
            order=4,
        ),
    ]

    avg_confidence = sum(f.confidence_score for f in findings) / len(findings) if findings else 0.0

    report = InvestigationReport(
        case_id=UUID(case_id),
        title="Protocol SIFT — Investigation Report",
        executive_summary=exec_summary,
        incident_overview=f"Automated forensic investigation of {len(findings)} findings.",
        sections=sections,
        overall_confidence=round(avg_confidence, 4),
    )

    report_dict = report.model_dump(mode="json")
    report_dict["investigation_id"] = str(case_id)  # For index compatibility
    
    await col_reports().update_one(
        {"investigation_id": str(case_id)},
        {"$set": report_dict},
        upsert=True
    )
    return report_dict


async def run_pipeline_background(
    case_id: str,
    evidence_id: str,
    evidence_path: str,
    evidence_type: str,
    uploaded_by: str = "system",
) -> Dict[str, Any]:
    """
    Complete backend pipeline orchestrated via FastAPI BackgroundTasks.
    1. Parse & Normalize
    2. Extract Entities & Build Relationships
    3. Run Heuristic Findings Engine
    4. Build Chronological Timeline
    5. Generate Final Report
    6. Transition Status & Broadcast WS Progress
    """
    from services.state_service import state_service
    from storage.evidence_store import evidence_store
    from services.entity_extractor import entity_extractor
    from services.findings_engine import findings_engine
    from services.timeline_engine import timeline_engine
    from parsers import dispatch_parser
    from websocket.manager import ws_manager

    task_id = str(uuid4())
    await _update_task_state(task_id, "RUNNING", case_id, "Starting evidence analysis pipeline...")

    # Broadcast progress helper
    async def update_progress(message: str, stage: str):
        try:
            await ws_manager.broadcast(case_id, {
                "type": WSMessageType.AGENT_PROGRESS.value,
                "case_id": case_id,
                "payload": {
                    "message": message,
                    "stage": stage,
                },
            })
        except Exception:
            pass

    try:
        # Step 1: Parse & Normalize
        try:
            await state_service.transition(UUID(case_id), InvestigationStatus.UPLOADING)
        except Exception:
            pass
        await state_service.transition(UUID(case_id), InvestigationStatus.PROCESSING)
        await evidence_store.update_status(UUID(evidence_id), EvidenceStatus.ANALYZING)
        await update_progress("Parsing and normalizing uploaded log evidence...", "normalization")

        # Create audit trace in MongoDB
        trace = AgentTrace(
            case_id=UUID(case_id),
            agent=AgentRole.ORCHESTRATOR,
            action="start_pipeline",
            reasoning=f"Beginning automated processing of evidence {evidence_id} (type: {evidence_type})"
        )
        trace_doc = trace.model_dump(mode="json")
        trace_doc["investigation_id"] = str(case_id)
        await col_agent_traces().insert_one(trace_doc)

        logs = dispatch_parser(evidence_path, evidence_type, case_id, evidence_id)
        await update_progress(f"Parsing complete. Extracted {len(logs)} normalized log entries.", "normalization")

        # Step 2 & 3: Extract Entities & Build Relationships
        try:
            await state_service.transition(UUID(case_id), InvestigationStatus.CORRELATING)
        except Exception:
            pass
        await update_progress("Extracting network/process/user entities and mapping relationships...", "graph_generation")
        ext_stats = await entity_extractor.extract_and_store(case_id, logs)
        await update_progress(
            f"Knowledge Graph populated: {ext_stats['entity_counts']} entities and {ext_stats['relationship_count']} links mapped.",
            "graph_generation"
        )

        # Step 4: Run Heuristic Findings Engine
        await update_progress("Running security threat detection heuristics...", "findings_generation")
        findings = await findings_engine.analyze_and_store_findings(case_id, logs)
        await update_progress(f"Threat analysis complete. Detected {len(findings)} security findings.", "findings_generation")

        # Step 5: Build Timeline
        await update_progress("Constructing chronological incident timeline...", "timeline_generation")
        timeline = await timeline_engine.build_and_store_timeline(case_id, logs, findings)
        await update_progress(f"Timeline constructed with {len(timeline)} chronological events.", "timeline_generation")

        # Step 6: Generate Investigation Report
        await update_progress("Compiling investigation report and summaries...", "reporting")
        report = await _do_generate_report(case_id)

        # Step 7: Back-populate finding_ids, overall_confidence, and threat_score on investigation
        try:
            from database.mongodb import col_investigations
            finding_ids = [str(f.id) for f in findings]
            severity_weights = {"critical": 1.0, "high": 0.75, "medium": 0.5, "low": 0.25}
            threat_score = round(
                sum(severity_weights.get(f.severity.value, 0.0) for f in findings) / max(len(findings), 1) * 100,
                2,
            ) if findings else 0.0
            avg_confidence = round(
                sum(f.confidence_score for f in findings) / max(len(findings), 1) * 100, 2
            ) if findings else 0.0
            await col_investigations().update_one(
                {"id": str(case_id)},
                {"$set": {
                    "finding_ids": finding_ids,
                    "evidence_ids": [str(evidence_id)],
                    "overall_confidence": avg_confidence,
                    "threat_score": threat_score,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            await update_progress(f"Investigation record updated: {len(finding_ids)} findings linked.", "back_population")
        except Exception as bp_err:
            logger.warning(f"Back-population of finding_ids failed (non-fatal): {bp_err}")

        # Transition investigation to completed
        await state_service.transition(UUID(case_id), InvestigationStatus.VALIDATING)
        await state_service.transition(UUID(case_id), InvestigationStatus.COMPLETED)
        await evidence_store.update_status(UUID(evidence_id), EvidenceStatus.PROCESSED)

        # Final progress broadcasts
        await update_progress("Investigation successfully completed.", "completed")
        await _update_task_state(task_id, "SUCCESS", case_id, "Pipeline analysis complete.")
        
        try:
            await ws_manager.broadcast(case_id, {
                "type": WSMessageType.TIMELINE_UPDATE.value,
                "case_id": case_id,
                "payload": {"events_count": len(timeline)},
            })
            await ws_manager.broadcast(case_id, {
                "type": WSMessageType.GRAPH_UPDATE.value,
                "case_id": case_id,
                "payload": {"node_count": len(logs) + len(findings)},
            })
        except Exception:
            pass

        # Save success trace in MongoDB
        success_trace = AgentTrace(
            case_id=UUID(case_id),
            agent=AgentRole.ORCHESTRATOR,
            action="complete_pipeline",
            result="Success",
            reasoning=f"Pipeline finished successfully. Found {len(findings)} findings."
        )
        success_doc = success_trace.model_dump(mode="json")
        success_doc["investigation_id"] = str(case_id)
        await col_agent_traces().insert_one(success_doc)

        return {
            "status": "success",
            "logs_count": len(logs),
            "findings_count": len(findings),
            "timeline_events": len(timeline),
        }

    except Exception as e:
        logger.error(f"Pipeline failed: {e}\n{traceback.format_exc()}")
        await _update_task_state(task_id, "FAILED", case_id, f"Pipeline execution failed: {str(e)}")
        try:
            await state_service.transition(UUID(case_id), InvestigationStatus.FAILED)
            await evidence_store.update_status(UUID(evidence_id), EvidenceStatus.CORRUPTED)
        except Exception:
            pass
            
        fail_trace = AgentTrace(
            case_id=UUID(case_id),
            agent=AgentRole.ORCHESTRATOR,
            action="fail_pipeline",
            result="Failed",
            reasoning=f"Pipeline failed with error: {str(e)}"
        )
        fail_doc = fail_trace.model_dump(mode="json")
        fail_doc["investigation_id"] = str(case_id)
        await col_agent_traces().insert_one(fail_doc)
        raise e


# ── Backward Compatibility Wrapper Functions ─────────────────────────────────

async def analyze_evidence(
    case_id: str,
    evidence_id: str,
    evidence_path: str,
    evidence_type: str,
    uploaded_by: str = "system",
) -> Dict[str, Any]:
    """Fallback function to match the old celery task signature."""
    return await run_pipeline_background(case_id, evidence_id, evidence_path, evidence_type, uploaded_by)


async def run_tool(
    case_id: str,
    evidence_id: str,
    evidence_path: str,
    evidence_type: str,
    tool_name: str,
) -> Dict[str, Any]:
    """Compatibility stub for run_tool."""
    return {"status": "skipped", "tool": tool_name}


async def generate_report(case_id: str) -> Dict[str, Any]:
    """Compatibility stub for generate_report."""
    return await _do_generate_report(case_id)
