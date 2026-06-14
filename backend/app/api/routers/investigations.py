"""Investigations API router."""
from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from services.state_service import state_service
from models.sift_types import Investigation, InvestigationCreate, InvestigationStatus

router = APIRouter(prefix="/investigations", tags=["Investigations"])


@router.post("/", response_model=Investigation, status_code=status.HTTP_201_CREATED)
async def create_investigation(body: InvestigationCreate) -> Investigation:
    """Create a new investigation case."""
    return await state_service.create_investigation(body)


@router.get("/", response_model=List[Investigation])
async def list_investigations() -> List[Investigation]:
    """List all investigations (most recent first)."""
    return await state_service.list_all()


@router.get("/{case_id}", response_model=Investigation)
async def get_investigation(case_id: UUID) -> Investigation:
    """Get a specific investigation by ID."""
    inv = await state_service.get(case_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv


@router.patch("/{case_id}/status", response_model=Investigation)
async def update_status(case_id: UUID, new_status: InvestigationStatus) -> Investigation:
    """Manually transition investigation status."""
    try:
        return await state_service.transition(case_id, new_status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


from fastapi import Response
@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
async def delete_investigation(case_id: UUID) -> None:
    """Delete an investigation and purge its graph data."""
    from services.graph_service import graph_service
    inv = await state_service.get(case_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    await graph_service.purge_case(str(case_id))
