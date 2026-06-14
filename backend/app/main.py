"""
Protocol SIFT — FastAPI Application Entry Point
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import get_settings
from database.mongodb import (
    close_client,
    initialize_indexes,
    verify_connectivity as mongodb_health,
)
from websocket.manager import ws_manager

settings = get_settings()


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle hooks."""
    print(f"Protocol SIFT {settings.APP_VERSION} starting...")

    # Ensure evidence storage directory exists
    import os
    os.makedirs(settings.EVIDENCE_STORAGE_PATH, exist_ok=True)

    # Initialize MongoDB indexes (non-fatal if unavailable)
    try:
        await initialize_indexes()
        print("[OK] MongoDB indexes initialized")
    except Exception as e:
        print(f"[WARN] MongoDB unavailable at startup: {e}")

    print("[OK] Protocol SIFT ready.")
    yield

    # Shutdown
    close_client()
    print("Protocol SIFT shut down.")


# ── App Factory ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Protocol SIFT",
    description=(
        "Autonomous cybersecurity incident response agent. "
        "Upload forensic evidence → get explained findings."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request timing middleware ──────────────────────────────────────────────────

@app.middleware("http")
async def add_timing_header(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    response.headers["X-Process-Time-Ms"] = f"{duration * 1000:.1f}"
    return response


# ── Register Routers ───────────────────────────────────────────────────────────

from api.routers.investigations import router as investigations_router
from api.routers.evidence import router as evidence_router
from api.routers.findings import router as findings_router
from api.routers.graph import router as graph_router
from api.routers.reports import router as reports_router
from api.routers.pipeline import router as pipeline_router

API_PREFIX = "/api/v1"

app.include_router(investigations_router, prefix=API_PREFIX)
app.include_router(evidence_router, prefix=API_PREFIX)
app.include_router(findings_router, prefix=API_PREFIX)
app.include_router(graph_router, prefix=API_PREFIX)
app.include_router(reports_router, prefix=API_PREFIX)
app.include_router(pipeline_router, prefix=API_PREFIX)


# ── WebSocket Endpoint ─────────────────────────────────────────────────────────

@app.websocket("/ws/{case_id}")
async def websocket_endpoint(websocket: WebSocket, case_id: str):
    """
    Real-time WebSocket channel for a specific investigation case.
    Frontend connects to receive live agent progress, findings, and graph updates.
    """
    await ws_manager.connect(case_id, websocket)
    try:
        while True:
            # Keep connection alive; client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(case_id, websocket)


# ── Health & System Endpoints ──────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health() -> Dict[str, Any]:
    """Overall system health check."""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "websocket_connections": ws_manager.total_connections(),
    }

@app.get("/health/mongodb", tags=["System"])
async def health_mongodb() -> Dict[str, Any]:
    """MongoDB connectivity health check."""
    ok = await mongodb_health()
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail={"status": "unavailable", "service": "mongodb"},
        )
    return {"status": "ok", "service": "mongodb", "uri": settings.MONGODB_URI}


@app.get("/health/storage", tags=["System"])
async def health_storage() -> Dict[str, Any]:
    """File storage directory health check."""
    import os
    path = settings.EVIDENCE_STORAGE_PATH
    exists = os.path.isdir(path)
    writable = os.access(path, os.W_OK) if exists else False
    if not exists or not writable:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail={"status": "unavailable", "service": "storage", "path": path},
        )
    return {"status": "ok", "service": "storage", "path": path}


@app.get("/health/api", tags=["System"])
async def health_api() -> Dict[str, Any]:
    """API self-test — verifies routing is functional."""
    return {
        "status": "ok",
        "service": "api",
        "version": settings.APP_VERSION,
        "routes": len(app.routes),
    }


@app.get("/api/v1/tools/status", tags=["Tools"])
async def tool_status() -> Dict[str, Any]:
    """List all registered forensic tool adapters and their availability."""
    from adapters.registry import registry
    available = await registry.available()
    return {
        "registered": registry.status(),
        "available_count": len(available),
        "available": [a.name.value for a in available],
    }


@app.get("/api/v1/mitre/techniques", tags=["MITRE"])
async def list_mitre_techniques() -> Dict[str, Any]:
    """List all MITRE ATT&CK techniques in the local mapping table."""
    from services.mitre_mapper import mitre_mapper
    return {"techniques": mitre_mapper.list_all_techniques()}


@app.post("/api/v1/mitre/map", tags=["MITRE"])
async def map_to_mitre(body: Dict[str, str]) -> Dict[str, Any]:
    """Map arbitrary text to MITRE ATT&CK techniques."""
    from services.mitre_mapper import mitre_mapper
    text = body.get("text", "")
    mappings = await mitre_mapper.map_cached(text)
    return {"mappings": [m.model_dump() for m in mappings]}


@app.get("/", tags=["System"])
async def root() -> Dict[str, str]:
    return {
        "name": "Protocol SIFT",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
