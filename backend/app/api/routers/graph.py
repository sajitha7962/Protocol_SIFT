"""Knowledge Graph API router."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException

from services.graph_service import graph_service

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])


@router.get("/case/{case_id}")
async def get_graph(case_id: UUID) -> dict:
    """
    Return the full knowledge graph for a case in React Flow format.
    {nodes: [...], edges: [...]}
    """
    return await graph_service.get_full_graph(str(case_id))


@router.get("/case/{case_id}/attack-path")
async def get_attack_path(case_id: UUID, max_hops: int = 5) -> dict:
    """Return the longest discovered attack path in the graph."""
    paths = await graph_service.find_attack_path(str(case_id), max_hops)
    return {"case_id": str(case_id), "paths": paths}


@router.get("/case/{case_id}/clusters")
async def get_threat_clusters(case_id: UUID) -> dict:
    """Return MITRE tactic-grouped threat clusters."""
    clusters = await graph_service.cluster_threats(str(case_id))
    return {"case_id": str(case_id), "clusters": clusters}


@router.get("/entity/{entity_id}/neighbors")
async def get_entity_neighbors(entity_id: str, depth: int = 2) -> dict:
    """Get entities connected to the given entity within N hops."""
    neighbors = await graph_service.get_connected_entities(entity_id, depth)
    return {"entity_id": entity_id, "neighbors": neighbors}


from fastapi import Response
@router.delete("/case/{case_id}", status_code=204, response_class=Response, response_model=None)
async def purge_graph(case_id: UUID) -> None:
    """Remove all graph nodes and edges for a case."""
    await graph_service.purge_case(str(case_id))
