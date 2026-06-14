"""
MongoDB async client — Motor driver abstraction for Protocol SIFT.

Collections:
    investigations, evidence, entities, findings,
    timelines, reports, audit_logs, agent_traces, relationships
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import motor.motor_asyncio
from pymongo import ASCENDING, IndexModel

from core.config import get_settings

settings = get_settings()

# ── Client singleton ──────────────────────────────────────────────────────────

_client: motor.motor_asyncio.AsyncIOMotorClient | None = None


def get_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    """Return (or lazily create) the Motor client singleton."""
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    return _client


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """Return the protocol_sift database handle."""
    return get_client()[settings.MONGODB_DB]


def close_client() -> None:
    """Close the Motor client on application shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


# ── Collection Accessors ──────────────────────────────────────────────────────

def col_investigations() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["investigations"]

def col_evidence() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["evidence"]

def col_entities() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["entities"]

def col_findings() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["findings"]

def col_timelines() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["timelines"]

def col_reports() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["reports"]

def col_audit_logs() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["audit_logs"]

def col_agent_traces() -> motor.motor_asyncio.AsyncIOMotorCollection:
    return get_db()["agent_traces"]

def col_relationships() -> motor.motor_asyncio.AsyncIOMotorCollection:
    """Temporary knowledge graph — replaces Neo4j until it is available."""
    return get_db()["relationships"]


# ── Index Setup ───────────────────────────────────────────────────────────────

async def initialize_indexes() -> None:
    """
    Create required indexes on all collections.
    Safe to call on every startup (uses createIndexes which is idempotent).
    """
    db = get_db()

    await db["investigations"].create_indexes([
        IndexModel([("investigation_id", ASCENDING)], unique=True),
        IndexModel([("severity", ASCENDING)]),
        IndexModel([("timestamp", ASCENDING)]),
    ])

    await db["evidence"].create_indexes([
        IndexModel([("evidence_id", ASCENDING)], unique=True),
        IndexModel([("investigation_id", ASCENDING)]),
        IndexModel([("timestamp", ASCENDING)]),
    ])

    await db["entities"].create_indexes([
        IndexModel([("entity_id", ASCENDING)], unique=True),
        IndexModel([("investigation_id", ASCENDING)]),
    ])

    await db["findings"].create_indexes([
        IndexModel([("finding_id", ASCENDING)], unique=True),
        IndexModel([("investigation_id", ASCENDING)]),
        IndexModel([("severity", ASCENDING)]),
        IndexModel([("timestamp", ASCENDING)]),
    ])

    await db["timelines"].create_indexes([
        IndexModel([("investigation_id", ASCENDING)]),
        IndexModel([("timestamp", ASCENDING)]),
    ])

    await db["reports"].create_indexes([
        IndexModel([("investigation_id", ASCENDING)]),
    ])

    await db["audit_logs"].create_indexes([
        IndexModel([("timestamp", ASCENDING)]),
    ])

    await db["agent_traces"].create_indexes([
        IndexModel([("investigation_id", ASCENDING)]),
        IndexModel([("timestamp", ASCENDING)]),
    ])

    await db["relationships"].create_indexes([
        IndexModel([("investigation_id", ASCENDING)]),
        IndexModel([("source", ASCENDING)]),
        IndexModel([("target", ASCENDING)]),
    ])


# ── Health Check ──────────────────────────────────────────────────────────────

async def verify_connectivity() -> bool:
    """Ping MongoDB. Returns True if reachable, False otherwise."""
    try:
        await get_client().admin.command("ping")
        return True
    except Exception:
        return False
