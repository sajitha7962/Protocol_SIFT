"""Database package — exports MongoDB client and collection helpers."""
from database.mongodb import (
    get_client,
    get_db,
    close_client,
    verify_connectivity as mongodb_health,
    initialize_indexes,
    col_investigations,
    col_evidence,
    col_entities,
    col_findings,
    col_timelines,
    col_reports,
    col_audit_logs,
    col_agent_traces,
    col_relationships,
)

__all__ = [
    "get_client",
    "get_db",
    "close_client",
    "mongodb_health",
    "initialize_indexes",
    "col_investigations",
    "col_evidence",
    "col_entities",
    "col_findings",
    "col_timelines",
    "col_reports",
    "col_audit_logs",
    "col_agent_traces",
    "col_relationships",
]
