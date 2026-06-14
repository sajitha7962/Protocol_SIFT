"""
Evidence Store — MongoDB-backed CRUD for evidence metadata.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from database.mongodb import col_evidence
from models.sift_types import (
    Evidence,
    EvidenceCreate,
    EvidenceStatus,
    CustodyEvent,
)


class EvidenceStore:
    """CRUD for Evidence records backed by MongoDB."""

    async def create(
        self,
        create_data: EvidenceCreate,
        filename: str,
        sha256: str,
        md5: str,
        size_bytes: int,
        storage_path: str,
        uploaded_by: str = "system",
        evidence_id: Optional[UUID] = None,
    ) -> Evidence:
        if evidence_id is None:
            evidence_id = uuid4()
        initial_custody = CustodyEvent(
            action="uploaded",
            actor=uploaded_by,
            hash_snapshot=sha256,
            notes="Initial upload",
        )
        evidence = Evidence(
            id=evidence_id,
            case_id=create_data.case_id,
            type=create_data.type,
            filename=filename,
            original_name=create_data.filename,
            sha256=sha256,
            md5=md5,
            size_bytes=size_bytes,
            source=create_data.source,
            status=EvidenceStatus.PENDING,
            uploaded_by=uploaded_by,
            custody_chain=[initial_custody],
            metadata=create_data.metadata,
            storage_path=storage_path,
        )
        
        doc = evidence.model_dump(mode="json")
        doc["evidence_id"] = str(evidence_id)
        doc["investigation_id"] = str(create_data.case_id)
        
        await col_evidence().update_one(
            {"evidence_id": str(evidence_id)},
            {"$set": doc},
            upsert=True
        )
        return evidence

    async def get(self, evidence_id: UUID) -> Optional[Evidence]:
        doc = await col_evidence().find_one({"evidence_id": str(evidence_id)}, {"_id": 0})
        if doc is None:
            return None
        return Evidence(**doc)

    async def list_for_case(self, case_id: UUID) -> List[Evidence]:
        cursor = col_evidence().find({"investigation_id": str(case_id)}, {"_id": 0})
        evidence_list: List[Evidence] = []
        async for doc in cursor:
            evidence_list.append(Evidence(**doc))
        return evidence_list

    async def update_status(
        self, evidence_id: UUID, status: EvidenceStatus
    ) -> Optional[Evidence]:
        ev = await self.get(evidence_id)
        if ev is None:
            return None
        ev.status = status
        if status == EvidenceStatus.VERIFIED:
            ev.verified_at = datetime.now(timezone.utc)
            
        doc = ev.model_dump(mode="json")
        doc["evidence_id"] = str(evidence_id)
        doc["investigation_id"] = str(ev.case_id)
        
        await col_evidence().update_one(
            {"evidence_id": str(evidence_id)},
            {"$set": doc}
        )
        return ev

    async def append_custody(
        self, evidence_id: UUID, event: CustodyEvent
    ) -> Optional[Evidence]:
        ev = await self.get(evidence_id)
        if ev is None:
            return None
        ev.custody_chain.append(event)
        
        doc = ev.model_dump(mode="json")
        doc["evidence_id"] = str(evidence_id)
        doc["investigation_id"] = str(ev.case_id)
        
        await col_evidence().update_one(
            {"evidence_id": str(evidence_id)},
            {"$set": doc}
        )
        return ev

    async def delete(self, evidence_id: UUID) -> bool:
        res = await col_evidence().delete_one({"evidence_id": str(evidence_id)})
        return res.deleted_count > 0


evidence_store = EvidenceStore()

