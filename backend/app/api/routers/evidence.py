"""Evidence API router — upload, list, verify, custody chain."""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status, BackgroundTasks

from core.config import get_settings
from services.integrity_service import integrity_service
from services.state_service import state_service
from storage.evidence_store import evidence_store
from storage.object_store import object_store
from models.sift_types import Evidence, EvidenceCreate, EvidenceType
from workers.tasks import run_pipeline_background

settings = get_settings()
router = APIRouter(prefix="/evidence", tags=["Evidence"])


@router.post("/upload", response_model=Evidence, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: UUID = Form(...),
    evidence_type: EvidenceType = Form(...),
    source: str = Form("upload"),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
) -> Evidence:
    """
    Upload forensic evidence and immediately queue async analysis.
    Returns the Evidence record with PENDING status.
    """
    # Validate file size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file.size and file.size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds max size of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    # Check investigation exists
    inv = await state_service.get(case_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # Create evidence record stub (we need the ID for the file path)
    from uuid import uuid4
    evidence_id = uuid4()

    # Persist file to object store
    storage_path, sha256, md5, size_bytes = await object_store.store(
        file, case_id, evidence_id
    )

    # Create full evidence record
    create_data = EvidenceCreate(
        case_id=case_id,
        type=evidence_type,
        filename=file.filename or "evidence",
        source=source,
    )
    evidence = await evidence_store.create(
        create_data=create_data,
        filename=file.filename or "evidence",
        sha256=sha256,
        md5=md5,
        size_bytes=size_bytes,
        storage_path=storage_path,
        evidence_id=evidence_id,
    )

    # Link evidence to investigation
    await state_service.add_evidence_ref(case_id, evidence.id)

    # Queue async analysis via BackgroundTasks
    if background_tasks:
        background_tasks.add_task(
            run_pipeline_background,
            case_id=str(case_id),
            evidence_id=str(evidence.id),
            evidence_path=storage_path,
            evidence_type=evidence_type.value,
        )

    return evidence


@router.get("/case/{case_id}", response_model=List[Evidence])
async def list_evidence(case_id: UUID) -> List[Evidence]:
    """List all evidence for a case."""
    return await evidence_store.list_for_case(case_id)


@router.get("/{evidence_id}", response_model=Evidence)
async def get_evidence(evidence_id: UUID) -> Evidence:
    """Get a specific evidence record."""
    ev = await evidence_store.get(evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return ev


@router.post("/{evidence_id}/verify")
async def verify_evidence(evidence_id: UUID) -> dict:
    """Re-verify the SHA-256 hash of stored evidence."""
    ev = await evidence_store.get(evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    intact = await integrity_service.verify_evidence(evidence_id)
    return {"evidence_id": str(evidence_id), "intact": intact}


@router.get("/{evidence_id}/custody")
async def get_custody_chain(evidence_id: UUID) -> dict:
    """Get the full chain of custody for an evidence item."""
    ev = await evidence_store.get(evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return {
        "evidence_id": str(evidence_id),
        "sha256": ev.sha256,
        "custody_chain": [c.model_dump() for c in ev.custody_chain],
    }
