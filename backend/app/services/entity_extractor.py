"""Entity Extraction Service — Extracts and stores entities and relationships in MongoDB."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Set
from models.normalized_log import NormalizedLog
from services.graph_service import graph_service

logger = logging.getLogger(__name__)

class EntityExtractor:
    """Extracts security entities and relationships from normalized logs and builds the graph."""

    async def extract_and_store(
        self,
        case_id: str,
        logs: List[NormalizedLog],
    ) -> Dict[str, Any]:
        """
        Extracts entities and relationships from logs, stores them in MongoDB,
        and returns statistics of the extraction.
        """
        extracted_entities: Set[str] = set()  # To avoid redundant writes in memory
        extracted_relationships: Set[str] = set()

        entity_counts = {
            "Host": 0,
            "User": 0,
            "IP": 0,
            "Process": 0,
            "File": 0,
            "Domain": 0,
        }
        relationship_count = 0

        for log in logs:
            entities_in_log: Dict[str, Dict[str, Any]] = {}

            # Helper to add entity
            async def add_entity(entity_type: str, name: str):
                if not name or name in ("-", "unknown", "null", "None"):
                    return None
                
                # Normalize name representation
                name = name.strip()
                entity_key = f"{entity_type}:{name}"
                entity_id = f"{case_id}:{entity_type}:{name}"
                
                if entity_key not in extracted_entities:
                    await graph_service.create_entity(
                        case_id=case_id,
                        entity_id=entity_id,
                        entity_type=entity_type,
                        name=name,
                        properties={"last_seen": log.timestamp.isoformat()}
                    )
                    extracted_entities.add(entity_key)
                    if entity_type in entity_counts:
                        entity_counts[entity_type] += 1
                
                # Keep track of what we found in this log for relationship mapping
                entities_in_log[entity_type] = {
                    "id": entity_id,
                    "type": entity_type,
                    "name": name
                }
                return entity_id

            # 1. Extract core fields
            if log.host:
                await add_entity("Host", log.host)
            if log.user:
                await add_entity("User", log.user)
            if log.ip:
                await add_entity("IP", log.ip)
            if log.process:
                await add_entity("Process", log.process)

            # 2. Extract from raw_data event fields
            event_data = log.raw_data.get("event_data", {}) if isinstance(log.raw_data, dict) else {}
            
            # File extraction (Sysmon FileCreate, ImageLoad, etc.)
            target_filename = event_data.get("TargetFilename") or event_data.get("TargetFileName") or event_data.get("ImageLoaded")
            if target_filename:
                await add_entity("File", target_filename)

            # Domain/DNS query extraction
            query_name = event_data.get("QueryName") or event_data.get("domain") or event_data.get("dns_query")
            if query_name:
                await add_entity("Domain", query_name)

            # 3. Create relationships for entities co-occurring in the log
            # User -> Host
            if "User" in entities_in_log and "Host" in entities_in_log:
                u = entities_in_log["User"]
                h = entities_in_log["Host"]
                rel_key = f"{u['id']}->ACTIVE_ON->{h['id']}"
                if rel_key not in extracted_relationships:
                    await graph_service.create_relationship(
                        from_id=u["id"], from_label="User",
                        to_id=h["id"], to_label="Host",
                        relationship="ACTIVE_ON",
                        properties={"timestamp": log.timestamp.isoformat()},
                        investigation_id=case_id
                    )
                    extracted_relationships.add(rel_key)
                    relationship_count += 1

            # Process -> Host
            if "Process" in entities_in_log and "Host" in entities_in_log:
                p = entities_in_log["Process"]
                h = entities_in_log["Host"]
                rel_key = f"{p['id']}->EXECUTED_ON->{h['id']}"
                if rel_key not in extracted_relationships:
                    await graph_service.create_relationship(
                        from_id=p["id"], from_label="Process",
                        to_id=h["id"], to_label="Host",
                        relationship="EXECUTED_ON",
                        properties={"timestamp": log.timestamp.isoformat()},
                        investigation_id=case_id
                    )
                    extracted_relationships.add(rel_key)
                    relationship_count += 1

            # Process -> User
            if "Process" in entities_in_log and "User" in entities_in_log:
                p = entities_in_log["Process"]
                u = entities_in_log["User"]
                rel_key = f"{p['id']}->RAN_AS->{u['id']}"
                if rel_key not in extracted_relationships:
                    await graph_service.create_relationship(
                        from_id=p["id"], from_label="Process",
                        to_id=u["id"], to_label="User",
                        relationship="RAN_AS",
                        properties={"timestamp": log.timestamp.isoformat()},
                        investigation_id=case_id
                    )
                    extracted_relationships.add(rel_key)
                    relationship_count += 1

            # Host -> IP
            if "Host" in entities_in_log and "IP" in entities_in_log:
                h = entities_in_log["Host"]
                ip_ent = entities_in_log["IP"]
                rel_key = f"{h['id']}->COMMUNICATED_WITH->{ip_ent['id']}"
                if rel_key not in extracted_relationships:
                    await graph_service.create_relationship(
                        from_id=h["id"], from_label="Host",
                        to_id=ip_ent["id"], to_label="IP",
                        relationship="COMMUNICATED_WITH",
                        properties={"timestamp": log.timestamp.isoformat()},
                        investigation_id=case_id
                    )
                    extracted_relationships.add(rel_key)
                    relationship_count += 1

            # Process -> File
            if "Process" in entities_in_log and "File" in entities_in_log:
                p = entities_in_log["Process"]
                f = entities_in_log["File"]
                rel_key = f"{p['id']}->ACCESSED_FILE->{f['id']}"
                if rel_key not in extracted_relationships:
                    await graph_service.create_relationship(
                        from_id=p["id"], from_label="Process",
                        to_id=f["id"], to_label="File",
                        relationship="ACCESSED_FILE",
                        properties={"timestamp": log.timestamp.isoformat()},
                        investigation_id=case_id
                    )
                    extracted_relationships.add(rel_key)
                    relationship_count += 1

            # Host -> Domain
            if "Host" in entities_in_log and "Domain" in entities_in_log:
                h = entities_in_log["Host"]
                d = entities_in_log["Domain"]
                rel_key = f"{h['id']}->RESOLVED->{d['id']}"
                if rel_key not in extracted_relationships:
                    await graph_service.create_relationship(
                        from_id=h["id"], from_label="Host",
                        to_id=d["id"], to_label="Domain",
                        relationship="RESOLVED",
                        properties={"timestamp": log.timestamp.isoformat()},
                        investigation_id=case_id
                    )
                    extracted_relationships.add(rel_key)
                    relationship_count += 1

        logger.info(f"Extraction complete for case {case_id}: {entity_counts} entities, {relationship_count} relationships")
        return {
            "entity_counts": entity_counts,
            "relationship_count": relationship_count,
        }

entity_extractor = EntityExtractor()
