"""Neo4j driver abstraction — async-compatible via thread pool."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, List

from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ServiceUnavailable

from core.config import get_settings

settings = get_settings()

_driver: Driver | None = None


def get_driver() -> Driver:
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            max_connection_pool_size=50,
        )
    return _driver


def close_driver() -> None:
    global _driver
    if _driver:
        _driver.close()
        _driver = None


async def run_query(
    cypher: str,
    parameters: Dict[str, Any] | None = None,
) -> List[Dict[str, Any]]:
    """
    Run a Cypher query in a thread executor to avoid blocking the event loop.
    Returns a list of result record dicts.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, _sync_run_query, cypher, parameters or {}
    )


def _sync_run_query(cypher: str, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
    driver = get_driver()
    with driver.session() as session:
        result = session.run(cypher, parameters)
        return [record.data() for record in result]


async def verify_connectivity() -> bool:
    """Health-check: returns True if Neo4j is reachable."""
    try:
        driver = get_driver()
        await asyncio.get_event_loop().run_in_executor(
            None, driver.verify_connectivity
        )
        return True
    except ServiceUnavailable:
        return False


async def initialize_schema() -> None:
    """Create indexes / constraints for the SIFT graph schema."""
    constraints = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Finding) REQUIRE n.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Evidence) REQUIRE n.id IS UNIQUE",
        "CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.type)",
        "CREATE INDEX IF NOT EXISTS FOR (n:Finding) ON (n.severity)",
        "CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.case_id)",
    ]
    for stmt in constraints:
        await run_query(stmt)
