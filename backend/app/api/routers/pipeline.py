"""Pipeline API router — exposes status, normalized logs, entities, and timelines."""
from __future__ import annotations

from typing import List, Any, Dict
from uuid import UUID

from fastapi import APIRouter, HTTPException

from services.state_service import state_service
from database.mongodb import col_timelines, col_entities

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.get("/{case_id}/status")
async def get_pipeline_status(case_id: UUID) -> dict:
    """Retrieve the investigation/pipeline status."""
    inv = await state_service.get(case_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {
        "case_id": str(case_id),
        "status": inv.status.value,
        "title": inv.title,
        "overall_confidence": inv.overall_confidence,
        "threat_score": inv.threat_score,
    }


@router.get("/{case_id}/normalized-logs")
async def get_normalized_logs(case_id: UUID) -> List[dict]:
    """Retrieve normalized logs for a case (stored as non-finding timeline events)."""
    cursor = col_timelines().find(
        {"investigation_id": str(case_id), "event_type": {"$ne": "Finding"}},
        {"_id": 0}
    ).sort("timestamp", 1)
    
    logs = []
    async for doc in cursor:
        logs.append(doc)
    return logs


@router.get("/{case_id}/entities")
async def get_entities(case_id: UUID) -> List[dict]:
    """Retrieve extracted entities for a case."""
    cursor = col_entities().find(
        {"investigation_id": str(case_id)},
        {"_id": 0}
    )
    entities = []
    async for doc in cursor:
        entities.append(doc)
    return entities


@router.get("/{case_id}/timeline")
async def get_timeline(case_id: UUID) -> List[dict]:
    """Retrieve the full chronological timeline (logs + findings)."""
    cursor = col_timelines().find(
        {"investigation_id": str(case_id)},
        {"_id": 0}
    ).sort("timestamp", 1)
    
    events = []
    async for doc in cursor:
        events.append(doc)
    return events
