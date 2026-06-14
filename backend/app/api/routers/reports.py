"""Reports API router."""
from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, HTTPException, BackgroundTasks

from database.mongodb import col_reports, col_agent_traces
from database.redis import get_json
from workers.tasks import generate_report as generate_report_task

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/case/{case_id}/generate")
async def generate_report(case_id: UUID, background_tasks: BackgroundTasks) -> dict:
    """
    Queue an async report generation task.
    """
    background_tasks.add_task(generate_report_task, case_id=str(case_id))
    return {"case_id": str(case_id), "status": "queued"}


@router.get("/case/{case_id}")
async def get_report(case_id: UUID) -> dict:
    """Retrieve the generated report for a case."""
    report = await col_reports().find_one({"investigation_id": str(case_id)}, {"_id": 0})
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found. Generate it first via POST /reports/case/{case_id}/generate",
        )
    return report


@router.get("/case/{case_id}/agent-traces")
async def get_agent_traces(case_id: UUID) -> dict:
    """Retrieve the LangGraph agent reasoning traces for a case."""
    cursor = col_agent_traces().find({"investigation_id": str(case_id)}, {"_id": 0})
    traces = []
    async for doc in cursor:
        traces.append(doc)
    return {"case_id": str(case_id), "traces": traces}


@router.get("/case/{case_id}/contradictions")
async def get_contradictions(case_id: UUID) -> dict:
    """Retrieve detected contradictions for a case."""
    contradictions = await get_json(f"sift:contradictions:{case_id}") or []
    return {"case_id": str(case_id), "contradictions": contradictions}


@router.get("/task/{task_id}/status")
async def get_task_status(task_id: str) -> dict:
    """Poll task status by ID."""
    info = await get_json(f"sift:task:{task_id}")
    if not info:
        return {"task_id": task_id, "status": "unknown"}
    return info

