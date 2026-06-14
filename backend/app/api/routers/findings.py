"""Findings API router."""
from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException

from services.findings_store import findings_store
from models.sift_types import Finding, FindingStatus

router = APIRouter(prefix="/findings", tags=["Findings"])


@router.get("/case/{case_id}", response_model=List[Finding])
async def list_findings(case_id: UUID) -> List[Finding]:
    """List all findings for a case."""
    return await findings_store.list_for_case(case_id)


@router.get("/{finding_id}", response_model=Finding)
async def get_finding(finding_id: UUID) -> Finding:
    """Get a specific finding with full reasoning trace."""
    f = await findings_store.get(finding_id)
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    return f


@router.patch("/{finding_id}/status", response_model=Finding)
async def update_finding_status(finding_id: UUID, new_status: FindingStatus) -> Finding:
    """Analyst can manually update finding status (e.g., rule out false positive)."""
    f = await findings_store.update_status(finding_id, new_status)
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    return f


@router.get("/case/{case_id}/summary")
async def findings_summary(case_id: UUID) -> dict:
    """Aggregated statistics for a case's findings."""
    findings = await findings_store.list_for_case(case_id)
    by_severity = {}
    by_status = {}
    mitre_coverage = set()

    for f in findings:
        sev = f.severity.value
        by_severity[sev] = by_severity.get(sev, 0) + 1
        st = f.status.value
        by_status[st] = by_status.get(st, 0) + 1
        if f.mitre_technique:
            mitre_coverage.add(f.mitre_technique)

    avg_confidence = (
        sum(f.confidence_score for f in findings) / len(findings) if findings else 0.0
    )

    return {
        "case_id": str(case_id),
        "total_findings": len(findings),
        "by_severity": by_severity,
        "by_status": by_status,
        "mitre_techniques_covered": list(mitre_coverage),
        "average_confidence": round(avg_confidence, 4),
    }
