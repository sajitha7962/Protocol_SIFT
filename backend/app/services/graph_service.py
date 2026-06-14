"""
Knowledge Graph Service — MongoDB Relationship Collection.

Replaces the Neo4j-backed graph service for the MVP.
Relationships are stored as documents:

    {
        "source": "host01",
        "target": "192.168.1.10",
        "relationship": "CONNECTED_TO",
        "investigation_id": "INV-001",
        "source_label": "Host",
        "target_label": "IP",
        "properties": {}
    }

The public API surface (get_full_graph, create_entity, create_relationship,
find_attack_path, cluster_threats, purge_case) is kept identical so the
graph API router and tests require no changes.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from database.mongodb import col_relationships, col_entities


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class GraphService:
    """Creates and queries the Protocol SIFT temporary knowledge graph (MongoDB)."""

    # ── Node / Entity Management ─────────────────────────────────────────────

    async def create_entity(
        self,
        case_id: str,
        entity_id: str,
        entity_type: str,
        name: str,
        properties: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """Upsert an entity node into the entities collection."""
        doc = {
            "entity_id": entity_id,
            "investigation_id": case_id,
            "type": entity_type,
            "name": name,
            "properties": properties or {},
            "updated_at": _now(),
        }
        await col_entities().update_one(
            {"entity_id": entity_id},
            {"$set": doc, "$setOnInsert": {"created_at": _now()}},
            upsert=True,
        )
        return doc

    async def create_finding_node(
        self,
        case_id: str,
        finding_id: str,
        title: str,
        severity: str,
        mitre_id: str = "",
    ) -> Dict[str, Any]:
        """Upsert a finding entity node."""
        return await self.create_entity(
            case_id=case_id,
            entity_id=finding_id,
            entity_type="Finding",
            name=title,
            properties={"severity": severity, "mitre_id": mitre_id},
        )

    async def create_evidence_node(
        self,
        case_id: str,
        evidence_id: str,
        evidence_type: str,
        filename: str,
    ) -> Dict[str, Any]:
        """Upsert an evidence entity node."""
        return await self.create_entity(
            case_id=case_id,
            entity_id=evidence_id,
            entity_type="Evidence",
            name=filename,
            properties={"evidence_type": evidence_type},
        )

    # ── Relationship Management ───────────────────────────────────────────────

    async def create_relationship(
        self,
        from_id: str,
        from_label: str,
        to_id: str,
        to_label: str,
        relationship: str,
        properties: Dict[str, Any] | None = None,
        investigation_id: str = "",
    ) -> None:
        """
        Insert or update a relationship document.

        Example document:
        {
            "source": "host01",
            "target": "192.168.1.10",
            "relationship": "CONNECTED_TO",
            "investigation_id": "INV-001",
            "source_label": "Host",
            "target_label": "IP",
            "properties": {}
        }
        """
        doc = {
            "source": from_id,
            "source_label": from_label,
            "target": to_id,
            "target_label": to_label,
            "relationship": relationship,
            "investigation_id": investigation_id,
            "properties": properties or {},
            "updated_at": _now(),
        }
        await col_relationships().update_one(
            {
                "source": from_id,
                "target": to_id,
                "relationship": relationship,
                "investigation_id": investigation_id,
            },
            {"$set": doc, "$setOnInsert": {"created_at": _now()}},
            upsert=True,
        )

    # ── Case Graph Export ─────────────────────────────────────────────────────

    async def get_full_graph(self, case_id: str) -> Dict[str, Any]:
        """
        Return all entity nodes and relationship edges for a case
        in React Flow-compatible format:
            { nodes: [...], edges: [...] }
        """
        # Entities (nodes)
        entity_cursor = col_entities().find(
            {"investigation_id": case_id},
            {"_id": 0},
        )
        nodes = []
        async for doc in entity_cursor:
            nodes.append({
                "id": doc["entity_id"],
                "label": doc.get("type", "Entity"),
                "name": doc.get("name", ""),
                "type": doc.get("type", ""),
                "properties": doc.get("properties", {}),
            })

        # Relationships (edges)
        rel_cursor = col_relationships().find(
            {"investigation_id": case_id},
            {"_id": 0},
        )
        edges = []
        async for doc in rel_cursor:
            edges.append({
                "source": doc["source"],
                "target": doc["target"],
                "relationship": doc["relationship"],
                "properties": doc.get("properties", {}),
            })

        return {"nodes": nodes, "edges": edges}

    # ── Path Discovery ────────────────────────────────────────────────────────

    async def find_attack_path(
        self, case_id: str, max_hops: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Simple BFS-style attack path discovery over the MongoDB relationship
        collection. Returns a list of paths (each path is a list of node IDs).
        """
        # Build adjacency map
        rel_cursor = col_relationships().find(
            {"investigation_id": case_id},
            {"_id": 0, "source": 1, "target": 1, "relationship": 1},
        )
        adjacency: Dict[str, List[str]] = {}
        async for doc in rel_cursor:
            adjacency.setdefault(doc["source"], []).append(doc["target"])

        paths: List[Dict[str, Any]] = []

        def dfs(node: str, path: List[str], depth: int) -> None:
            if depth > max_hops:
                return
            neighbors = adjacency.get(node, [])
            if not neighbors:
                if len(path) > 1:
                    paths.append({"path_nodes": list(path), "hops": len(path) - 1})
                return
            for neighbor in neighbors:
                if neighbor not in path:  # avoid cycles
                    dfs(neighbor, path + [neighbor], depth + 1)

        for start_node in adjacency:
            dfs(start_node, [start_node], 1)

        # Return longest paths first
        paths.sort(key=lambda p: p["hops"], reverse=True)
        return paths[:20]

    async def get_connected_entities(
        self, entity_id: str, depth: int = 2
    ) -> List[Dict[str, Any]]:
        """Return entities reachable from entity_id within N hops."""
        visited: set[str] = {entity_id}
        frontier: List[str] = [entity_id]
        results: List[Dict[str, Any]] = []

        for _ in range(depth):
            if not frontier:
                break
            next_frontier: List[str] = []
            rel_cursor = col_relationships().find(
                {"source": {"$in": frontier}},
                {"_id": 0},
            )
            async for doc in rel_cursor:
                target = doc["target"]
                if target not in visited:
                    visited.add(target)
                    next_frontier.append(target)
                    results.append({
                        "id": target,
                        "rel": doc["relationship"],
                        "source_label": doc.get("source_label", ""),
                        "target_label": doc.get("target_label", ""),
                    })
            frontier = next_frontier

        return results

    # ── Threat Clustering ─────────────────────────────────────────────────────

    async def cluster_threats(self, case_id: str) -> List[Dict[str, Any]]:
        """Group finding entities by MITRE tactic/id."""
        pipeline = [
            {"$match": {"investigation_id": case_id, "type": "Finding"}},
            {"$group": {
                "_id": "$properties.mitre_id",
                "finding_ids": {"$push": "$entity_id"},
                "count": {"$sum": 1},
                "severity": {"$first": "$properties.severity"},
            }},
            {"$sort": {"count": -1}},
        ]
        cursor = col_entities().aggregate(pipeline)
        clusters = []
        async for doc in cursor:
            clusters.append({
                "mitre_id": doc["_id"],
                "finding_ids": doc["finding_ids"],
                "count": doc["count"],
                "severity": doc.get("severity"),
            })
        return clusters

    # ── Purge ─────────────────────────────────────────────────────────────────

    async def purge_case(self, case_id: str) -> None:
        """Remove all graph data (entities + relationships) for a case."""
        await col_entities().delete_many({"investigation_id": case_id})
        await col_relationships().delete_many({"investigation_id": case_id})


graph_service = GraphService()
